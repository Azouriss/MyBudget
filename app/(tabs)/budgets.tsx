import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { ChevronRight, Plus, SlidersHorizontal } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { AppHeader } from '../../src/components/AppHeader';
import { BudgetProgress } from '../../src/components/BudgetProgress';
import { Button } from '../../src/components/Button';
import { CategoryIcon } from '../../src/components/CategoryIcon';
import { decorativeIconProps } from '../../src/components/decorativeIconProps';
import { EmptyState } from '../../src/components/EmptyState';
import { IconButton } from '../../src/components/IconButton';
import { MonthPicker } from '../../src/components/MonthPicker';
import { QueryState } from '../../src/components/QueryState';
import { ScreenContainer } from '../../src/components/ScreenContainer';
import { SectionHeader } from '../../src/components/SectionHeader';
import { SurfaceCard } from '../../src/components/SurfaceCard';
import { useMonthlyBudgets } from '../../src/features/budgets/hooks';
import { useMonthlyTransactions } from '../../src/features/transactions/hooks';
import { budgetProgress } from '../../src/lib/budgets';
import { expenseByCategory, monthlySummary } from '../../src/lib/finance';
import { formatMoney } from '../../src/lib/money';
import { useAppStore } from '../../src/stores/useAppStore';
import { theme } from '../../src/theme';

