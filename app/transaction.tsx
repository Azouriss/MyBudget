import { t } from '../src/i18n/locale';
import { useLanguage } from '../src/i18n/useLanguage';
import { useDatabase } from '../src/db/DatabaseProvider';
import { createPaydayRepository } from '../src/features/payday/repository';
import { monthBounds } from '../src/lib/dates';
import { useEffect, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { View } from 'react-native';
import { TransactionForm } from '../src/features/transactions/TransactionForm';
import { useTransactionRepository } from '../src/features/transactions/hooks';
import type { Category } from '../src/db/schema';
import type { Transaction } from '../src/features/transactions/types';
import { EmptyState } from '../src/components/EmptyState';
import { QueryState } from '../src/components/QueryState';
import { ScreenContainer } from '../src/components/ScreenContainer';
import { Button } from '../src/components/Button';
import { theme } from '../src/theme';

export default function TransactionScreen() {
  useLanguage();
  const { id, salaryMonth, recurring } = useLocalSearchParams<{ id?: string; salaryMonth?: string; recurring?: string }>();
  const db = useDatabase();
  const repository = useTransactionRepository();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ categories: Category[]; existing?: Transaction; loading: boolean; failed: boolean }>({
    categories: [], loading: true, failed: false,
  });
  useEffect(() => {
    try {
      if (salaryMonth) monthBounds(salaryMonth);
      const existing = id ? repository.find(id) : salaryMonth ? createPaydayRepository(db).salaryForMonth(salaryMonth) : undefined;
      setState({ existing, categories: repository.categories(), loading: false, failed: !!id && !existing });
    } catch { setState({ categories: [], loading: false, failed: true }); }
  }, [id, salaryMonth, db, repository, attempt]);
  if (!state.loading && !state.failed) return <TransactionForm key={id ?? salaryMonth ?? 'new'} salaryMonth={salaryMonth} initiallyRecurring={recurring === '1'} categories={state.categories} existing={state.existing} />;
  return <ScreenContainer inTabs={false}>
    <View style={{ padding: theme.layout.gutter, gap: theme.spacing.lg }}>
      {state.loading ? <QueryState error={false} /> : <>
        <EmptyState title={t("Transaction indisponible")} description={t("La transaction ou ses catégories n’ont pas pu être chargées.")} />
        <Button title={t("Réessayer")} onPress={() => setAttempt((value) => value + 1)} />
        <Button title={t("Revenir à l’accueil")} onPress={() => router.replace('/')} variant="secondary" />
      </>}
    </View>
  </ScreenContainer>;
}
