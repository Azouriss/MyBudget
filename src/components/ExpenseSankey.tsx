import { t } from '../i18n/locale';
import { useLanguage } from '../i18n/useLanguage';
import { useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import type { Category } from '../db/schema';
import type { ExpenseCategoryBreakdown } from '../lib/expenseHierarchy';
import { getExpenseSubcategory } from '../features/categories/subcategories';
import { CategoryIcon } from './CategoryIcon';
import { formatMoney } from '../lib/money';
import { theme } from '../theme';
import { categoryVisual } from './CategoryIcon';
import { decorativeIconProps } from './decorativeIconProps';
import { expenseFlow } from '../lib/expenseFlow';

/** A category source flows to its stored subcategories without inventing missing detail. */
export function ExpenseSankey({ group, category }: { group: ExpenseCategoryBreakdown; category?: Category }) {
  const breakdown = group.children.map((child) => ({ categoryId: child.subcategoryId ?? 'unspecified', amountCents: child.amountCents }));
  const total = group.amountCents;
  useLanguage();
  const { fontScale } = useWindowDimensions();
  const [width, setWidth] = useState(280);
  const [heights, setHeights] = useState<Record<string, number>>({});
  const graphWidth = Math.max(72, width * 0.34);
  const flow = expenseFlow(breakdown, total, graphWidth, heights, fontScale);
  if (!flow.rows.length) return <Text style={styles.empty}>{t('Aucune dépense enregistrée dans cette période.')}</Text>;
  return <View style={styles.container} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
    <View style={styles.source}>
      <CategoryIcon category={category} />
      <View style={styles.sourceCopy}>
        <Text accessibilityRole="header" style={styles.sourceLabel}>{t(category?.label ?? 'Catégorie')}</Text>
        <Text style={styles.total}>{formatMoney(total)}</Text>
      </View>
    </View>
    <View style={styles.flow}>
      <View pointerEvents="none" style={[styles.diagram, { width: graphWidth, height: flow.height }]}>
        <Svg width={graphWidth} height={flow.height} viewBox={`0 0 ${graphWidth} ${flow.height}`} {...decorativeIconProps}>
          <Rect x={0} y={flow.sourceY} width={6} height={flow.bandHeight} rx={3} fill={categoryVisual(category).chart} />
          {flow.rows.map((row) => {
            const color = categoryVisual(category).chart;
            return <Path key={row.categoryId} d={row.path} fill={color} opacity={0.72} />;
          })}
          {flow.rows.map((row) => <Rect key={row.categoryId} x={graphWidth - 6} y={row.targetY} width={6}
            height={row.thickness} fill={categoryVisual(category).chart} />)}
        </Svg>
      </View>
      <View style={{ marginLeft: graphWidth + theme.spacing.md, flex: 1 }}>
        {flow.rows.map((row) => {
          const subcategory = getExpenseSubcategory(row.categoryId);
          const percent = row.amountCents / total * 100;
          return <View key={row.categoryId} style={[styles.category, { minHeight: row.minHeight }]}
            onLayout={(event) => {
              const height = event.nativeEvent.layout.height;
              setHeights((previous) => Math.abs((previous[row.categoryId] ?? 0) - height) < 0.5 ? previous : { ...previous, [row.categoryId]: height });
            }}>
            <Text style={styles.label}>{t(subcategory?.label ?? 'Non précisé')}</Text>
            <Text style={styles.money}>{formatMoney(row.amountCents)}</Text>
            <Text style={styles.caption}>{percent > 0 && percent < 1 ? '< 1' : Math.round(percent)} %</Text>
          </View>;
        })}
      </View>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  container: { gap: theme.spacing.md },
  source: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  sourceCopy: { flex: 1, gap: theme.spacing.xs },
  sourceLabel: { ...theme.typography.body, fontFamily: theme.fontFamily.semibold, color: theme.colors.textPrimary },
  total: { ...theme.typography.body, ...theme.typography.amount, color: theme.colors.textPrimary },
  caption: { ...theme.typography.caption, color: theme.colors.textSubtle },
  flow: { flexDirection: 'row', position: 'relative' },
  diagram: { position: 'absolute', left: 0, top: 0 },
  category: { justifyContent: 'center', gap: theme.spacing.xs, paddingVertical: theme.spacing.sm },
  label: { ...theme.typography.bodySmall, color: theme.colors.textSubtle },
  money: { ...theme.typography.bodySmall, ...theme.typography.amount, color: theme.colors.textPrimary },
  empty: { ...theme.typography.bodySmall, color: theme.colors.textSubtle },
});
