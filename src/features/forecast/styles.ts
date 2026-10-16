import { StyleSheet } from 'react-native';
import { theme } from '../../theme';

export const forecastStyles = StyleSheet.create({
  page: { paddingHorizontal: theme.layout.gutter, paddingBottom: theme.spacing['2xl'], gap: theme.spacing.lg },
  card: { padding: theme.spacing.lg, gap: theme.spacing.md },
  hero: { backgroundColor: theme.colors.primaryLight },
  title: { ...theme.typography.headingM, color: theme.colors.textPrimary },
  copy: { ...theme.typography.body, color: theme.colors.textPrimary },
  note: { ...theme.typography.bodySmall, color: theme.colors.textSubtle },
  amount: { ...theme.typography.financial, ...theme.typography.amount, color: theme.colors.textPrimary },
  error: { ...theme.typography.bodySmall, color: theme.colors.dangerText },
  negative: { color: theme.colors.dangerText },
  group: { gap: theme.spacing.md },
  line: { gap: theme.spacing.xs, borderBottomWidth: theme.size.borderWidth, borderBottomColor: theme.colors.border,
    paddingVertical: theme.spacing.sm },
  header: { flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center', paddingVertical: theme.spacing.lg },
});
