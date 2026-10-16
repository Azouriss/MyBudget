import { useEffect, useMemo, useState } from 'react';
import { useDatabase } from '../../db/DatabaseProvider';
import { useAppStore } from '../../stores/useAppStore';
import { createBudgetRepository, type MonthlyBudgets } from './repository';

export function useBudgetRepository() {
  const db = useDatabase();
  return useMemo(() => createBudgetRepository(db), [db]);
}

export function useMonthlyBudgets() {
  const repository = useBudgetRepository();
  const month = useAppStore((state) => state.month);
  const revision = useAppStore((state) => state.revision);
  const [state, setState] = useState<MonthlyBudgets & { month: string; revision: number; loading: boolean; error: boolean }>({
    month: '', revision: -1, monthly: undefined, categories: [], loading: true, error: false,
  });
  useEffect(() => {
    try { setState({ ...repository.forMonth(month), month, revision, loading: false, error: false }); }
    catch { setState({ month, revision, monthly: undefined, categories: [], loading: false, error: true }); }
  }, [repository, month, revision]);
  return state.month === month && state.revision === revision ? state
    : { monthly: undefined, categories: [], loading: true, error: false };
}
