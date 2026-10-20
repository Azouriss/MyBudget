import { t } from '../../i18n/locale';
import { useLanguage } from '../../i18n/useLanguage';
import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Plus, SlidersHorizontal } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { IconButton } from '../../components/IconButton';
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
    <View style={styles.provisionSummary}>
      <Text style={styles.note}>{t('Réserve indicative : aucun virement ni effet sur le budget.')}</Text>
    </View>
    {state.revision !== revision ? <Text style={styles.note}>{t('Chargement des provisions…')}</Text>
      : state.error ? <><Text accessibilityRole="alert" style={styles.error}>{t('Impossible de lire les provisions.')}</Text><Button title={t('Réessayer')} onPress={invalidate} /></>
      : state.goals?.length === 0 ? <SurfaceCard style={styles.card}>
        <Text accessibilityRole="header" style={styles.title}>{t('Aucune provision')}</Text>
        <Button title={t('Créer une provision')} icon={Plus} onPress={() => router.push('/provision')} />
      </SurfaceCard>
      : <>
        <Button title={t('Créer une provision')} variant="secondary" icon={Plus} onPress={() => router.push('/provision')} />
        {state.goals?.map((goal) => {
          const plan = provisionPlan(goal, goal.reservedCents, today);
          const percent = Math.round(goal.reservedCents / goal.targetCents * 100);
          return <SurfaceCard key={goal.id} style={styles.card}>
            <View style={styles.cardHeading}>
              <View style={styles.headingCopy}>
                <Text accessibilityRole="header" style={styles.title}>{goal.label}</Text>
                <Text style={styles.note}>{t('Échéance : ')}{displayDate(goal.dueOn)}</Text>
              </View>
              <IconButton icon={SlidersHorizontal} label={t('Gérer ') + goal.label}
                onPress={() => router.push({ pathname: '/provision', params: { id: goal.id } })} />
            </View>
            <View style={styles.provisionSummary}>
              <Text style={styles.amount}>{formatMoney(goal.reservedCents)}</Text>
              <Text style={styles.note}>{t('réservés sur ')}{formatMoney(goal.targetCents)}</Text>
            </View>
            <View accessibilityRole="progressbar" accessibilityLabel={goal.label}
              aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}
              aria-valuetext={`${formatMoney(goal.reservedCents)} / ${formatMoney(goal.targetCents)}`}
              accessibilityValue={{ min: 0, max: 100, now: percent,
                text: `${formatMoney(goal.reservedCents)} / ${formatMoney(goal.targetCents)}` }} style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${goal.reservedCents / goal.targetCents * 100}%` }]} />
            </View>
            <View style={[styles.provisionPlan, plan.overdue && styles.balanceNegative]}>
              <Text style={[styles.copy, plan.overdue && styles.negative]}>{plan.remainingCents === 0 ? t('Objectif entièrement réservé')
                : plan.overdue ? t('Échéance dépassée')
                : plan.monthlyCents === null ? t('À réserver avant l’échéance')
                : t('Par contribution')}</Text>
              {plan.remainingCents > 0 ? <Text style={[styles.secondaryAmount, plan.overdue && styles.negative]}>
                {formatMoney(plan.monthlyCents === null || plan.overdue ? plan.remainingCents : plan.monthlyCents)}
              </Text> : null}
              {plan.overdue ? <Text style={styles.error}>{t('restent à réserver')}</Text> : null}
              {plan.monthlyCents !== null && plan.remainingCents > 0 && !plan.overdue ? <Text style={styles.note}>
                {plan.contributions}{plan.contributions > 1 ? t(' dates restantes') : t(' date restante')}
              </Text> : null}
            </View>
          </SurfaceCard>;
        })}
      </>}
  </View>;
}
