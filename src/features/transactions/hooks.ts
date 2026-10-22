import { useEffect, useMemo, useState } from 'react';
import { useDatabase } from '../../db/DatabaseProvider';
import { useAppStore } from '../../stores/useAppStore';
import { createTransactionRepository } from './repository';
import type { Transaction } from './types';
import type { Category } from '../../db/schema';
import { createPeriodRepository } from '../payday/period';

export function useTransactionRepository() {
  const db = useDatabase();
  return useMemo(() => createTransactionRepository(db), [db]);
}

export function useMonthlyTransactions() {
  const repository = useTransactionRepository();
  const month = useAppStore((state) => state.month);
  const revision = useAppStore((state) => state.revision);
  const [state, setState] = useState<{
    month: string; revision: number; transactions: Transaction[]; categories: Category[];
    error: boolean; loading: boolean;
  }>({ month: '', revision: -1, transactions: [], categories: [], error: false, loading: true });

  useEffect(() => {
    try {
      setState({ month, revision, transactions: repository.withPlannedForBudgetMonth(month),
        categories: repository.categories(), error: false, loading: false });
    } catch {
      setState({ month, revision, transactions: [], categories: [], error: true, loading: false });
    }
  }, [month, revision, repository]);

  if (state.month !== month || state.revision !== revision) {
    return { transactions: [], categories: [], error: false, loading: true };
  }
  return state;
}

export function useBudgetPeriod(month: string) {
  const db = useDatabase();
  const revision = useAppStore((state) => state.revision);
  return useMemo(() => createPeriodRepository(db).forMonth(month), [db, month, revision]);
}