export default function BudgetsScreen() {
  const month = useAppStore((state) => state.month);
  const budgets = useMonthlyBudgets();
  const data = useMonthlyTransactions();
  const [focusedCategory, setFocusedCategory] = useState<string | null>(null);
  const { width, fontScale } = useWindowDimensions();
  const stacked = Math.min(width, theme.layout.contentMaxWidth) - 2 * theme.layout.gutter <= theme.layout.compactTransactionWidth
    || fontScale >= theme.layout.stackedFontScale;
  const summary = useMemo(() => monthlySummary(data.transactions, month), [data.transactions, month]);
  const hasPlanned = data.transactions.some((item) => item.isPlanned);
  const spending = useMemo(() => new Map(expenseByCategory(data.transactions).map((item) => [item.categoryId, item.amountCents])), [data.transactions]);
  const limits = useMemo(() => new Map(budgets.categories.map((item) => [item.categoryId, item.amountCents])), [budgets.categories]);
  const progress = budgets.monthly ? budgetProgress(summary.expenseCents, budgets.monthly.amountCents) : undefined;
  function edit(categoryId?: string) {
    router.push({ pathname: '/budget', params: { month, ...(categoryId ? { categoryId } : {}) } });
  }
  return <ScreenContainer><ScrollView contentContainerStyle={styles.page}>
    <AppHeader />
    <MonthPicker />
    {budgets.loading || data.loading || budgets.error || data.error ? <>
      {budgets.error || data.error ? <EmptyState title="Budget indisponible" description="Les budgets ou les dépenses n’ont pas pu être lus. Vos données sont conservées."
        actionLabel="Réessayer" onAdd={() => useAppStore.getState().invalidate()} /> : <QueryState error={false} />}
    </> : <View style={styles.sections}>
      <SurfaceCard style={styles.summaryCard}>
        <View style={styles.cardHeading}><Text accessibilityRole="header" style={styles.heading}>Budget du mois</Text>
          <IconButton icon={SlidersHorizontal} label="Modifier le budget global" onPress={() => edit()} /></View>
        {budgets.monthly && progress ? <>
          <View style={[styles.balance, progress.exceeded && styles.balanceExceeded]}>
            <Text style={[styles.balanceLabel, progress.exceeded && styles.balanceDanger]}>
              {progress.exceeded ? 'Dépassement' : hasPlanned ? 'Reste après prévisions' : 'Reste à dépenser'}
            </Text>
            <Text style={[styles.balanceAmount, stacked && styles.balanceAmountCompact, progress.exceeded && styles.balanceDanger]}>
              {formatMoney(Math.abs(progress.remainingCents))}
            </Text>
          </View>
          <View style={styles.details}>
            <View style={[styles.overview, stacked && styles.overviewStacked]}>
              <View style={styles.stat}>
                <Text style={styles.meta}>{hasPlanned ? 'Dépenses prévues' : 'Dépensé'}</Text>
                <Text style={styles.amount}>{formatMoney(summary.expenseCents)}</Text>
              </View>
              <View style={[styles.stat, !stacked && styles.statEnd]}>
                <Text style={[styles.meta, !stacked && styles.alignEnd]}>{budgets.monthlySource === 'salary' ? 'Salaire net' : 'Budget fixé'}</Text>
                <Text style={[styles.amount, !stacked && styles.alignEnd]}>{formatMoney(budgets.monthly.amountCents)}</Text>
              </View>
            </View>
            <BudgetProgress spent={summary.expenseCents} limit={budgets.monthly.amountCents} />
          </View>
        </> : <View style={styles.intro}>
          <View style={styles.stat}>
            <Text style={styles.meta}>{hasPlanned ? 'Dépenses prévues' : 'Dépensé'}</Text>
            <Text style={[styles.total, stacked && styles.balanceAmountCompact]}>{formatMoney(summary.expenseCents)}</Text>
          </View>
          <Button title="Définir mon budget" icon={Plus} onPress={() => edit()} />
        </View>}
      </SurfaceCard>
      <View>
        <SectionHeader title="Budget par catégorie" />
        <SurfaceCard style={styles.list}>
          {data.categories.filter((category) => category.kind === 'expense').map((category, index, all) => {
            const spent = spending.get(category.id) ?? 0;
            const limit = limits.get(category.id);
            const exceeded = limit !== undefined && spent > limit;
            return <Pressable cssInterop={false} key={category.id} accessibilityRole="button"
              accessibilityLabel={`${category.label}, ${formatMoney(spent)} ${hasPlanned ? 'prévus' : 'dépensés'}, ${limit === undefined ? 'limite à définir' : `budget ${formatMoney(limit)}`}. Modifier la limite.`}
              onPress={() => edit(category.id)} onFocus={() => setFocusedCategory(category.id)} onBlur={() => setFocusedCategory(null)}
              style={({ pressed }) => [styles.category, index === all.length - 1 && styles.last,
                { backgroundColor: pressed ? theme.colors.primaryLight : theme.colors.transparent,
                  borderColor: focusedCategory === category.id ? theme.colors.focusRing : theme.colors.transparent }]}>
              <View style={styles.categoryHeading}>
                <CategoryIcon category={category} />
                <Text style={styles.categoryName}>{category.label}</Text>
                <View style={styles.chevron}>
                  <ChevronRight size={theme.size.icon.small} color={theme.colors.textSubtle} {...decorativeIconProps} />
                </View>
              </View>
              <View style={styles.categoryAmounts}>
                <Text style={[styles.categoryAmount, exceeded && styles.exceeded]}>{formatMoney(spent)}</Text>
                <Text style={styles.categoryLimit}>{limit === undefined ? 'À définir' : `sur ${formatMoney(limit)}`}</Text>
              </View>
              {limit !== undefined ? <BudgetProgress spent={spent} limit={limit} /> : <View style={styles.emptyTrack} />}
              {exceeded ? <Text style={styles.exceeded}>Dépassé de {formatMoney(spent - limit!)}</Text> : null}
            </Pressable>;
          })}
        </SurfaceCard>
      </View>
    </View>}
  </ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: theme.layout.gutter, paddingBottom: theme.spacing.xl },
  sections: { gap: theme.spacing.xl },
  summaryCard: { gap: theme.spacing.lg },
  cardHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm, marginTop: -theme.spacing.sm },
  heading: { ...theme.typography.body, fontFamily: theme.fontFamily.semibold, color: theme.colors.textPrimary, flex: 1 },
  balance: { backgroundColor: theme.colors.primaryLight, borderRadius: theme.radius.medium, padding: theme.spacing.lg, gap: theme.spacing.xs },
  balanceExceeded: { backgroundColor: theme.colors.dangerBackground },
  balanceLabel: { ...theme.typography.bodySmall, fontFamily: theme.fontFamily.medium, color: theme.colors.textAction },
  balanceAmount: { ...theme.typography.headingXL, ...theme.typography.amount, color: theme.colors.textAction },
  balanceAmountCompact: { ...theme.typography.headingL },
  balanceDanger: { color: theme.colors.dangerText },
  details: { gap: theme.spacing.md },
  overview: { flexDirection: 'row', gap: theme.spacing.lg },
  overviewStacked: { flexDirection: 'column', gap: theme.spacing.md },
  stat: { flex: 1, minWidth: 0, gap: theme.spacing.xs },
  statEnd: { alignItems: 'flex-end' },
  alignEnd: { textAlign: 'right' },
  amount: { ...theme.typography.body, fontFamily: theme.fontFamily.semibold, ...theme.typography.amount, color: theme.colors.textPrimary, maxWidth: '100%' },
  meta: { ...theme.typography.bodySmall, color: theme.colors.textSubtle },
  intro: { gap: theme.spacing.md },
  total: { ...theme.typography.headingXL, ...theme.typography.amount, color: theme.colors.textPrimary },
  list: { padding: theme.spacing.xs },
  category: { gap: theme.spacing.sm, padding: theme.spacing.md,
    minHeight: 80, borderWidth: theme.size.focusWidth, borderBottomWidth: theme.size.borderWidth,
    borderBottomColor: theme.colors.border, borderRadius: theme.radius.small },
  last: { borderBottomWidth: 0 },
  categoryHeading: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  categoryName: { ...theme.typography.bodySmall, fontFamily: theme.fontFamily.semibold, color: theme.colors.textPrimary,
    flex: 1, minWidth: 0 },
  chevron: { width: theme.size.icon.small, height: theme.size.icon.small, flexShrink: 0 },
  categoryAmounts: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: theme.spacing.sm },
  categoryAmount: { ...theme.typography.bodySmall, ...theme.typography.amount, fontFamily: theme.fontFamily.medium,
    color: theme.colors.textPrimary, maxWidth: '100%', flexShrink: 1 },
  categoryLimit: { ...theme.typography.bodySmall, ...theme.typography.amount, color: theme.colors.textSubtle,
    maxWidth: '100%', flexShrink: 1 },
  emptyTrack: { height: theme.size.progressHeight, backgroundColor: theme.colors.chartTrack, borderRadius: theme.radius.full, marginVertical: 5 },
  exceeded: { ...theme.typography.caption, color: theme.colors.dangerText },
});
