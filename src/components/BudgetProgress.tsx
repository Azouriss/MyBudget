import { StyleSheet, Text, View } from 'react-native';
import { budgetProgress } from '../lib/budgets';
import { theme } from '../theme';

export function BudgetProgress({ spent, limit, showPercent = true }: { spent: number; limit: number; showPercent?: boolean }) {
  const progress = budgetProgress(spent, limit);
  const color = progress.exceeded ? theme.colors.danger : progress.nearLimit ? theme.colors.warning : theme.colors.primary;
  const label = progress.percent === null ? (progress.exceeded ? 'Dépassé' : '0 € max.') : `${progress.percent} %`;
  return <View style={styles.row} accessibilityRole="progressbar"
    accessibilityLabel="Budget utilisé" accessibilityValue={{ min: 0, max: 100, now: Math.min(progress.percent ?? (progress.exceeded ? 100 : 0), 100),
      text: progress.percent === null ? `Aucun montant autorisé${progress.exceeded ? ', budget dépassé' : ', aucune dépense'}` : `${progress.percent} % du budget utilisé` }}>
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
