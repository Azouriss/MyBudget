import { t } from '../src/i18n/locale';
import { useLanguage } from '../src/i18n/useLanguage';
import { useState } from 'react';
import { View } from 'react-native';
import { SettingsPage, settingsStyles as s } from '../src/components/SettingsPage';
import { SurfaceCard } from '../src/components/SurfaceCard';
import { Button } from '../src/components/Button';
import { FormField } from '../src/components/FormField';
import { DateField } from '../src/components/DateField';
import { SegmentedControl } from '../src/components/SegmentedControl';
import { useConfirmation } from '../src/components/ConfirmationProvider';
import { useDatabase } from '../src/db/DatabaseProvider';
import { createEntryToolsRepository } from '../src/features/entry-tools/repository';
import { createTransactionRepository } from '../src/features/transactions/repository';
import { OperationError, QueryFeedback, useLocalQuery, useOperation, useDraftGuard } from '../src/features/entry-tools/ui';
import { centsToInput, formatMoney, parseAmountToCents } from '../src/lib/money';
import { displayDate, localDateKey, parseFrenchDate } from '../src/lib/dates';
import { ExpenseSubcategoryPicker } from '../src/features/categories/ExpenseSubcategoryPicker';

export default function QuickEntryScreen() {
  useLanguage();
  const db = useDatabase(), tools = createEntryToolsRepository(db), entries = createTransactionRepository(db);
  const query = useLocalQuery(() => ({ templates: tools.templates(), categories: entries.categories() }));
  const op = useOperation(), confirm = useConfirmation();
  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const [label, setLabel] = useState(''), [amount, setAmount] = useState(''), [categoryId, setCategory] = useState('food');
  const [subcategoryId, setSubcategory] = useState<string | null>(null);
  const [date, setDate] = useState(displayDate(localDateKey()));
  useDraftGuard(!!label || !!amount, op.busy);
  const draft = () => ({ kind, label, amountCents: parseAmountToCents(amount), categoryId, subcategoryId, occurredOn: parseFrenchDate(date) });
  return <SettingsPage title={t("Favoris et saisie express")}>
    {!query.data ? <QueryFeedback {...query} /> : <>
      {query.data.templates.map((template) => <SurfaceCard key={template.id} style={s.card}>
        <Button title={`${template.label} · ${formatMoney(template.amountCents)}`} variant="secondary" disabled={op.busy} onPress={() => {
          setLabel(template.label); setAmount(centsToInput(template.amountCents)); setKind(template.kind); setCategory(template.categoryId); setSubcategory(template.subcategoryId); setDate(displayDate(localDateKey()));
        }} />
        <Button title={t("Supprimer le favori {0}", [template.label])} variant="ghost" disabled={op.busy} onPress={() => void op.run(async () => {
          if (await confirm({ title: t("Supprimer ce favori ?"), message: t("Les transactions enregistrées sont conservées."), confirmLabel: t("Supprimer"), destructive: true })) tools.removeTemplate(template.id);
        })} />
      </SurfaceCard>)}
      <SegmentedControl label={t("Type")} value={kind} options={[{ value: 'expense', label: t("Dépense") }, { value: 'income', label: t("Revenu") }]} disabled={op.busy}
        onChange={(v) => { setKind(v); setCategory(v === 'expense' ? 'food' : 'other-income'); setSubcategory(null); }} />
      <FormField label={t("Libellé")} value={label} onChangeText={setLabel} maxLength={80} editable={!op.busy} />
      <FormField label={t("Montant en euros")} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" editable={!op.busy} />
      <View style={s.card}>{query.data.categories.filter((c) => c.kind === kind).map((c) => <Button key={c.id} title={t(c.label)} variant={categoryId === c.id ? 'primary' : 'secondary'} disabled={op.busy} onPress={() => { setCategory(c.id); setSubcategory(null); }} />)}</View>
      {kind === 'expense' ? <ExpenseSubcategoryPicker categories={query.data.categories} categoryId={categoryId} value={subcategoryId} disabled={op.busy}
        onChange={(category, sub) => { setCategory(category); setSubcategory(sub); }} /> : null}
      <DateField label={t("Date · JJ/MM/AAAA")} value={date} onChangeText={setDate} editable={!op.busy} />
      <Button title={t("Enregistrer la transaction")} loading={op.busy} disabled={!amount || !label} onPress={() => void op.run(() => { entries.create(draft()); setAmount(''); setLabel(''); }, t("Transaction enregistrée"))} />
      <Button title={t("Conserver comme favori")} variant="secondary" disabled={op.busy || !amount || !label} onPress={() => void op.run(() => tools.saveTemplate(draft()), t("Favori enregistré"))} />
    </>}
    <OperationError message={op.error} />
  </SettingsPage>;
}
