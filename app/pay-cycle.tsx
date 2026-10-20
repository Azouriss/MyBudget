import { t } from '../src/i18n/locale';
import { useLanguage } from '../src/i18n/useLanguage';
import { useState } from 'react';
import { Text } from 'react-native';
import { SettingsPage, settingsStyles as s } from '../src/components/SettingsPage';
import { SurfaceCard } from '../src/components/SurfaceCard';
import { Button } from '../src/components/Button';
import { Disclosure } from '../src/components/Disclosure';
import { FormField } from '../src/components/FormField';
import { DateField } from '../src/components/DateField';
import { useConfirmation } from '../src/components/ConfirmationProvider';
import { useDatabase } from '../src/db/DatabaseProvider';
import { createCycleRepository, cycleBounds } from '../src/features/planning/repository';
import { createPaydayRepository } from '../src/features/payday/repository';
import { parseBudgetAmount } from '../src/features/budgets/validation';
import { centsToInput, formatMoney } from '../src/lib/money';
import { displayDate, localDateKey, parseFrenchDate } from '../src/lib/dates';
import { OperationError, QueryFeedback, useLocalQuery, useOperation, useDraftGuard } from '../src/features/entry-tools/ui';

export default function PayCycleScreen() {
  useLanguage();
  const db = useDatabase(), repository = createCycleRepository(db), op = useOperation(), confirm = useConfirmation();
  const query = useLocalQuery(() => repository.all().map((cycle) => repository.summary(cycle.id)));
  const [id, setId] = useState<string | undefined>(), [start, setStart] = useState(''), [end, setEnd] = useState(''), [amount, setAmount] = useState('');
  useDraftGuard(!!start || !!end || !!amount, op.busy);
  return <SettingsPage title={t("De paie à paie")}>
    <Text style={s.copy}>{t("Un budget de période, indépendant du budget mensuel.")}</Text>
    <Button title={t("Préparer la période actuelle")} variant="secondary" disabled={op.busy} onPress={() => void op.run(() => {
      const day = createPaydayRepository(db).settings()?.day;
      if (!day) throw new Error('Définissez votre jour de paie dans les paramètres.');
      const bounds = cycleBounds(localDateKey(), day); setStart(displayDate(bounds.startOn)); setEnd(displayDate(bounds.endOn)); setId(undefined); setAmount('');
    })} />
    <DateField label={t("Début inclus · JJ/MM/AAAA")} value={start} onChangeText={setStart} editable={!op.busy} />
    <DateField label={t("Fin exclue (prochaine paie) · JJ/MM/AAAA")} value={end} onChangeText={setEnd} editable={!op.busy} />
    <FormField label={t("Budget de cette période en euros")} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" editable={!op.busy} />
    <Button title={id ? t("Modifier cette période") : t("Créer cette période")} disabled={op.busy} onPress={() => void op.run(() => {
      repository.save({ startOn: parseFrenchDate(start), endOn: parseFrenchDate(end), budgetCents: parseBudgetAmount(amount) }, id);
      setId(undefined); setAmount(''); setStart(''); setEnd('');
    }, t("Budget de période enregistré"))} />
    <OperationError message={op.error} />
    {!query.data ? <QueryFeedback {...query} /> : query.data.length === 0 ? <Text style={s.copy}>{t("Aucune période créée.")}</Text> : query.data.map((r) => <SurfaceCard key={r.cycle.id} style={s.card}>
      <Text style={s.label}>{displayDate(r.cycle.startOn)} → {displayDate(r.cycle.endOn)}{t(" (fin exclue)")}</Text>
      <Text style={s.copy}>{t("Budget : ")}{formatMoney(r.cycle.budgetCents)}{t(" · Dépenses saisies : ")}{formatMoney(r.expenseCents)}{t(" · Charges prévues : ")}{formatMoney(r.plannedCents)}</Text>
      <Text style={s.label}>{t("Marge budgétaire : ")}{formatMoney(r.marginCents)}</Text>
      <Text style={s.copy}>{t("Revenus enregistrés : ")}{formatMoney(r.incomeCents)}</Text>
      <Text style={s.copy}>{t("Marge indicative, hors solde bancaire et dépenses variables à venir.")}</Text>
      {r.planned.map((p, i) => <Text key={i} style={s.copy}>{displayDate(p.occurredOn)} · {p.label} · {formatMoney(p.amountCents)}{t(" prévu")}</Text>)}
      <Button title={t("Modifier cette période")} variant="secondary" disabled={op.busy} onPress={() => { setId(r.cycle.id); setStart(displayDate(r.cycle.startOn)); setEnd(displayDate(r.cycle.endOn)); setAmount(centsToInput(r.cycle.budgetCents)); }} />
      <Button title={t("Supprimer ce budget de période")} variant="ghost" disabled={op.busy} onPress={() => void op.run(async () => {
        if (await confirm({ title: t("Supprimer cette période ?"), message: t("Vos transactions et budgets mensuels sont conservés."), confirmLabel: t("Supprimer"), destructive: true })) repository.remove(r.cycle.id);
      })} />
    </SurfaceCard>)}
    <Disclosure title={t("Détail du budget de période")}>
      <Text style={s.copy}>{t("Marge = budget de la période moins dépenses saisies et charges prévues. Aucun salaire attendu n’est ajouté.")}</Text>
      <Text style={s.copy}>{t("La date de début est incluse, celle de la prochaine paie est exclue. Les budgets mensuels restent indépendants.")}</Text>
    </Disclosure>
  </SettingsPage>;
}
