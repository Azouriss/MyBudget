import { t } from '../i18n/locale';
import { useLanguage } from '../i18n/useLanguage';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import type { Category } from '../db/schema';
import { formatMoney } from '../lib/money';
import { theme } from '../theme';
import { categoryVisual } from './CategoryIcon';
import { decorativeIconProps } from './decorativeIconProps';

/** Overview donut, complemented by named amounts so color is never the only key. */
export function ExpenseChart({ breakdown, categories, total }: {
  breakdown: { categoryId: string; amountCents: number }[]; categories: Category[]; total: number;
}) {
  useLanguage();
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 540 || fontScale >= theme.layout.stackedFontScale;
  const size = 188, stroke = 22, radius = (size - stroke) / 2, circumference = 2 * Math.PI * radius;
  let offset = 0;
  return <View style={styles.group}>
    <View style={[styles.row, stacked && styles.stacked]}>
      <View style={styles.ring}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} {...decorativeIconProps}>
          <Circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={theme.colors.chartTrack} strokeWidth={stroke} />
          <G transform={`rotate(-90 ${size / 2} ${size / 2})`}>{breakdown.map((part) => {
            const length = total > 0 ? part.amountCents / total * circumference : 0;
            const segment = <Circle key={part.categoryId} cx={size / 2} cy={size / 2} r={radius} fill="none"
              stroke={categoryVisual(categories.find(c => c.id === part.categoryId)).chart} strokeWidth={stroke}
              strokeDasharray={`${length} ${circumference}`} strokeDashoffset={-offset} />;
            offset += length; return segment;
          })}</G>
        </Svg>
        {/* No monetary text constrained inside a fixed circle. */}
        <View style={styles.center}><Text style={styles.centerLabel}>{t('Dépenses')}</Text></View>
      </View>
      <View style={styles.legend}>
        <Text style={styles.total}>{formatMoney(total)}</Text>
        {breakdown.length ? breakdown.map((part) => {
          const category = categories.find(c => c.id === part.categoryId);
          const percent = part.amountCents / total * 100;
          return <View key={part.categoryId} style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: categoryVisual(category).chart }]} />
            <Text style={styles.label}>{t(category?.label ?? 'Catégorie')}</Text>
            <View style={styles.values}>
              <Text style={styles.money}>{formatMoney(part.amountCents)}</Text>
              <Text style={styles.caption}>{percent > 0 && percent < 1 ? '< 1' : Math.round(percent)} %</Text>
            </View>
          </View>;
        }) : <Text style={styles.label}>{t('Aucune dépense enregistrée dans cette période.')}</Text>}
      </View>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  group: { gap: theme.spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xl },
  stacked: { flexDirection: 'column', alignItems: 'stretch' },
  ring: { width: 188, height: 188, alignSelf: 'center' },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl },
  centerLabel: { ...theme.typography.bodySmall, color: theme.colors.textSubtle },
  total: { ...theme.typography.headingL, ...theme.typography.amount, color: theme.colors.textPrimary, marginBottom: theme.spacing.sm },
  legend: { flex: 1, minWidth: 0, gap: theme.spacing.sm },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.sm },
  dot: { width: 8, height: 8, borderRadius: theme.radius.full },
  label: { ...theme.typography.bodySmall, color: theme.colors.textSubtle, flex: 1, minWidth: 60 },
  values: { alignItems: 'flex-end', maxWidth: '100%' },
  money: { ...theme.typography.bodySmall, ...theme.typography.amount, color: theme.colors.textPrimary },
  caption: { ...theme.typography.caption, color: theme.colors.textSubtle },
});
