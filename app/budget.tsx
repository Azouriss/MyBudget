import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { BudgetForm } from '../src/features/budgets/BudgetForm';
import { useBudgetRepository } from '../src/features/budgets/hooks';
import { budgetMonthSchema } from '../src/features/budgets/validation';
import { useTransactionRepository } from '../src/features/transactions/hooks';
import { ScreenContainer } from '../src/components/ScreenContainer';
import { QueryState } from '../src/components/QueryState';
import { EmptyState } from '../src/components/EmptyState';
import { Button } from '../src/components/Button';
import { theme } from '../src/theme';

export default function BudgetScreen() {
  const { month, categoryId } = useLocalSearchParams<{ month?: string; categoryId?: string }>();
  const repository = useBudgetRepository();
  const transactions = useTransactionRepository();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ label: string; existingAmount?: number; defaultAmount?: number; loading: boolean; failed: boolean }>({
    label: '', loading: true, failed: false,
  });
  useEffect(() => {
    try {
      const validMonth = budgetMonthSchema.parse(month);
      const budgets = repository.forMonth(validMonth);
      const category = categoryId ? transactions.categories().find((item) => item.id === categoryId && item.kind === 'expense') : undefined;
      if (categoryId && !category) throw new Error('Catégorie introuvable.');
      setState({ label: category?.label ?? 'Budget global', loading: false, failed: false,
        existingAmount: categoryId ? budgets.categories.find((item) => item.categoryId === categoryId)?.amountCents
          : budgets.monthlySource === 'budget' ? budgets.monthly?.amountCents : undefined,
        defaultAmount: !categoryId && budgets.monthlySource === 'salary' ? budgets.monthly?.amountCents : undefined });
    } catch { setState({ label: '', loading: false, failed: true }); }
  }, [month, categoryId, repository, transactions, attempt]);
  if (!state.loading && !state.failed && month) return <BudgetForm key={`${month}:${categoryId ?? 'total'}`}
    month={month} categoryId={categoryId} label={state.label} existingAmount={state.existingAmount} defaultAmount={state.defaultAmount} />;
  return <ScreenContainer inTabs={false}><View style={{ padding: theme.layout.gutter, gap: theme.spacing.lg }}>
    {state.loading ? <QueryState error={false} /> : <>
      <EmptyState title="Budget indisponible" description="Le mois ou la catégorie n’a pas pu être chargé. Vos données sont conservées." />
      <Button title="Réessayer" onPress={() => setAttempt((value) => value + 1)} />
      <Button title="Revenir aux budgets" variant="secondary" onPress={() => router.replace('/budgets')} />
    </>}
  </View></ScreenContainer>;
}
