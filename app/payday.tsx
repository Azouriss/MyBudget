import { useEffect, useRef, useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useDatabase } from '../src/db/DatabaseProvider';
import { Button } from '../src/components/Button';
import { FormField } from '../src/components/FormField';
import { SettingsPage, settingsStyles as styles } from '../src/components/SettingsPage';
import { SurfaceCard } from '../src/components/SurfaceCard';
import { useConfirmation } from '../src/components/ConfirmationProvider';
import { createPaydayRepository } from '../src/features/payday/repository';
import { phoneNotificationsAvailable, requestSalaryNotificationPermission, syncSalaryNotifications } from '../src/features/payday/notifications';
import { currentMonth, monthLabel } from '../src/lib/dates';
import { useAppStore } from '../src/stores/useAppStore';
import { theme } from '../src/theme';

export default function PaydayScreen() {
  const db = useDatabase();
  const [initial, setInitial] = useState<{ day: string; enabled: boolean } | null>(null);
  const [day, setDay] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const allowLeave = useRef(false);
  const confirm = useConfirmation();
  const navigation = useNavigation();
  const revision = useAppStore((s) => s.revision);
  const [hasSalary, setHasSalary] = useState(false);
  useEffect(() => {
    try {
      const repository = createPaydayRepository(db);
      const settings = repository.settings();
      const value = { day: settings ? String(settings.day) : '', enabled: settings?.notificationsEnabled ?? true };
      setInitial(value); setDay(value.day); setEnabled(value.enabled);
      void syncSalaryNotifications(db).then(setStatus).catch(() => setStatus('La programmation des notifications a échoué. Enregistrez pour réessayer.'));
    } catch { setError('Les paramètres n’ont pas pu être chargés. Rouvrez cet écran.'); }
  }, [db]);
  useEffect(() => { try { setHasSalary(!!createPaydayRepository(db).salaryForMonth(currentMonth())); } catch { setHasSalary(false); } }, [db, revision]);
  const dirty = !!initial && (initial.day !== day || initial.enabled !== enabled);
  usePreventRemove(dirty, ({ data }) => {
    if (allowLeave.current) navigation.dispatch(data.action);
    else if (!busy.current) void confirm({ title: 'Quitter sans enregistrer ?', message: 'Le jour de paie et les rappels ne seront pas modifiés.', confirmLabel: 'Quitter' })
      .then((ok) => { if (ok) navigation.dispatch(data.action); });
  });
  async function save() {
    if (busy.current || !initial) return;
    if (!/^\d{1,2}$/.test(day) || Number(day) < 1 || Number(day) > 31) { setError('Choisissez un jour entre 1 et 31.'); return; }
    busy.current = true; setSaving(true); setError('');
    try {
      let granted = false;
      let permissionFailed = false;
      if (enabled && phoneNotificationsAvailable) {
        try { granted = await requestSalaryNotificationPermission(); } catch { permissionFailed = true; }
      }
      createPaydayRepository(db).save(Number(day), enabled);
      setInitial({ day, enabled });
      useAppStore.getState().invalidate();
      try { setStatus(await syncSalaryNotifications(db)); }
      catch { setStatus('Jour de paie enregistré. La programmation téléphone a échoué ; réessayez.'); }
      if (permissionFailed) setStatus('Jour de paie enregistré. Impossible de vérifier l’autorisation téléphone ; réessayez.');
      else if (enabled && phoneNotificationsAvailable && !granted) setStatus('Jour de paie enregistré. Autorisez les notifications dans les réglages du téléphone. Le rappel dans l’app reste actif.');
      useAppStore.getState().showNotice('Jour de paie enregistré');
    } catch { setError('Impossible d’enregistrer. Votre saisie est conservée.'); }
    finally { busy.current = false; setSaving(false); }
  }
  async function remove() {
    if (busy.current || !initial) return;
    if (!await confirm({ title: 'Désactiver les rappels de paie ?', message: 'Votre salaire et vos transactions restent conservés.', confirmLabel: 'Désactiver' })) return;
    busy.current = true; setSaving(true);
    try {
      createPaydayRepository(db).remove();
      useAppStore.getState().invalidate();
      await syncSalaryNotifications(db);
      allowLeave.current = true;
      router.replace('/settings');
    } catch { setError('Impossible de terminer la désactivation des rappels. Réessayez.'); }
    finally { busy.current = false; setSaving(false); }
  }
  return <SettingsPage title="Jour de paie" footer={<Button title="Enregistrer le jour de paie" onPress={() => { void save(); }} loading={saving} disabled={!initial} />}>
    <Text style={styles.copy}>Un rappel pour saisir le salaire net réellement reçu chaque mois.</Text>
    <FormField label="Jour du mois" value={day} onChangeText={setDay} placeholder="Ex. 28" keyboardType="number-pad" maxLength={2} editable={!!initial && !saving} />
    <Text style={styles.copy}>Du 1 au 31. Si le jour choisi n’existe pas, le rappel tombe le dernier jour du mois.</Text>
    <SurfaceCard style={styles.card}>
      <View style={styles.row}><Text style={[styles.label, { flex: 1 }]}>Notification téléphone</Text>
        <Switch accessibilityLabel="Notification téléphone" value={enabled} onValueChange={setEnabled} disabled={!initial || saving}
          thumbColor={theme.colors.surface} trackColor={{ false: theme.colors.controlBorder, true: theme.colors.primaryDark }} /></View>
      <Text style={styles.copy}>Vers 9 h, même si l’app est fermée. Aucun montant n’est affiché dans la notification. Les rappels sont préparés pour les 12 prochains mois et renouvelés à l’ouverture de l’app.</Text>
      {!phoneNotificationsAvailable ? <Text style={styles.copy}>À utiliser sur Android. Dans cet aperçu, le rappel reste visible dans l’accueil.</Text> : null}
      {status ? <Text accessibilityLiveRegion="polite" style={styles.copy}>{status}</Text> : null}
    </SurfaceCard>
    <SurfaceCard style={styles.card}>
      <Text style={styles.label}>Salaire · {monthLabel(currentMonth())}</Text>
      <Text style={styles.copy}>L’accueil vous le rappellera à partir du jour de paie, jusqu’à son enregistrement. Aucun revenu n’est ajouté automatiquement.</Text>
      <Button title={hasSalary ? 'Modifier mon salaire net du mois' : 'Saisir mon salaire net du mois'} variant="secondary" disabled={saving}
        onPress={() => router.push({ pathname: '/transaction', params: { salaryMonth: currentMonth() } })} />
    </SurfaceCard>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    {initial?.day ? <Button title="Désactiver les rappels de paie" variant="ghost" onPress={() => { void remove(); }} disabled={saving} /> : null}
  </SettingsPage>;
}
