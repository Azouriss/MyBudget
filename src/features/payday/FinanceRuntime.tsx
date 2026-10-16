import { useEffect } from 'react';
import { AppState } from 'react-native';
import { router } from 'expo-router';
import { useDatabase } from '../../db/DatabaseProvider';
import { useAppStore } from '../../stores/useAppStore';
import { catchUpExpenses } from '../recurring/repository';
import { observeSalaryNotification, syncSalaryNotifications } from './notifications';

export function FinanceRuntime() {
  const db = useDatabase();
  const revision = useAppStore((state) => state.revision);
  useEffect(() => {
    void (async () => {
      try {
        if (await catchUpExpenses(db)) useAppStore.getState().invalidate();
      } catch { useAppStore.getState().showNotice('Les échéances n’ont pas pu être actualisées. Rouvrez l’app pour réessayer.'); }
      try { await syncSalaryNotifications(db); }
      catch { useAppStore.getState().showNotice('Le rappel téléphone n’a pas pu être programmé. Vérifiez les paramètres de paie.'); }
    })();
  }, [db, revision]);
  useEffect(() => {
    let running = false;
    async function refresh() {
      if (running || AppState.currentState === 'background') return;
      running = true;
      try { await catchUpExpenses(db); useAppStore.getState().invalidate(); }
      catch { useAppStore.getState().showNotice('Les échéances n’ont pas pu être actualisées. Réessayez en rouvrant l’app.'); }
      finally { running = false; }
    }
    const listener = AppState.addEventListener('change', (state) => { if (state === 'active') void refresh(); });
    const timer = setInterval(() => { void refresh(); }, 60_000);
    return () => { listener.remove(); clearInterval(timer); };
  }, [db]);
  useEffect(() => observeSalaryNotification((salaryMonth) => {
    router.push({ pathname: '/transaction', params: { salaryMonth } });
  }), []);
  return null;
}
