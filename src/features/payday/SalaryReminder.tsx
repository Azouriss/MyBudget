import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { useDatabase } from '../../db/DatabaseProvider';
import { useAppStore } from '../../stores/useAppStore';
import { localDateKey, monthLabel } from '../../lib/dates';
import { Button } from '../../components/Button';
import { SurfaceCard } from '../../components/SurfaceCard';
import { theme } from '../../theme';
import { createPaydayRepository } from './repository';
import { paydayOn } from './schedule';

export function SalaryReminder() {
  const db = useDatabase();
  const revision = useAppStore((s) => s.revision);
  const [month, setMonth] = useState<string | null>(null);
  useEffect(() => {
    try {
      const repository = createPaydayRepository(db);
      const settings = repository.settings();
      const today = localDateKey();
      const current = today.slice(0, 7);
      setMonth(settings && today >= paydayOn(current, settings.day) && !repository.salaryForMonth(current) ? current : null);
    } catch { setMonth(null); }
  }, [db, revision]);
  if (!month) return null;
  return <SurfaceCard featured style={{ gap: theme.spacing.md, marginBottom: theme.spacing.lg }}>
    <Text style={{ ...theme.typography.headingM, color: theme.colors.textPrimary }}>Votre salaire · {monthLabel(month)}</Text>
    <Text style={{ ...theme.typography.bodySmall, color: theme.colors.textSubtle }}>Le jour de paie est arrivé. Ajoutez le montant net reçu pour actualiser votre budget.</Text>
    <Button title="Saisir mon salaire net" onPress={() => router.push({ pathname: '/transaction', params: { salaryMonth: month } })} />
  </SurfaceCard>;
}
