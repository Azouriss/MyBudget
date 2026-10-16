import { useRef, useState } from 'react';
import { router, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { ArrowLeft } from 'lucide-react-native';
import { ScrollView, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { DateField } from '../../components/DateField';
import { FormField } from '../../components/FormField';
import { IconButton } from '../../components/IconButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SurfaceCard } from '../../components/SurfaceCard';
import { useConfirmation } from '../../components/ConfirmationProvider';
import { displayDate, localDateKey, parseFrenchDate } from '../../lib/dates';
import { centsToInput, formatMoney, parseAmountToCents } from '../../lib/money';
import { useAppStore } from '../../stores/useAppStore';
import { forecastStyles as styles } from '../forecast/styles';
import { provisionDraftSchema, provisionPlan } from './calculations';
import type { createProvisionRepository } from './repository';

type Repository = ReturnType<typeof createProvisionRepository>;
export function ProvisionForm({ repository, initial, initialMovements }: {
  repository: Repository; initial?: NonNullable<ReturnType<Repository['find']>>; initialMovements: ReturnType<Repository['movements']>;
}) {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [target, setTarget] = useState(initial ? centsToInput(initial.targetCents) : '');
  const [dueOn, setDueOn] = useState(displayDate(initial?.dueOn ?? localDateKey()));
  const [day, setDay] = useState(String(initial?.contributionDay ?? 1));
  const [movement, setMovement] = useState('');
  const [reserved, setReserved] = useState(initial?.reservedCents ?? 0);
  const [movements, setMovements] = useState(initialMovements);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const allowLeave = useRef(false);
  const confirm = useConfirmation();
  const navigation = useNavigation();
  const invalidate = useAppStore((state) => state.invalidate);
  const showNotice = useAppStore((state) => state.showNotice);
  const dirty = label !== (initial?.label ?? '') || target !== (initial ? centsToInput(initial.targetCents) : '')
    || dueOn !== displayDate(initial?.dueOn ?? localDateKey()) || day !== String(initial?.contributionDay ?? 1);
  usePreventRemove(dirty || movement !== '', ({ data }) => {
    if (allowLeave.current) { navigation.dispatch(data.action); return; }
    if (busy.current) return;
    void confirm({ title: 'Quitter sans enregistrer ?', message: 'Les modifications non enregistrées seront perdues.', confirmLabel: 'Quitter' })
      .then((accepted) => { if (accepted) navigation.dispatch(data.action); });
  });
  function back() { if (router.canGoBack()) router.back(); else router.replace('/forecast'); }
  function complete(message: string) { invalidate(); showNotice(message); allowLeave.current = true; back(); }
  function save() {
    if (busy.current) return;
    let draft;
    try {
      if (!/^\d{1,2}$/.test(day.trim())) throw new Error();
      draft = provisionDraftSchema.parse({ label, targetCents: parseAmountToCents(target), dueOn: parseFrenchDate(dueOn), contributionDay: Number(day) });
      if (draft.targetCents < reserved) { setError('Libérez la réserve excédentaire avant de réduire le montant cible.'); return; }
    } catch { setError('Vérifiez le nom, le montant positif, la date et le jour mensuel entre 1 et 31.'); return; }
    busy.current = true; setSaving(true); setError('');
    try { repository.save(draft, initial?.id); complete('Provision enregistrée'); }
    catch { setError('Impossible d’enregistrer la provision. Votre saisie est conservée.'); busy.current = false; setSaving(false); }
  }
  async function move(direction: 1 | -1) {
    if (!initial || busy.current || dirty) return;
    let amount: number;
    try { amount = parseAmountToCents(movement); }
    catch { setError('Saisissez un montant positif avec au plus deux décimales.'); return; }
    if (direction < 0 && amount > reserved) { setError('Le montant dépasse la réserve actuelle.'); return; }
    if (direction > 0 && amount > initial.targetCents - reserved) { setError('Le montant dépasse ce qu’il reste à réserver.'); return; }
    busy.current = true; setSaving(true); setError('');
    try {
      if (direction < 0 && !await confirm({ title: 'Libérer cette réserve ?', message: `${formatMoney(amount)} seront retirés du suivi de cet objectif. Aucun paiement ni virement ne sera créé.`, confirmLabel: 'Libérer la réserve' })) return;
      repository.move(initial.id, direction * amount);
      setReserved((value) => value + direction * amount); setMovement(''); invalidate();
      showNotice(direction > 0 ? 'Réserve ajoutée' : 'Réserve libérée');
      setMovements(repository.movements(initial.id));
    } catch { setError('Impossible d’actualiser la réserve. Revenez à la liste pour vérifier son état avant de réessayer.'); }
    finally { busy.current = false; setSaving(false); }
  }
  async function remove() {
    if (!initial || busy.current) return;
    busy.current = true; setSaving(true);
    try {
      if (!await confirm({ title: 'Supprimer cette provision ?', message: 'Cet objectif et son historique de réserve seront supprimés. Vos dépenses et budgets seront conservés.', confirmLabel: 'Supprimer', destructive: true })) return;
      repository.remove(initial.id); complete('Provision supprimée');
    } catch { setError('Impossible de supprimer la provision. Vos données sont conservées.'); }
    finally { busy.current = false; setSaving(false); }
  }
  const plan = initial ? provisionPlan(initial, reserved, localDateKey()) : null;
  return <ScreenContainer inTabs={false} footer={<Button title="Enregistrer la provision" onPress={save} disabled={movement !== ''} loading={saving} />}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
      <View style={styles.header}><IconButton icon={ArrowLeft} label="Retour aux prévisions" onPress={back} disabled={saving} />
        <Text accessibilityRole="header" style={styles.title}>{initial ? 'Ma provision' : 'Nouvelle provision'}</Text></View>
      <Text style={styles.note}>Suivez l’argent que vous choisissez de réserver. Ce suivi ne déplace pas d’argent et ne modifie pas les dépenses du mois.</Text>
      <FormField label="Nom de la provision" value={label} onChangeText={setLabel} maxLength={80} editable={!saving} />
      <FormField label="Montant cible en euros" suffix="€" keyboardType="decimal-pad" value={target} onChangeText={setTarget} editable={!saving} />
      <DateField label="Échéance" value={dueOn} onChangeText={setDueOn} editable={!saving} />
      <FormField label="Jour mensuel de contribution (1 à 31)" keyboardType="number-pad" value={day} onChangeText={setDay} maxLength={2} editable={!saving} />
      <Text style={styles.note}>Les mois plus courts utilisent leur dernier jour. L’effort indicatif compte les prochaines dates jusqu’à l’échéance incluse ; aucune contribution n’est automatique.</Text>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {initial && plan ? <SurfaceCard style={styles.card}>
        <Text style={styles.title}>Réserve suivie</Text>
        <Text style={styles.amount}>{formatMoney(reserved)}</Text>
        <Text style={styles.note}>{formatMoney(plan.remainingCents)} restent à réserver pour l’objectif enregistré.</Text>
        {plan.monthlyCents !== null && plan.remainingCents > 0 ? <Text style={styles.copy}>Repère : {formatMoney(plan.monthlyCents)} par contribution sur {plan.contributions} dates restantes. Ajustez la dernière contribution au montant restant.</Text> : null}
        {plan.overdue ? <Text style={styles.error}>L’échéance de cet objectif est dépassée.</Text> : null}
        {dirty ? <Text style={styles.note}>Enregistrez les modifications de l’objectif avant d’ajuster sa réserve.</Text> : null}
        <FormField label="Montant à ajouter ou libérer en euros" suffix="€" keyboardType="decimal-pad" value={movement} onChangeText={setMovement} editable={!saving && !dirty} />
        <Button title="Ajouter à la réserve" onPress={() => { void move(1); }} disabled={dirty || saving || movement === ''} />
        <Button title="Libérer une réserve" variant="secondary" onPress={() => { void move(-1); }} disabled={dirty || saving || movement === ''} />
        {movement !== '' ? <Button title="Annuler la saisie de réserve" variant="ghost" onPress={() => setMovement('')} disabled={saving} /> : null}
        <Text accessibilityRole="header" style={styles.title}>Historique de la réserve</Text>
        {movements.length === 0 ? <Text style={styles.note}>Aucun mouvement enregistré.</Text> : movements.map((entry) => <Text key={entry.id} style={styles.copy}>
          {displayDate(localDateKey(new Date(entry.createdAt)))} · {entry.amountCents > 0 ? '+' : '−'} {formatMoney(Math.abs(entry.amountCents))}
        </Text>)}
        <Text style={styles.note}>Quand la facture est payée, enregistrez la dépense puis libérez la réserve correspondante. La réserve n’est jamais soustraite une seconde fois de la marge.</Text>
      </SurfaceCard> : null}
      {initial ? <Button title="Supprimer la provision" variant="danger" onPress={() => { void remove(); }} disabled={saving} /> : null}
    </ScrollView>
  </ScreenContainer>;
}
