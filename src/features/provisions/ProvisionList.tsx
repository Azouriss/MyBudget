import { t } from '../../i18n/locale';
import { useLanguage } from '../../i18n/useLanguage';
import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { SurfaceCard } from '../../components/SurfaceCard';
import { useDatabase } from '../../db/DatabaseProvider';
import { displayDate, localDateKey } from '../../lib/dates';
import { formatMoney } from '../../lib/money';
import { useAppStore } from '../../stores/useAppStore';
import { forecastStyles as styles } from '../forecast/styles';
import { provisionPlan } from './calculations';
import { createProvisionRepository } from './repository';

export function ProvisionList() {
  useLanguage();
  const db = useDatabase();
  const revision = useAppStore((state) => state.revision);
  const invalidate = useAppStore((state) => state.invalidate);
  const repository = useMemo(() => createProvisionRepository(db), [db]);
  const [state, setState] = useState<{ revision: number; goals?: ReturnType<typeof repository.all>; error?: boolean }>({ revision: -1 });
  useEffect(() => {
    try { setState({ revision, goals: repository.all() }); }
    catch { setState({ revision, error: true }); }
  }, [revision, repository]);
  const today = localDateKey();
  return <View style={styles.group}>
    <Text style={styles.note}>{t("Réserve indicative : aucun virement ni effet sur le budget.")}</Text>
    <Button title={t("Créer une provision")} onPress={() => router.push('/provision')} />
    {state.revision !== revision ? <Text style={styles.note}>{t("Chargement des provisions…")}</Text>
      : state.error ? <><Text accessibilityRole="alert" style={styles.error}>{t("Impossible de lire les provisions.")}</Text><Button title={t("Réessayer")} onPress={invalidate} /></>
      : state.goals?.length === 0 ? <SurfaceCard style={styles.card}><Text style={styles.title}>{t("Aucune provision")}</Text></SurfaceCard>
      : state.goals?.map((goal) => {
        const plan = provisionPlan(goal, goal.reservedCents, today);
        return <SurfaceCard key={goal.id} style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>{goal.label}</Text>
          <Text style={styles.copy}>{formatMoney(goal.reservedCents)}{t(" réservés sur ")}{formatMoney(goal.targetCents)}</Text>
          <Text style={styles.note}>{t("Échéance : ")}{displayDate(goal.dueOn)}</Text>
          <Text style={plan.overdue ? styles.error : styles.copy}>{plan.remainingCents === 0 ? t("Objectif entièrement réservé")
            : plan.overdue ? t("Échéance dépassée · {0} restent à réserver", [formatMoney(plan.remainingCents)])
            : plan.monthlyCents === null ? t("{0} à réserver avant l’échéance", [formatMoney(plan.remainingCents)])
            : t("{0} par contribution · {1} date{2} restante{3}", [formatMoney(plan.monthlyCents), plan.contributions, plan.contributions > 1 ? 's' : '', plan.contributions > 1 ? 's' : ''])}</Text>
          <Button title={t("Gérer {0}", [goal.label])} variant="secondary" onPress={() => router.push({ pathname: '/provision', params: { id: goal.id } })} />
        </SurfaceCard>;
      })}
  </View>;
}
