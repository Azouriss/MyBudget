import { t } from '../../src/i18n/locale';
import { useLanguage } from '../../src/i18n/useLanguage';
import { SalaryReminder } from '../../src/features/payday/SalaryReminder';
import { useMemo } from 'react';
import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { BotanicalSprig } from '../../src/components/BrandMark';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { AppHeader } from '../../src/components/AppHeader';
import { BudgetProgress } from '../../src/components/BudgetProgress';
import { Button } from '../../src/components/Button';
import { ExpenseSankey } from '../../src/components/ExpenseSankey';
import { expenseHierarchy } from '../../src/lib/expenseHierarchy';
import { ExpenseChart } from '../../src/components/ExpenseChart';
import { MonthPicker } from '../../src/components/MonthPicker';
import { QueryState } from '../../src/components/QueryState';
import { ScreenContainer } from '../../src/components/ScreenContainer';
import { SectionHeader } from '../../src/components/SectionHeader';
import { SurfaceCard } from '../../src/components/SurfaceCard';
import { useMonthlyBudgets } from '../../src/features/budgets/hooks';
import { TransactionRow } from '../../src/features/transactions/TransactionRow';
import { useMonthlyTransactions, useBudgetPeriod } from '../../src/features/transactions/hooks';
import { dashboardSummary } from '../../src/lib/finance';
import { budgetProgress } from '../../src/lib/budgets';
import { localDateKey } from '../../src/lib/dates';
import { formatMoney } from '../../src/lib/money';
import { useAppStore } from '../../src/stores/useAppStore';
import { theme } from '../../src/theme';

export default function DashboardScreen() {
  useLanguage();
  const month = useAppStore((state) => state.month);
  const data = useMonthlyTransactions();
  const budgets = useMonthlyBudgets();
  const period = useBudgetPeriod(month);
  const today = localDateKey();
  const { width, fontScale } = useWindowDimensions();
  const summary = useMemo(() => dashboardSummary(data.transactions, month, today, period), [data.transactions, month, today, period]);
  const hierarchy = useMemo(() => expenseHierarchy(data.transactions, period), [data.transactions, period]);
  const categories = useMemo(() => new Map(data.categories.map((category) => [category.id, category])), [data.categories]);
  const progress = budgets.monthly ? budgetProgress(summary.total.expenseCents, budgets.monthly.amountCents) : null;
  const budgetReady = !budgets.loading && !budgets.error;
  return <ScreenContainer><ScrollView contentContainerStyle={styles.page}>
    <AppHeader settings />
    <SalaryReminder />
    <MonthPicker />
    {data.loading || data.error ? <QueryState error={data.error} /> : <View style={styles.sections}>
      <Animated.View entering={FadeInDown.duration(theme.motion.standard).reduceMotion(ReduceMotion.System)}>
        <SurfaceCard style={[styles.summaryCard, progress?.exceeded && styles.heroNegative]}>
          {width >= 360 && fontScale < theme.layout.stackedFontScale ? <View pointerEvents="none" style={styles.leaves}>
            <BotanicalSprig size={88} />
          </View> : null}
          <Text style={styles.label}>{progress?.exceeded ? t('Budget dépassé') : t('Reste au budget')}</Text>
          {budgetReady && progress ? <>
            <Text style={[styles.amount, width < 360 && styles.compactAmount, progress.exceeded && styles.negative]}>{formatMoney(Math.abs(progress.remainingCents))}</Text>
            {summary.plannedExpenseCents > 0 ? <Text style={styles.note}>{t('Prévisions incluses')}</Text> : null}
            <BudgetProgress spent={summary.total.expenseCents} limit={budgets.monthly!.amountCents} showPercent={false} />
          </> : <Text style={styles.empty}>{budgets.error ? t('Budget indisponible') : budgets.loading ? t('Chargement du budget…') : t('Aucun budget défini')}</Text>}
          {budgetReady && budgets.monthly ? <Text style={styles.note}>{budgets.monthlySource === 'salary' ? t('Budget basé sur le salaire : {0}', [formatMoney(budgets.monthly.amountCents)]) : t('Budget : {0}', [formatMoney(budgets.monthly.amountCents)])}</Text> : null}
          {budgetReady && progress ? <Text style={styles.note}>{t('Pas un solde bancaire')}</Text> : null}
          {budgetReady && !budgets.monthly ? <Button title={t('Définir un budget')} variant="secondary" onPress={() => router.push('/budgets')} /> : null}
        </SurfaceCard>
      </Animated.View>
      <Button title={t('Ajouter une dépense')} icon={Plus} onPress={() => router.push('/transaction')} />
      <View>
        <SectionHeader title={t('Répartition des dépenses')} />
        <Text style={styles.sectionNote}>{t('Dépenses enregistrées, avant remboursements.')}</Text>
        <SurfaceCard style={styles.details}>
          <ExpenseChart breakdown={summary.breakdown} categories={data.categories} total={summary.actual.grossExpenseCents} />
        </SurfaceCard>
      </View>
      {summary.recent.length ? <View>
        <SectionHeader title={t('Dernières transactions')} action={t('Tout voir')} onAction={() => router.push('/history')} />
        <SurfaceCard style={styles.transactions}>
          {summary.recent.slice(0, 3).map((transaction, index, recent) => <TransactionRow key={transaction.id}
            transaction={transaction} category={categories.get(transaction.categoryId)} last={index === recent.length - 1} />)}
        </SurfaceCard>
      </View> : <Text style={styles.note}>{t('Aucune transaction enregistrée à ce jour dans cette période.')}</Text>}
      {hierarchy.length > 0 ? <View>
        <SectionHeader title={t('Dans le détail')} />
        <Text style={styles.sectionNote}>{t('Catégories → sous-catégories')}</Text>
        <SurfaceCard style={styles.details}>
          {hierarchy.map((group, index) => <View key={group.categoryId} style={index > 0 ? styles.flowSeparator : undefined}>
            <ExpenseSankey group={group} category={categories.get(group.categoryId)} />
          </View>)}
        </SurfaceCard>
      </View> : null}
    </View>}
  </ScrollView></ScreenContainer>;
}
const styles = StyleSheet.create({
  page: { paddingHorizontal: theme.layout.gutter, paddingBottom: theme.spacing.xl },
  sections: { gap: theme.spacing.lg },
  summaryCard: { backgroundColor: theme.colors.primaryLight, padding: theme.spacing.xl, gap: theme.spacing.sm },
  leaves: { position: 'absolute', right: theme.spacing.sm, top: -theme.spacing.sm, opacity: 0.45, transform: [{ rotate: '18deg' }] },
  details: { gap: theme.spacing.md },
  heroNegative: { backgroundColor: theme.colors.dangerBackground },
  label: { ...theme.typography.bodySmall, fontFamily: theme.fontFamily.medium, color: theme.colors.textPrimary },
  amount: { ...theme.typography.financial, ...theme.typography.amount, color: theme.colors.textAction, flexShrink: 1 },
  compactAmount: { ...theme.typography.headingL, ...theme.typography.amount },
  negative: { color: theme.colors.dangerText },
  empty: { ...theme.typography.headingM, color: theme.colors.textSubtle },
  note: { ...theme.typography.bodySmall, color: theme.colors.textSubtle },
  sectionNote: { ...theme.typography.bodySmall, color: theme.colors.textSubtle, marginBottom: theme.spacing.md },
  flowSeparator: { borderTopWidth: theme.size.borderWidth, borderTopColor: theme.colors.border, paddingTop: theme.spacing.xl },
  transactions: { padding: theme.spacing.xs },
});
