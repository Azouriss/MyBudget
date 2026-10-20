import { t } from '../../i18n/locale';
import { useLanguage } from '../../i18n/useLanguage';
import { useRef, useState } from 'react';
import { router, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { ArrowLeft } from 'lucide-react-native';
import { ScrollView, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Disclosure } from '../../components/Disclosure';
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
  useLanguage();
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
    void confirm({ title: t("Quitter sans enregistrer ?"), message: t("Les modifications non enregistrées seront perdues."), confirmLabel: t("Quitter") })
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
    try { repository.save(draft, initial?.id); complete(t("Provision enregistrée")); }
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
      if (direction < 0 && !await confirm({ title: t("Libérer cette réserve ?"), message: t("{0} seront retirés du suivi de cet objectif. Aucun paiement ni virement ne sera créé.", [formatMoney(amount)]), confirmLabel: t("Libérer la réserve") })) return;
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
      if (!await confirm({ title: t("Supprimer cette provision ?"), message: t("Cet objectif et son historique de réserve seront supprimés. Vos dépenses et budgets seront conservés."), confirmLabel: t("Supprimer"), destructive: true })) return;
      repository.remove(initial.id); complete(t("Provision supprimée"));
    } catch { setError('Impossible de supprimer la provision. Vos données sont conservées.'); }
    finally { busy.current = false; setSaving(false); }
  }
  const plan = initial ? provisionPlan(initial, reserved, localDateKey()) : null;
  return <ScreenContainer inTabs={false} footer={<Button title={t("Enregistrer la provision")} onPress={save} disabled={movement !== ''} loading={saving} />}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
      <View style={styles.header}><IconButton icon={ArrowLeft} label={t("Retour aux prévisions")} onPress={back} disabled={saving} />
        <Text accessibilityRole="header" style={styles.title}>{initial ? t("Ma provision") : t("Nouvelle provision")}</Text></View>
      <Text style={styles.note}>{t("Suivi de réserve, sans virement ni effet sur les dépenses.")}</Text>
      <FormField label={t("Nom de la provision")} value={label} onChangeText={setLabel} maxLength={80} editable={!saving} />
      <FormField label={t("Montant cible en euros")} suffix="€" keyboardType="decimal-pad" value={target} onChangeText={setTarget} editable={!saving} />
      <DateField label={t("Échéance")} value={dueOn} onChangeText={setDueOn} editable={!saving} />
      <FormField label={t("Jour de contribution (1 à 31)")} keyboardType="number-pad" value={day} onChangeText={setDay} maxLength={2} editable={!saving} />
      <Text style={styles.note}>{t("Aucun ajout automatique. Mois plus court : dernier jour du mois.")}</Text>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{t(error)}</Text> : null}
      {initial && plan ? <SurfaceCard style={styles.card}>
        <Text style={styles.title}>{t("Réserve suivie")}</Text>
        <Text style={styles.amount}>{formatMoney(reserved)}</Text>
        <Text style={styles.note}>{formatMoney(plan.remainingCents)}{t(" à réserver.")}</Text>
        {plan.monthlyCents !== null && plan.remainingCents > 0 ? <Text style={styles.copy}>{formatMoney(plan.monthlyCents)}{t(" par contribution · ")}{plan.contributions}{t(" dates restantes")}</Text> : null}
        {plan.overdue ? <Text style={styles.error}>{t("L’échéance de cet objectif est dépassée.")}</Text> : null}
        {dirty ? <Text style={styles.note}>{t("Enregistrez l’objectif avant d’ajuster la réserve.")}</Text> : null}
        <FormField label={t("Montant à ajouter ou libérer en euros")} suffix="€" keyboardType="decimal-pad" value={movement} onChangeText={setMovement} editable={!saving && !dirty} />
        <Button title={t("Ajouter à la réserve")} onPress={() => { void move(1); }} disabled={dirty || saving || movement === ''} />
        <Button title={t("Libérer une réserve")} variant="secondary" onPress={() => { void move(-1); }} disabled={dirty || saving || movement === ''} />
        {movement !== '' ? <Button title={t("Annuler la saisie de réserve")} variant="ghost" onPress={() => setMovement('')} disabled={saving} /> : null}
        <Text accessibilityRole="header" style={styles.title}>{t("Historique de la réserve")}</Text>
        {movements.length === 0 ? <Text style={styles.note}>{t("Aucun mouvement enregistré.")}</Text> : movements.map((entry) => <Text key={entry.id} style={styles.copy}>
          {displayDate(localDateKey(new Date(entry.createdAt)))} · {entry.amountCents > 0 ? '+' : '−'} {formatMoney(Math.abs(entry.amountCents))}
        </Text>)}
      </SurfaceCard> : null}
      <Disclosure title={t("Fonctionnement des provisions")}>
        <Text style={styles.note}>{t("Le repère mensuel répartit le montant restant sur les dates de contribution jusqu’à l’échéance incluse. Ajustez la dernière contribution au montant restant.")}</Text>
        <Text style={styles.note}>{t("Après paiement, enregistrez la dépense puis libérez la réserve correspondante. La réserve n’est pas déduite de la marge.")}</Text>
      </Disclosure>
      {initial ? <Button title={t("Supprimer la provision")} variant="danger" onPress={() => { void remove(); }} disabled={saving} /> : null}
    </ScrollView>
  </ScreenContainer>;
}
