import { t } from '../src/i18n/locale';
import { useLanguage } from '../src/i18n/useLanguage';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { useDatabase } from '../src/db/DatabaseProvider';
import { SettingsPage, settingsStyles as styles } from '../src/components/SettingsPage';
import { SurfaceCard } from '../src/components/SurfaceCard';
import { Button } from '../src/components/Button';
import { createRecurringRepository, type RecurringExpense } from '../src/features/recurring/repository';
import { occurrenceOn, frequencies } from '../src/features/recurring/schedule';
import { displayDate } from '../src/lib/dates';
import { formatMoney } from '../src/lib/money';
import { useAppStore } from '../src/stores/useAppStore';

export default function RecurringScreen() {
  useLanguage();
  const db = useDatabase();
  const revision = useAppStore((s) => s.revision);
  const [rules, setRules] = useState<RecurringExpense[]>([]);
  const [error, setError] = useState(false);
  useEffect(() => { try { setRules(createRecurringRepository(db).all()); setError(false); } catch { setError(true); } }, [db, revision]);
  return <SettingsPage title={t("Dépenses récurrentes")}>
    <Text style={styles.copy}>{t("Échéances prévues, enregistrées à leur date lors de l’ouverture de l’app.")}</Text>
    <Button title={t("Ajouter une récurrence")} onPress={() => router.push({ pathname: '/transaction', params: { recurring: '1' } })} />
    {error ? <Text accessibilityRole="alert" style={styles.error}>{t("Les récurrences n’ont pas pu être chargées. Rouvrez cet écran.")}</Text> : !rules.length ? <Text style={styles.copy}>{t("Aucune dépense récurrente pour le moment.")}</Text> : rules.map((rule) => {
      const next = occurrenceOn(rule.startOn, rule.frequency, rule.nextIndex);
      return <SurfaceCard key={rule.id} style={styles.card}>
        <Text style={styles.label}>{rule.label}</Text>
        <Text style={styles.copy}>{formatMoney(rule.amountCents)}{t(" · chaque ")}{t(frequencies.find((f) => f.value === rule.frequency)?.label).toLowerCase()}</Text>
        <Text style={styles.copy}>{rule.active && next ? t("Prochaine échéance : {0}", [displayDate(next)]) : t("Récurrence arrêtée")}</Text>
        <Button title={t("Gérer {0}", [rule.label])} variant="secondary" onPress={() => router.push({ pathname: '/recurring-expense', params: { id: rule.id } })} />
      </SurfaceCard>;
    })}
  </SettingsPage>;
}
