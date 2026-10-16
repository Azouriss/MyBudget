import { useMemo } from 'react';
import { useDatabase } from '../../db/DatabaseProvider';
import { localDateKey } from '../../lib/dates';
import { useAppStore } from '../../stores/useAppStore';
import { createForecastRepository, ForecastPendingError } from './repository';

export function useForecast() {
  const db = useDatabase();
  const revision = useAppStore((state) => state.revision);
  const today = localDateKey();
  const repository = useMemo(() => createForecastRepository(db), [db]);
  type Data = ReturnType<typeof repository.read>;
  return useMemo<{ data?: Data; error?: string }>(() => {
    try { return { data: repository.read(today) }; }
    catch (error) { return { error: error instanceof ForecastPendingError ? error.message
      : 'Impossible de calculer les prévisions. Vos données sont conservées.' }; }
  }, [repository, revision, today]);
}
