import { useEffect } from 'react';
import { AppState } from 'react-native';
import { router } from 'expo-router';
import type { AppDatabase } from '../../db/client';
import { useAppStore } from '../../stores/useAppStore';
import { observeRenewalNotifications, syncRenewalNotifications } from './notifications';

export function RenewalRuntime({ db }: { db: AppDatabase }) {
  const revision = useAppStore((s) => s.revision);
  useEffect(() => {
    const refresh = () => { void syncRenewalNotifications(db).catch(() => useAppStore.getState().showNotice('Les rappels de renouvellement n’ont pas pu être programmés. Vérifiez les réglages du téléphone.')); };
    refresh();
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') refresh(); });
    return () => subscription.remove();
  }, [db, revision]);
  useEffect(() => observeRenewalNotifications(() => router.push('/renewals')), []);
  return null;
}
