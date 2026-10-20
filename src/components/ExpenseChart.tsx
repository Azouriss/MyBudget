import { t } from '../i18n/locale';
import { useLanguage } from '../i18n/useLanguage';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import type { Category } from '../db/schema';
import { formatMoney } from '../lib/money';
import { theme } from '../theme';
import { categoryVisual } from './CategoryIcon';
import { decorativeIconProps } from './decorativeIconProps';

export function ExpenseChart({ breakdown, categories, total }: {
  breakdown: { categoryId: string; amountCents: number }[]; categories: Category[]; total: number;
}) {
  useLanguage();
  const { width, fontScale } = useWindowDimensions();
  const stacked = Math.min(width, theme.layout.contentMaxWidth) < 360 || fontScale >= theme.layout.stackedFontScale;
  const size = 164;
  const stroke = 24;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return <View style={[styles.row, stacked && styles.stacked]}>
    <View style={styles.chart} accessible accessibilityLabel={t("Total des dépenses : {0}", [formatMoney(total)])}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} {...decorativeIconProps}>
        <Circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={theme.colors.chartTrack} strokeWidth={stroke} />
        <G transform={`rotate(-90 ${size / 2} ${size / 2})`}>{breakdown.map((item) => {
          const category = categories.find((entry) => entry.id === item.categoryId);
          const length = total > 0 ? item.amountCents / total * circumference : 0;
          const segment = <Circle key={item.categoryId} cx={size / 2} cy={size / 2} r={radius} fill="none"
            stroke={categoryVisual(category).chart} strokeWidth={stroke}
            strokeDasharray={`${length} ${circumference}`} strokeDashoffset={-offset} />;
          offset += length;
          return segment;
        })}</G>
      </Svg>
      <View pointerEvents="none" style={styles.center}>
        <Text style={styles.total}>{formatMoney(total)}</Text><Text style={styles.caption}>{t("ce mois-ci")}</Text>
      </View>
    </View>
    <View style={styles.legend}>
      {breakdown.length ? breakdown.map((item) => {
        const category = categories.find((entry) => entry.id === item.categoryId);
        const percent = item.amountCents / total * 100;
        return <View key={item.categoryId} style={styles.legendRow}>
          <View style={[styles.swatch, { backgroundColor: categoryVisual(category).chart }]} />
          <Text style={styles.label}>{t(category?.label ?? "Catégorie")}</Text>
          <Text style={styles.percent}>{percent > 0 && percent < 1 ? '< 1' : Math.round(percent)} %</Text>
        </View>;
      }) : <Text style={styles.empty}>{t("Votre répartition apparaîtra ici, dès votre première dépense.")}</Text>}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg },
  stacked: { flexDirection: 'column', alignItems: 'stretch' },
  chart: { width: 164, height: 164, alignSelf: 'center' },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  total: { ...theme.typography.body, fontFamily: theme.fontFamily.semibold, ...theme.typography.amount, color: theme.colors.textPrimary },
  caption: { ...theme.typography.caption, color: theme.colors.textSubtle },
  legend: { flex: 1, gap: theme.spacing.sm, minWidth: 0 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  label: { ...theme.typography.bodySmall, color: theme.colors.textSubtle, flex: 1 },
  percent: { ...theme.typography.bodySmall, ...theme.typography.amount, color: theme.colors.textSubtle },
  empty: { ...theme.typography.bodySmall, color: theme.colors.textSubtle },
});
