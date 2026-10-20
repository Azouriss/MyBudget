import { t } from '../i18n/locale';
import { useLanguage } from '../i18n/useLanguage';
import { StyleSheet, Text, View } from 'react-native';
import { budgetProgress } from '../lib/budgets';
import { theme } from '../theme';

export function BudgetProgress({ spent, limit, showPercent = true }: { spent: number; limit: number; showPercent?: boolean }) {
  useLanguage();
  const progress = budgetProgress(spent, limit);
  const color = progress.exceeded ? theme.colors.danger : progress.nearLimit ? theme.colors.warning : theme.colors.primary;
  const label = progress.percent === null ? (progress.exceeded ? t("Dépassé") : t("0 € max.")) : `${progress.percent} %`;
  return <View style={styles.row} accessibilityRole="progressbar"
    accessibilityLabel={t("Budget utilisé")} accessibilityValue={{ min: 0, max: 100, now: Math.min(progress.percent ?? (progress.exceeded ? 100 : 0), 100),
      text: progress.percent === null ? t("Aucun montant autorisé{0}", [progress.exceeded ? t(", budget dépassé") : t(", aucune dépense")]) : t("{0} % du budget utilisé", [progress.percent]) }}>
    <View style={styles.track}><View style={[styles.fill, { backgroundColor: color, width: `${Math.min(progress.ratio, 1) * 100}%` }]} /></View>
    {showPercent ? <Text style={[styles.percent, progress.exceeded && { color: theme.colors.dangerText }]}>{label}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center' },
  track: { flex: 1, height: theme.size.progressHeight, backgroundColor: theme.colors.chartTrack, borderRadius: theme.radius.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: theme.radius.full },
  percent: { ...theme.typography.caption, color: theme.colors.textSubtle, minWidth: 40, textAlign: 'right' },
});
