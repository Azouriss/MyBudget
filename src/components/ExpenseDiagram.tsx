import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import type { Category } from '../db/schema';
import type { ExpenseCategoryBreakdown } from '../lib/expenseHierarchy';
import { expenseRibbon, expenseTreeFlow } from '../lib/expenseTreeFlow';
import { getExpenseSubcategory } from '../features/categories/subcategories';
import { formatMoney } from '../lib/money';
import { t } from '../i18n/locale';
import { useLanguage } from '../i18n/useLanguage';
import { theme } from '../theme';
import { CategoryIcon, categoryVisual } from './CategoryIcon';
import { IconButton } from './IconButton';
import { decorativeIconProps } from './decorativeIconProps';

export function ExpenseDiagram({ groups, categories, period, onClose }: {
  groups: ExpenseCategoryBreakdown[]; categories: Category[]; period: string; onClose: () => void;
}) {
  useLanguage();
  return <Modal visible animationType="none" onRequestClose={onClose}>
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={styles.title}>{t('Dans le détail')}</Text>
          <Text style={styles.period}>{period}</Text>
        </View>
        <IconButton icon={X} label={t('Fermer le diagramme')} onPress={onClose} />
      </View>
      <ExpenseDiagramCanvas groups={groups} categories={categories} />
    </SafeAreaView>
  </Modal>;
}

function ExpenseDiagramCanvas({ groups, categories }: { groups: ExpenseCategoryBreakdown[]; categories: Category[] }) {
  const { width, fontScale } = useWindowDimensions();
  const [measured, setMeasured] = useState<Record<string, number>>({});
  const flow = expenseTreeFlow(groups, measured, fontScale);
  const scale = Math.max(1, fontScale);
  const rootWidth = 160 * scale, categoryWidth = 172 * scale, childWidth = 196 * scale;
  const canvasWidth = Math.max(width - theme.spacing.lg * 2, 780 * scale);
  const gap = (canvasWidth - rootWidth - categoryWidth - childWidth) / 2;
  const categoryX = rootWidth + gap, childX = categoryX + categoryWidth + gap;
  function measure(key: string, height: number) {
    setMeasured(previous => Math.abs((previous[key] ?? 0) - height) < 0.5 ? previous : { ...previous, [key]: height });
  }
  function label(key: string, name: string, amount: number, left: number, top: number,
    nodeWidth: number, height: number, category?: Category, root = false) {
    return <View key={key} style={[styles.node, { left, top, width: nodeWidth, height }]}>
      <View style={styles.source} onLayout={event => measure(key, event.nativeEvent.layout.height)}>
        {category ? <CategoryIcon category={category} /> : null}
        <View style={styles.copy}>
          <Text style={[styles.label, (root || category) && styles.sourceLabel]}>{name}</Text>
          <Text style={styles.money}>{formatMoney(amount)}</Text>
        </View>
      </View>
    </View>;
  }
  if (!flow.groups.length) return <Text style={styles.empty}>{t('Aucune dépense enregistrée dans cette période.')}</Text>;
  return <View style={styles.viewer}>
    {canvasWidth > width - theme.spacing.lg * 2 ? <Text style={styles.hint}>{t('Faites glisser pour parcourir le diagramme.')}</Text> : null}
    <ScrollView style={styles.viewer} contentContainerStyle={styles.scrollContent} nestedScrollEnabled>
      <ScrollView horizontal nestedScrollEnabled contentContainerStyle={styles.canvasPadding}>
        <View style={{ width: canvasWidth, height: flow.height }} testID="expense-diagram">
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Svg width={canvasWidth} height={flow.height} {...decorativeIconProps}>
              <Rect x={rootWidth - 6} y={flow.sourceY} width={6} height={flow.bandHeight} rx={3} fill={theme.colors.primary} />
              {flow.groups.map(group => {
                const color = categoryVisual(categories.find(category => category.id === group.categoryId)).chart;
                return <Path key={group.key} fill={color} opacity={0.65}
                  d={expenseRibbon(rootWidth, categoryX, group.sourceY, group.targetY, group.thickness)} />;
              })}
              {flow.groups.flatMap(group => group.children.map(child => <Path key={child.key}
                fill={categoryVisual(categories.find(category => category.id === group.categoryId)).chart} opacity={0.65}
                d={expenseRibbon(categoryX + categoryWidth, childX, child.sourceY, child.targetY, child.thickness)} />))}
              {flow.groups.flatMap(group => {
                const color = categoryVisual(categories.find(category => category.id === group.categoryId)).chart;
                return [
                  <Rect key={`${group.key}:in`} x={categoryX} y={group.targetY} width={6} height={group.thickness} fill={color} />,
                  <Rect key={`${group.key}:out`} x={categoryX + categoryWidth - 6} y={group.targetY} width={6} height={group.thickness} fill={color} />,
                  ...group.children.map(child => <Rect key={child.key} x={childX} y={child.targetY} width={6} height={child.thickness} fill={color} />),
                ];
              })}
            </Svg>
          </View>
          {label('total', t('Dépenses'), flow.total, 0, 0, rootWidth, flow.rootHeight, undefined, true)}
          {flow.groups.map(group => {
            const category = categories.find(item => item.id === group.categoryId);
            return <View key={group.key} style={StyleSheet.absoluteFill} pointerEvents="box-none">
              {label(group.key, t(category?.label ?? 'Catégorie'), group.amountCents,
                categoryX, group.top, categoryWidth, group.height, category)}
              {group.children.map(child => label(child.key, t(getExpenseSubcategory(child.subcategoryId)?.label ?? 'Non précisé'),
                child.amountCents, childX, child.top, childWidth, child.height))}
            </View>;
          })}
        </View>
      </ScrollView>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, padding: theme.spacing.lg,
    borderBottomWidth: theme.size.borderWidth, borderBottomColor: theme.colors.border },
  heading: { flex: 1, minWidth: 0, gap: theme.spacing.xs },
  title: { ...theme.typography.headingM, color: theme.colors.textPrimary },
  period: { ...theme.typography.bodySmall, color: theme.colors.textSubtle },
  viewer: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  canvasPadding: { padding: theme.spacing.lg },
  node: { position: 'absolute', justifyContent: 'center', padding: theme.spacing.md },
  source: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  copy: { flex: 1, minWidth: 0 },
  label: { ...theme.typography.bodySmall, color: theme.colors.textSubtle, marginBottom: theme.spacing.xs },
  sourceLabel: { ...theme.typography.body, fontFamily: theme.fontFamily.semibold, color: theme.colors.textPrimary },
  money: { ...theme.typography.body, ...theme.typography.amount, color: theme.colors.textPrimary },
  hint: { ...theme.typography.caption, color: theme.colors.textSubtle, paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.sm },
  empty: { ...theme.typography.bodySmall, color: theme.colors.textSubtle, padding: theme.spacing.lg },
});
