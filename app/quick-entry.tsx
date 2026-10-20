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
  const db = useDatabase(), tools = createEntryToolsRepository(db), entries = createTransactionRepository(db);
  const query = useLocalQuery(() => ({ templates: tools.templates(), categories: entries.categories() }));
  const op = useOperation(), confirm = useConfirmation();
  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const [label, setLabel] = useState(''), [amount, setAmount] = useState(''), [categoryId, setCategory] = useState('food');
  const [subcategoryId, setSubcategory] = useState<string | null>(null);
  const [date, setDate] = useState(displayDate(localDateKey()));
  useDraftGuard(!!label || !!amount, op.busy);
  const draft = () => ({ kind, label, amountCents: parseAmountToCents(amount), categoryId, subcategoryId, occurredOn: parseFrenchDate(date) });
  return <SettingsPage title="Favoris et saisie express">
    {!query.data ? <QueryFeedback {...query} /> : <>
      {query.data.templates.map((t) => <SurfaceCard key={t.id} style={s.card}>
        <Button title={`${t.label} · ${formatMoney(t.amountCents)}`} variant="secondary" disabled={op.busy} onPress={() => {
          setLabel(t.label); setAmount(centsToInput(t.amountCents)); setKind(t.kind); setCategory(t.categoryId); setSubcategory(t.subcategoryId); setDate(displayDate(localDateKey()));
        }} />
        <Button title={`Supprimer le favori ${t.label}`} variant="ghost" disabled={op.busy} onPress={() => void op.run(async () => {
          if (await confirm({ title: 'Supprimer ce favori ?', message: 'Les transactions enregistrées sont conservées.', confirmLabel: 'Supprimer', destructive: true })) tools.removeTemplate(t.id);
        })} />
      </SurfaceCard>)}
      <SegmentedControl label="Type" value={kind} options={[{ value: 'expense', label: 'Dépense' }, { value: 'income', label: 'Revenu' }]} disabled={op.busy}
        onChange={(v) => { setKind(v); setCategory(v === 'expense' ? 'food' : 'other-income'); setSubcategory(null); }} />
      <FormField label="Libellé" value={label} onChangeText={setLabel} maxLength={80} editable={!op.busy} />
      <FormField label="Montant en euros" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" editable={!op.busy} />
      <View style={s.card}>{query.data.categories.filter((c) => c.kind === kind).map((c) => <Button key={c.id} title={c.label} variant={categoryId === c.id ? 'primary' : 'secondary'} disabled={op.busy} onPress={() => { setCategory(c.id); setSubcategory(null); }} />)}</View>
      {kind === 'expense' ? <ExpenseSubcategoryPicker categories={query.data.categories} categoryId={categoryId} value={subcategoryId} disabled={op.busy}
        onChange={(category, sub) => { setCategory(category); setSubcategory(sub); }} /> : null}
      <DateField label="Date · JJ/MM/AAAA" value={date} onChangeText={setDate} editable={!op.busy} />
      <Button title="Enregistrer la transaction" loading={op.busy} disabled={!amount || !label} onPress={() => void op.run(() => { entries.create(draft()); setAmount(''); setLabel(''); }, 'Transaction enregistrée')} />
      <Button title="Conserver comme favori" variant="secondary" disabled={op.busy || !amount || !label} onPress={() => void op.run(() => tools.saveTemplate(draft()), 'Favori enregistré')} />
    </>}
    <OperationError message={op.error} />
  </SettingsPage>;
}
