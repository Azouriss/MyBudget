import { t } from '../src/i18n/locale';
import { useLanguage } from '../src/i18n/useLanguage';
import { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useDatabase } from '../src/db/DatabaseProvider';
import type { Category } from '../src/db/schema';
import { SettingsPage, settingsStyles as styles } from '../src/components/SettingsPage';
import { Button } from '../src/components/Button';
import { FormField } from '../src/components/FormField';
import { SegmentedControl } from '../src/components/SegmentedControl';
import { useConfirmation } from '../src/components/ConfirmationProvider';
import { createRecurringRepository, catchUpExpenses, type RecurringExpense } from '../src/features/recurring/repository';
import { createTransactionRepository } from '../src/features/transactions/repository';
import { occurrenceOn, frequencies, tomorrow, type Frequency } from '../src/features/recurring/schedule';
import { centsToInput, parseAmountToCents } from '../src/lib/money';
import { displayDate, parseFrenchDate, localDateKey } from '../src/lib/dates';
import { useAppStore } from '../src/stores/useAppStore';
import { ExpenseSubcategoryPicker } from '../src/features/categories/ExpenseSubcategoryPicker';

type Values = { label: string; amount: string; categoryId: string; subcategoryId: string | null; frequency: Frequency; date: string };
export default function RecurringExpenseScreen() {
  useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDatabase();
  const confirm = useConfirmation();
  const navigation = useNavigation();
  const [rule, setRule] = useState<RecurringExpense | null>(null);
  const [initial, setInitial] = useState<Values | null>(null);
  const [values, setValues] = useState<Values>({ label: '', amount: '', categoryId: '', subcategoryId: null, frequency: 'monthly', date: '' });
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const allowLeave = useRef(false);
  useEffect(() => {
    try {
      const existing = createRecurringRepository(db).find(id);
      if (!existing) throw new Error();
      const next = existing.active ? occurrenceOn(existing.startOn, existing.frequency, existing.nextIndex) : null;
      const value = { label: existing.label, amount: centsToInput(existing.amountCents), categoryId: existing.categoryId,
        subcategoryId: existing.subcategoryId,
        frequency: existing.frequency, date: displayDate(next && next > localDateKey() ? next : tomorrow()) };
      setRule(existing); setValues(value); setInitial(value);
      setCategories(createTransactionRepository(db).categories().filter((c) => c.kind === 'expense'));
    } catch { setError('Récurrence indisponible. Rouvrez cet écran.'); }
  }, [id, db]);
  const dirty = !!initial && JSON.stringify(initial) !== JSON.stringify(values);
  usePreventRemove(dirty, ({ data }) => {
    if (allowLeave.current) navigation.dispatch(data.action);
    else if (!busy.current) void confirm({ title: t("Quitter sans enregistrer ?"), message: t("Les changements de cette récurrence seront perdus."), confirmLabel: t("Quitter") })
      .then((ok) => { if (ok) navigation.dispatch(data.action); });
  });
  function change<K extends keyof Values>(key: K, value: Values[K]) { setValues((old) => ({ ...old, [key]: value })); }
  function back() { if (router.canGoBack()) router.back(); else router.replace('/recurring'); }
  async function save() {
    if (!rule || busy.current) return;
    let nextOn: string;
    let amountCents: number;
    try {
      nextOn = parseFrenchDate(values.date);
      if (nextOn <= localDateKey()) throw new Error();
      amountCents = parseAmountToCents(values.amount);
      if (!values.label.trim() || values.label.trim().length > 80 || !values.categoryId) throw new Error();
    } catch { setError('Vérifiez le libellé, un montant positif et une prochaine date future au format JJ/MM/AAAA.'); return; }
    busy.current = true; setSaving(true); setError('');
    try {
      await catchUpExpenses(db);
      createRecurringRepository(db).update(rule.id, { kind: 'expense', label: values.label, amountCents,
        categoryId: values.categoryId, subcategoryId: values.subcategoryId, occurredOn: nextOn }, values.frequency, nextOn);
      useAppStore.getState().invalidate();
      useAppStore.getState().showNotice(rule.active ? 'Récurrence modifiée' : 'Récurrence reprise');
      allowLeave.current = true; back();
    } catch { setError('Impossible d’enregistrer cette récurrence. Votre saisie est conservée.'); busy.current = false; setSaving(false); }
  }
  async function stop() {
    if (!rule || busy.current) return;
    if (!await confirm({ title: t("Arrêter cette récurrence ?"), message: t("Les dépenses déjà enregistrées restent dans votre historique. Les prochaines échéances ne seront plus ajoutées."), confirmLabel: t("Arrêter la récurrence") })) return;
    busy.current = true; setSaving(true);
    try {
      await catchUpExpenses(db);
      createRecurringRepository(db).stop(rule.id);
      useAppStore.getState().invalidate(); useAppStore.getState().showNotice('Récurrence arrêtée');
      allowLeave.current = true; back();
    } catch { setError('Impossible d’arrêter cette récurrence. Réessayez.'); busy.current = false; setSaving(false); }
  }
  return <SettingsPage title={t("Gérer la récurrence")} footer={rule ? <Button title={rule.active ? t("Enregistrer la récurrence") : t("Reprendre la récurrence")} onPress={() => { void save(); }} loading={saving} /> : undefined}>
    <Text style={styles.copy}>{rule?.active ? t("Modifie les prochaines échéances. Historique conservé.") : t("Récurrence arrêtée. Choisissez une date pour la reprendre.")}</Text>
    <FormField label={t("Libellé de la récurrence")} value={values.label} onChangeText={(v) => change('label', v)} maxLength={80} editable={!!rule && !saving} />
    <FormField label={t("Montant récurrent en euros")} value={values.amount} onChangeText={(v) => change('amount', v)} keyboardType="decimal-pad" suffix="€" editable={!!rule && !saving} />
    <Text style={styles.label}>{t("Catégorie")}</Text>
    {categories.map((c) => <Button key={c.id} title={t(c.label)} variant={values.categoryId === c.id ? 'primary' : 'secondary'} disabled={saving}
      onPress={() => setValues((old) => ({ ...old, categoryId: c.id, subcategoryId: old.categoryId === c.id ? old.subcategoryId : null }))} />)}
    {rule ? <ExpenseSubcategoryPicker key={values.categoryId} categories={categories} categoryId={values.categoryId}
      value={values.subcategoryId} disabled={saving}
      onChange={(categoryId, subcategoryId) => setValues((old) => ({ ...old, categoryId, subcategoryId }))} /> : null}
    <SegmentedControl label={t("Répéter chaque")} options={frequencies} value={values.frequency} onChange={(v) => change('frequency', v)} disabled={!rule || saving} />
    <FormField label={t("Prochaine échéance · JJ/MM/AAAA")} value={values.date} onChangeText={(v) => change('date', v)} maxLength={10} editable={!!rule && !saving} />
    <Text style={styles.copy}>{t("Jour absent du mois : échéance au dernier jour.")}</Text>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{t(error)}</Text> : null}
    {rule?.active ? <Button title={t("Arrêter la récurrence")} variant="danger" onPress={() => { void stop(); }} disabled={saving} /> : null}
  </SettingsPage>;
}
