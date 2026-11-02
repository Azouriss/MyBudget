import { t } from '../i18n/locale';
import { useLanguage } from '../i18n/useLanguage';
import { useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import type { Category } from '../db/schema';
import { formatMoney } from '../lib/money';
import { theme } from '../theme';
import { categoryVisual } from './CategoryIcon';
import { decorativeIconProps } from './decorativeIconProps';
import { expenseFlow } from '../lib/expenseFlow';

/** A single-source Sankey: recorded gross spending flows into its categories. */
export function ExpenseChart({ breakdown, categories, total }: {
  breakdown: { categoryId: string; amountCents: number }[]; categories: Category[]; total: number;
}) {
  useLanguage();
  const { fontScale } = useWindowDimensions();
  const [width, setWidth] = useState(280);
  const [heights, setHeights] = useState<Record<string, number>>({});
  const graphWidth = Math.max(72, width * 0.34);
  const flow = expenseFlow(breakdown, total, graphWidth, heights, fontScale);
  if (!flow.rows.length) return <Text style={styles.empty}>{t('Aucune dépense enregistrée dans cette période.')}</Text>;
  return <View style={styles.container} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
    <View style={styles.source}>
      <Text style={styles.caption}>{t('Total dépensé')}</Text>
      <Text style={styles.total}>{formatMoney(total)}</Text>
    </View>
    <View style={styles.flow}>
      <View pointerEvents="none" style={[styles.diagram, { width: graphWidth, height: flow.height }]}>
        <Svg width={graphWidth} height={flow.height} viewBox={`0 0 ${graphWidth} ${flow.height}`} {...decorativeIconProps}>
          <Rect x={0} y={flow.sourceY} width={6} height={flow.bandHeight} rx={3} fill={theme.colors.primary} />
          {flow.rows.map((row) => {
            const category = categories.find((item) => item.id === row.categoryId);
            const color = categoryVisual(category).chart;
            return <Path key={row.categoryId} d={row.path} fill={color} opacity={0.72} />;
          })}
          {flow.rows.map((row) => <Rect key={row.categoryId} x={graphWidth - 6} y={row.targetY} width={6}
            height={row.thickness} fill={categoryVisual(categories.find((item) => item.id === row.categoryId)).chart} />)}
        </Svg>
      </View>
      <View style={{ marginLeft: graphWidth + theme.spacing.md, flex: 1 }}>
        {flow.rows.map((row) => {
          const category = categories.find((item) => item.id === row.categoryId);
          const percent = row.amountCents / total * 100;
          return <View key={row.categoryId} style={[styles.category, { minHeight: row.minHeight }]}
            onLayout={(event) => {
              const height = event.nativeEvent.layout.height;
              setHeights((previous) => Math.abs((previous[row.categoryId] ?? 0) - height) < 0.5 ? previous : { ...previous, [row.categoryId]: height });
            }}>
            <Text style={styles.label}>{t(category?.label ?? 'Catégorie')}</Text>
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
  source: { gap: theme.spacing.xs },
  total: { ...theme.typography.headingM, ...theme.typography.amount, color: theme.colors.textPrimary },
  caption: { ...theme.typography.caption, color: theme.colors.textSubtle },
  flow: { flexDirection: 'row', position: 'relative' },
  diagram: { position: 'absolute', left: 0, top: 0 },
  category: { justifyContent: 'center', gap: theme.spacing.xs, paddingVertical: theme.spacing.sm },
  label: { ...theme.typography.bodySmall, color: theme.colors.textSubtle },
  money: { ...theme.typography.bodySmall, ...theme.typography.amount, color: theme.colors.textPrimary },
  empty: { ...theme.typography.bodySmall, color: theme.colors.textSubtle },
});
