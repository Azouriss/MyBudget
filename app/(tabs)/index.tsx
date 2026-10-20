import { SalaryReminder } from '../../src/features/payday/SalaryReminder';
import { useMemo } from 'react';
import { router } from 'expo-router';
import { ChevronRight, Plus } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../../src/components/AppHeader';
import { BotanicalSprig } from '../../src/components/BrandMark';
import { BudgetProgress } from '../../src/components/BudgetProgress';
import { Button } from '../../src/components/Button';
import { decorativeIconProps } from '../../src/components/decorativeIconProps';
import { ExpenseChart } from '../../src/components/ExpenseChart';
import { MonthPicker } from '../../src/components/MonthPicker';
import { QueryState } from '../../src/components/QueryState';
import { ScreenContainer } from '../../src/components/ScreenContainer';
import { SectionHeader } from '../../src/components/SectionHeader';
import { SurfaceCard } from '../../src/components/SurfaceCard';
import { useMonthlyBudgets } from '../../src/features/budgets/hooks';
import { TransactionRow } from '../../src/features/transactions/TransactionRow';
import { useMonthlyTransactions } from '../../src/features/transactions/hooks';
import { expenseByCategory, monthlySummary } from '../../src/lib/finance';
import { formatMoney } from '../../src/lib/money';
import { useAppStore } from '../../src/stores/useAppStore';
import { theme } from '../../src/theme';

export default function DashboardScreen() {
  const month = useAppStore((state) => state.month);
  const data = useMonthlyTransactions();
  const budgets = useMonthlyBudgets();
  const summary = useMemo(() => monthlySummary(data.transactions, month), [data.transactions, month]);
  const breakdown = useMemo(() => expenseByCategory(data.transactions), [data.transactions]);
  const categories = useMemo(() => new Map(data.categories.map((category) => [category.id, category])), [data.categories]);
  const hasPlanned = data.transactions.some((item) => item.isPlanned);
  return <ScreenContainer><ScrollView contentContainerStyle={styles.page}>
    <AppHeader profile />
    <SalaryReminder />
    <MonthPicker />
    {data.loading || data.error ? <QueryState error={data.error} /> : <View style={styles.sections}>
      <SurfaceCard style={styles.summaryCard}>
        <View pointerEvents="none" style={styles.cornerLeaf}><BotanicalSprig size={64} /></View>
        <Text style={styles.meta}>{hasPlanned ? 'Dépenses prévues ce mois-ci' : 'Dépenses ce mois-ci'}</Text>
        {hasPlanned ? <Text style={styles.caption}>Échéances prévues incluses.</Text> : null}
        <View style={styles.expenseLine}>
          <Text accessibilityLabel={`Dépenses du mois : ${formatMoney(summary.expenseCents)}`} style={styles.expenses}>{formatMoney(summary.expenseCents)}</Text>
          {!budgets.loading && !budgets.error ? <View style={styles.limitCopy}><Text style={styles.caption}>Sur un budget de</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Voir le budget mensuel" onPress={() => router.push('/budgets')}>
              <Text style={styles.limit}>{budgets.monthly ? formatMoney(budgets.monthly.amountCents) : 'À définir'}</Text>
            </Pressable></View> : <Text style={styles.caption}>{budgets.error ? 'Budget indisponible' : 'Chargement du budget…'}</Text>}
        </View>
        {budgets.monthly && !budgets.error && !budgets.loading ? <BudgetProgress spent={summary.expenseCents} limit={budgets.monthly.amountCents} /> : null}
        {budgets.monthlySource === 'salary' && !budgets.error && !budgets.loading
          ? <Text style={styles.caption}>Salaire net utilisé par défaut.</Text> : null}
        <View style={styles.financialDetails}>
          <View style={styles.financialItem}><Text style={styles.caption}>Revenus</Text><Text style={styles.income}>{formatMoney(summary.incomeCents)}</Text></View>
          <View style={styles.financialItem}><Text style={styles.caption}>Solde du mois</Text><Text style={styles.balance}>{formatMoney(summary.netCents)}</Text></View>
        </View>
      </SurfaceCard>
      <View>
        <SectionHeader title="Dépenses par catégorie" />
        <ExpenseChart breakdown={breakdown} categories={data.categories} total={summary.expenseCents} />
      </View>
      <Button title="Ajouter une dépense" icon={Plus} onPress={() => router.push('/transaction')} />
      {data.transactions.length ? <View>
        <SectionHeader title="Dernières transactions" action="Tout voir" onAction={() => router.push('/history')} />
        <SurfaceCard style={styles.transactions}>
          {data.transactions.slice(0, 3).map((transaction, index, recent) => <TransactionRow key={transaction.id}
            transaction={transaction} category={categories.get(transaction.categoryId)} last={index === recent.length - 1} />)}
        </SurfaceCard>
      </View> : <Pressable accessibilityRole="button" onPress={() => router.push('/budgets')} style={styles.firstBudget}>
        <Text style={styles.budgetTitle}>Définir un budget</Text>
        <ChevronRight size={theme.size.icon.medium} color={theme.colors.primaryDark} {...decorativeIconProps} />
      </Pressable>}
    </View>}
  </ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: theme.layout.gutter, paddingBottom: theme.spacing.xl },
  meta: { ...theme.typography.bodySmall, color: theme.colors.textSubtle },
  caption: { ...theme.typography.caption, color: theme.colors.textSubtle },
  sections: { gap: theme.spacing.xl },
  summaryCard: { gap: theme.spacing.sm, overflow: 'hidden' },
  cornerLeaf: { position: 'absolute', top: -theme.spacing.sm, right: -theme.spacing.sm, transform: [{ rotate: '24deg' }] },
  expenseLine: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md },
  expenses: { ...theme.typography.financial, ...theme.typography.amount, color: theme.colors.textPrimary, flexShrink: 1 },
  limitCopy: { gap: theme.spacing.xs, paddingRight: theme.spacing.lg },
  limit: { ...theme.typography.bodySmall, fontFamily: theme.fontFamily.semibold, color: theme.colors.textAction, minHeight: 28 },
  financialDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.lg, borderTopWidth: theme.size.borderWidth, borderTopColor: theme.colors.border, paddingTop: theme.spacing.sm, marginTop: theme.spacing.xs },
  financialItem: { flexGrow: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', minWidth: 0, gap: theme.spacing.xs },
  income: { ...theme.typography.bodySmall, ...theme.typography.amount, fontFamily: theme.fontFamily.medium, color: theme.colors.success },
  balance: { ...theme.typography.bodySmall, ...theme.typography.amount, fontFamily: theme.fontFamily.medium, color: theme.colors.textPrimary },
  transactions: { padding: theme.spacing.xs },
  firstBudget: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.large, borderWidth: theme.size.borderWidth, borderColor: theme.colors.border },
  budgetTitle: { ...theme.typography.bodySmall, fontFamily: theme.fontFamily.semibold, color: theme.colors.textPrimary, flex: 1 },
});
