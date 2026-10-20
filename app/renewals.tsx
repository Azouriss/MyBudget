import { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { SettingsPage, settingsStyles as s } from '../src/components/SettingsPage';
import { SurfaceCard } from '../src/components/SurfaceCard';
import { Button } from '../src/components/Button';
import { FormField } from '../src/components/FormField';
import { DateField } from '../src/components/DateField';
import { useConfirmation } from '../src/components/ConfirmationProvider';
import { useDatabase } from '../src/db/DatabaseProvider';
import { createRenewalRepository, renewalReminder, renewalSchema } from '../src/features/renewals/repository';
import { requestRenewalPermission, renewalNotificationsAvailable, syncRenewalNotifications } from '../src/features/renewals/notifications';
import { OperationError, QueryFeedback, useLocalQuery, useOperation, useDraftGuard } from '../src/features/entry-tools/ui';
import { centsToInput, formatMoney } from '../src/lib/money';
import { displayDate, localDateKey, parseFrenchDate } from '../src/lib/dates';
import { parseBudgetAmount } from '../src/features/budgets/validation';

export default function RenewalsScreen() {
  const db = useDatabase(), repository = createRenewalRepository(db), op = useOperation(), confirm = useConfirmation();
  const query = useLocalQuery(() => repository.all());
  const [id, setId] = useState<string | undefined>(), [label, setLabel] = useState(''), [amount, setAmount] = useState('');
  const [due, setDue] = useState(''), [cancelBy, setCancelBy] = useState(''), [days, setDays] = useState('7'), [enabled, setEnabled] = useState(false);
  useDraftGuard(!!label || !!amount || !!due || !!cancelBy, op.busy);
  function reset() { setId(undefined); setLabel(''); setAmount(''); setDue(''); setCancelBy(''); setDays('7'); setEnabled(false); }
  return <SettingsPage title="Renouvellements">
    <Text style={s.copy}>Suivi des échéances, sans création de dépense.</Text>
    <FormField label="Abonnement ou contrat" value={label} onChangeText={setLabel} maxLength={80} editable={!op.busy} />
    <FormField label="Coût du renouvellement en euros" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" editable={!op.busy} />
    <DateField label="Prochain renouvellement · JJ/MM/AAAA" value={due} onChangeText={setDue} editable={!op.busy} />
    <DateField label="Date limite de résiliation · JJ/MM/AAAA" value={cancelBy} onChangeText={setCancelBy} editable={!op.busy} />
    <FormField label="Rappel avant la date limite (0 à 90 jours)" value={days} onChangeText={setDays} keyboardType="number-pad" editable={!op.busy} />
    <View style={s.row}><Text style={s.label}>{renewalNotificationsAvailable ? 'Rappel local sur ce téléphone' : 'Rappels disponibles sur Android'}</Text>
      <Switch accessibilityLabel="Activer le rappel de renouvellement" value={enabled} onValueChange={setEnabled} disabled={op.busy || !renewalNotificationsAvailable} /></View>
    <Button title={id ? 'Modifier le renouvellement' : 'Ajouter le renouvellement'} disabled={op.busy} onPress={() => void op.run(async () => {
      if (!/^\d{1,2}$/.test(days)) throw new Error('Saisissez de 0 à 90 jours.');
      const draft = renewalSchema.parse({ label, amountCents: parseBudgetAmount(amount), dueOn: parseFrenchDate(due), cancelBy: parseFrenchDate(cancelBy), remindDays: Number(days), notificationsEnabled: enabled });
      if (enabled && !renewalReminder({ ...draft, id: id ?? 'new' })) throw new Error('La date du rappel est déjà passée. Choisissez une prochaine échéance ou désactivez le rappel.');
      if (enabled && !await requestRenewalPermission()) throw new Error('Notifications non autorisées. Activez-les dans les réglages du téléphone ou enregistrez sans rappel.');
      if (enabled && repository.all().filter((r) => r.id !== id && renewalReminder(r)).length >= 40) throw new Error('40 rappels maximum.');
      repository.save(draft, id); reset();
      try { await syncRenewalNotifications(db); } catch { throw new Error('Fiche enregistrée, mais rappel non programmé. Vérifiez les réglages et réessayez.'); }
    }, 'Renouvellement enregistré')} />
    {id ? <Button title="Annuler la modification" variant="ghost" onPress={reset} disabled={op.busy} /> : null}
    <OperationError message={op.error} />
    {!query.data ? <QueryFeedback {...query} /> : query.data.length === 0 ? <Text style={s.copy}>Aucun renouvellement suivi.</Text> : query.data.map((r) => <SurfaceCard key={r.id} style={s.card}>
      <Text style={s.label}>{r.label} · {formatMoney(r.amountCents)}</Text>
      <Text style={s.copy}>Renouvellement : {displayDate(r.dueOn)} · Résiliation au plus tard : {displayDate(r.cancelBy)}{r.cancelBy < localDateKey() ? ' · Date limite passée' : ''}</Text>
      <Text style={s.copy}>{r.notificationsEnabled ? `Rappel demandé : ${r.remindDays} j avant, vers 9 h (si autorisé par Android).` : 'Rappel désactivé.'}</Text>
      <Button title="Modifier l’échéance" variant="secondary" disabled={op.busy} onPress={() => {
        setId(r.id); setLabel(r.label); setAmount(centsToInput(r.amountCents)); setDue(displayDate(r.dueOn)); setCancelBy(displayDate(r.cancelBy)); setDays(String(r.remindDays)); setEnabled(r.notificationsEnabled);
      }} />
      <Button title="Supprimer ce suivi" variant="ghost" disabled={op.busy} onPress={() => void op.run(async () => {
        if (await confirm({ title: 'Supprimer ce renouvellement ?', message: 'Le rappel sera retiré. Cette action ne résilie pas votre contrat.', confirmLabel: 'Supprimer', destructive: true })) {
          repository.remove(r.id); await syncRenewalNotifications(db);
        }
      })} />
    </SurfaceCard>)}
  </SettingsPage>;
}
