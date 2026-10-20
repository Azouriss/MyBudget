import { t } from '../../i18n/locale';
import { useLanguage } from '../../i18n/useLanguage';
import { useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { usePreventRemove } from 'expo-router/react-navigation';
import { Keyboard, Pressable, ScrollView, StyleSheet, Switch, Text, View, useWindowDimensions } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { ArrowLeft, Check, Trash2 } from 'lucide-react-native';
import { useDatabase } from '../../db/DatabaseProvider';
import { createRecurringRepository } from '../recurring/repository';
import { frequencies, type Frequency } from '../recurring/schedule';
import { monthLabel } from '../../lib/dates';
import type { Category } from '../../db/schema';
import { Button } from '../../components/Button';
import { Disclosure } from '../../components/Disclosure';
import { CategoryIcon } from '../../components/CategoryIcon';
import { FormField } from '../../components/FormField';
import { DateField } from '../../components/DateField';
import { IconButton } from '../../components/IconButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { decorativeIconProps } from '../../components/decorativeIconProps';
import { SegmentedControl } from '../../components/SegmentedControl';
import { useConfirmation } from '../../components/ConfirmationProvider';
import { displayDate, localDateKey, parseFrenchDate } from '../../lib/dates';
import { centsToInput, formatMoney } from '../../lib/money';
import { theme } from '../../theme';
import { useAppStore } from '../../stores/useAppStore';
import { useTransactionRepository } from './hooks';
import type { Transaction, TransactionKind } from './types';
import { formToDraft, transactionFormSchema, type TransactionFormValues } from './validation';
import { ExpenseSubcategoryPicker } from '../categories/ExpenseSubcategoryPicker';
import { detectExpenseSubcategory, getExpenseSubcategory } from '../categories/subcategories';

const kinds = [{ value: 'expense', label: 'Dépense' }, { value: 'income', label: 'Revenu' }] as const;

export function TransactionForm({ existing, categories, salaryMonth, initiallyRecurring = false }: { existing?: Transaction; categories: Category[]; salaryMonth?: string; initiallyRecurring?: boolean }) {
  useLanguage();
  const repository = useTransactionRepository();
  const db = useDatabase();
  const recurringRepository = useMemo(() => createRecurringRepository(db), [db]);
  const [recurring, setRecurring] = useState(initiallyRecurring);
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const navigation = useNavigation();
  const confirm = useConfirmation();
  const invalidate = useAppStore((state) => state.invalidate);
  const setMonth = useAppStore((state) => state.setMonth);
  const showNotice = useAppStore((state) => state.showNotice);
  const [saving, setSaving] = useState(false);
  const [operationError, setOperationError] = useState('');
  const [focusedCategory, setFocusedCategory] = useState<string | null>(null);
  const busy = useRef(false);
  const allowLeave = useRef(false);
  const manualClassification = useRef(!!existing);
  const automaticClassification = useRef(false);
  const defaultExpenseCategory = categories.find((category) => category.kind === 'expense' && category.id === 'other-expense')
    ?? categories.find((category) => category.kind === 'expense');
  const { control, handleSubmit, setValue, watch, formState: { errors, isDirty } } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema), reValidateMode: 'onChange',
    defaultValues: {
      kind: existing?.kind ?? (salaryMonth ? 'income' : 'expense'), amount: existing ? centsToInput(existing.amountCents) : '',
      label: existing?.label ?? (salaryMonth ? t("Salaire net") : ''), categoryId: existing?.categoryId ?? (salaryMonth ? 'salary' : defaultExpenseCategory?.id ?? ''),
      subcategoryId: existing?.subcategoryId ?? null,
      date: displayDate(existing?.occurredOn ?? (salaryMonth && salaryMonth !== localDateKey().slice(0, 7) ? `${salaryMonth}-01` : localDateKey())),
    },
  });
  const kind = watch('kind');
  const categoryId = watch('categoryId');
  const subcategory = getExpenseSubcategory(watch('subcategoryId'));
  const isSalary = kind === 'income' && categoryId === 'salary';
  const { width, fontScale } = useWindowDimensions();
  const columns = width < 360 || fontScale >= theme.layout.stackedFontScale ? 2 : 3;
  const categoryWidth = (Math.min(width, theme.layout.contentMaxWidth) - theme.layout.gutter * 2 - theme.spacing.sm * (columns - 1)) / columns;

  usePreventRemove(isDirty || recurring !== initiallyRecurring || (recurring && frequency !== 'monthly'), ({ data }) => {
    if (allowLeave.current) { navigation.dispatch(data.action); return; }
    if (busy.current) return;
    void confirm({ title: t("Quitter sans enregistrer ?"),
      message: t("Les modifications de ce formulaire seront perdues."), confirmLabel: t("Quitter") })
      .then((confirmed) => { if (confirmed) navigation.dispatch(data.action); });
  });

  function back() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  function changeKind(next: TransactionKind) {
    manualClassification.current = !!existing;
    automaticClassification.current = false;
    setValue('kind', next, { shouldDirty: true });
    setValue('categoryId', (next === 'expense' ? defaultExpenseCategory : categories.find((category) => category.kind === next))?.id ?? '',
      { shouldDirty: true, shouldValidate: true });
    setValue('subcategoryId', null, { shouldDirty: true, shouldValidate: true });
  }

  function classifyLabel(label: string) {
    if (kind !== 'expense' || manualClassification.current) return;
    const suggestion = detectExpenseSubcategory(label, categories.filter((category) => category.kind === 'expense'));
    if (suggestion || automaticClassification.current) {
      setValue('categoryId', suggestion?.categoryId ?? defaultExpenseCategory?.id ?? '',
        { shouldDirty: true, shouldValidate: true });
      setValue('subcategoryId', suggestion?.id ?? null, { shouldDirty: true, shouldValidate: true });
    }
    automaticClassification.current = !!suggestion;
  }

  async function save(values: TransactionFormValues) {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setOperationError('');
    Keyboard.dismiss();
    try {
      const draft = formToDraft(values);
      if (salaryMonth) {
        if (draft.occurredOn.slice(0, 7) !== salaryMonth) {
          throw new Error(`Choisissez une date en ${monthLabel(salaryMonth)}.`);
        }
        repository.saveSalary(salaryMonth, draft);
      } else if (recurring && kind === 'expense' && !existing?.recurringExpenseId) {
        recurringRepository.saveTransaction(draft, frequency, existing?.id);
      } else if (existing) repository.update(existing.id, draft);
      else repository.create(draft);
      setMonth(parseFrenchDate(values.date).slice(0, 7));
      invalidate();
      allowLeave.current = true;
      showNotice(existing ? 'Transaction modifiée' : kind === 'expense' ? 'Dépense enregistrée' : 'Revenu enregistré');
      back();
    } catch {
      setOperationError(salaryMonth && parseFrenchDate(values.date).slice(0, 7) !== salaryMonth
        ? `Choisissez une date en ${monthLabel(salaryMonth)}.` : 'Impossible d’enregistrer. Votre saisie est conservée. Réessayez.');
      busy.current = false;
      setSaving(false);
    }
  }

  async function remove() {
    if (!existing || busy.current) return;
    const confirmed = await confirm({ title: t("Supprimer cette transaction ?"),
      message: t("{0} · {1} · {2}. Cette suppression est définitive.{3}", [existing.label, formatMoney(existing.amountCents), displayDate(existing.occurredOn), existing.recurringExpenseId ? t(" La récurrence reste active pour les prochaines échéances.") : '']),
      confirmLabel: t("Supprimer"), destructive: true });
    if (!confirmed || busy.current) return;
    busy.current = true;
    setSaving(true);
    setOperationError('');
    try {
      repository.remove(existing.id);
      invalidate();
      allowLeave.current = true;
      showNotice('Transaction supprimée');
      back();
    } catch {
      setOperationError('Impossible de supprimer cette transaction. Vos données sont conservées.');
      busy.current = false;
      setSaving(false);
    }
  }

  return <ScreenContainer inTabs={false} footer={<Button
    title={saving ? t("Enregistrement…") : existing ? t("Enregistrer les modifications") : kind === 'expense' ? t("Enregistrer la dépense") : t("Enregistrer le revenu")}
    onPress={() => { void handleSubmit(save)(); }} loading={saving} />}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <IconButton icon={ArrowLeft} label={t("Fermer le formulaire")} onPress={back} disabled={saving} />
        <Text accessibilityRole="header" style={styles.headerTitle}>{existing ? t("Modifier la transaction") : kind === 'expense' ? t("Ajouter une dépense") : t("Ajouter un revenu")}</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.fields}>
        <SegmentedControl label={t("Type de transaction")} options={kinds} value={kind} onChange={changeKind} disabled={saving || !!salaryMonth || !!existing?.recurringExpenseId} />
        {salaryMonth ? <Text style={styles.label}>{t("Salaire net · ")}{monthLabel(salaryMonth)}</Text> : null}
        <Controller control={control} name="amount" render={({ field: { ref, value, onChange, onBlur } }) =>
          <FormField ref={ref} label={isSalary ? t("Salaire NET en euros") : t("Montant en euros")} value={value} onChangeText={onChange} onBlur={onBlur}
            amount suffix="€" placeholder="0,00" keyboardType="decimal-pad" editable={!saving} error={errors.amount?.message} />
        } />
        <Controller control={control} name="label" render={({ field: { ref, value, onChange, onBlur } }) =>
          <FormField ref={ref} label={t("Libellé")} placeholder={kind === 'expense' ? t("Ex. Courses de la semaine") : t("Ex. Salaire")}
            value={value} onChangeText={(text) => { onChange(text); classifyLabel(text); }} onBlur={onBlur}
            maxLength={80} editable={!saving} error={errors.label?.message} returnKeyType="done"
            onSubmitEditing={() => { void handleSubmit(save)(); }} />
        } />
        {automaticClassification.current && subcategory ? <Text accessibilityLiveRegion="polite" style={styles.help}>
          {t("Suggestion : {0}", [t(subcategory.label)])}
        </Text> : null}
        <View style={styles.categoryField}>
          <Text style={styles.label}>{t("Catégorie")}</Text>
          <Controller control={control} name="categoryId" render={({ field: { value, onChange } }) =>
            <View accessibilityRole="radiogroup" accessibilityLabel={t("Catégorie")} style={styles.categories}>
              {categories.filter((category) => category.kind === kind && (!salaryMonth || category.id === 'salary')).map((category) => <Pressable cssInterop={false}
                key={category.id} accessibilityRole="radio" accessibilityLabel={t(category.label)}
                aria-checked={value === category.id}
                accessibilityState={{ checked: value === category.id, disabled: saving }} disabled={saving}
                onPress={() => {
                  manualClassification.current = true;
                  automaticClassification.current = false;
                  if (value !== category.id) setValue('subcategoryId', null, { shouldDirty: true, shouldValidate: true });
                  onChange(category.id);
                }} onFocus={() => setFocusedCategory(category.id)} onBlur={() => setFocusedCategory(null)}
                style={({ pressed }) => [styles.category, {
                  width: categoryWidth,
                  backgroundColor: value === category.id || pressed ? theme.colors.primaryLight : theme.colors.surface,
                  borderColor: focusedCategory === category.id ? theme.colors.focusRing
                    : value === category.id ? theme.colors.primaryDark : theme.colors.controlBorder,
                }]}>
                <CategoryIcon category={category} size={theme.spacing['3xl']} />
                <Text style={styles.categoryLabel}>{t(category.label)}</Text>
                {value === category.id ? <View style={styles.categoryCheck}><Check color={theme.colors.primaryDark} size={theme.size.icon.small} {...decorativeIconProps} /></View> : null}
              </Pressable>)}
            </View>
          } />
          {errors.categoryId ? <Text accessibilityLiveRegion="polite" style={styles.error}>{errors.categoryId.message}</Text> : null}
          {kind === 'expense' ? <Controller control={control} name="subcategoryId" render={({ field: { value } }) =>
            <ExpenseSubcategoryPicker key={categoryId} categories={categories} categoryId={categoryId} value={value}
              disabled={saving} error={errors.subcategoryId?.message}
              onChange={(parentId, subcategoryId) => {
                manualClassification.current = true;
                automaticClassification.current = false;
                setValue('categoryId', parentId, { shouldDirty: true, shouldValidate: true });
                setValue('subcategoryId', subcategoryId, { shouldDirty: true, shouldValidate: true });
              }} />
          } /> : null}
        </View>
        <Controller control={control} name="date" render={({ field: { ref, value, onChange, onBlur } }) =>
          <DateField ref={ref} label={t("Date · JJ/MM/AAAA")} value={value}
            onChangeText={onChange} onBlur={onBlur} editable={!saving} error={errors.date?.message} />
        } />
        {kind === 'expense' && !existing?.recurringExpenseId ? <View style={styles.categoryField}>
          <View style={styles.recurringRow}><Text style={styles.label}>{t("Dépense récurrente")}</Text>
            <Switch accessibilityLabel={t("Dépense récurrente")} value={recurring} onValueChange={setRecurring} disabled={saving}
              thumbColor={theme.colors.surface} trackColor={{ false: theme.colors.controlBorder, true: theme.colors.primaryDark }} />
          </View>
          {recurring ? <>
            <SegmentedControl label={t("Répéter chaque")} options={frequencies} value={frequency} onChange={setFrequency} disabled={saving} />
            <Text style={styles.help}>{t("Première échéance : date choisie.")}</Text>
            <Disclosure title={t("Fonctionnement des récurrences")}>
              <Text style={styles.help}>{t("Les prochaines échéances sont prévues, puis enregistrées à leur date lors de l’ouverture de l’app. Jour absent du mois : dernier jour du mois.")}</Text>
            </Disclosure>
          </> : null}
        </View> : null}
        {existing?.recurringExpenseId ? <View style={styles.categoryField}>
          <Text style={styles.help}>{t("Cette modification concerne cette échéance uniquement.")}</Text>
          <Button title={t("Gérer cette récurrence")} variant="secondary" disabled={saving} onPress={() => router.push({ pathname: '/recurring-expense', params: { id: existing.recurringExpenseId! } })} />
        </View> : null}
        {operationError ? <View style={styles.errorCard}><Text accessibilityRole="alert" style={styles.error}>{t(operationError)}</Text></View> : null}
        {existing ? <View style={styles.delete}><Button title={t("Supprimer la transaction")} onPress={() => { void remove(); }} variant="danger" icon={Trash2} disabled={saving} /></View> : null}
      </View>
    </ScrollView>
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: theme.layout.gutter, paddingBottom: theme.spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingTop: theme.spacing.sm, marginBottom: theme.spacing.lg },
  headerTitle: { ...theme.typography.body, fontFamily: theme.fontFamily.semibold, color: theme.colors.textPrimary, flex: 1, textAlign: 'center' },
  headerSpacer: { width: theme.size.iconButton },
  fields: { gap: theme.spacing.lg },
  label: { ...theme.typography.bodySmall, fontFamily: theme.fontFamily.medium, color: theme.colors.textPrimary },
  recurringRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md },
  help: { ...theme.typography.bodySmall, color: theme.colors.textSubtle },
  categoryField: { gap: theme.spacing.md },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  category: { minHeight: 96, alignItems: 'center', justifyContent: 'center',
    gap: theme.spacing.xs, padding: theme.spacing.sm, borderWidth: theme.size.borderWidth, borderRadius: theme.radius.large, maxWidth: '100%' },
  categoryLabel: { ...theme.typography.bodySmall, color: theme.colors.textPrimary, textAlign: 'center' },
  categoryCheck: { position: 'absolute', top: theme.spacing.xs, right: theme.spacing.xs },
  error: { ...theme.typography.bodySmall, color: theme.colors.dangerText },
  errorCard: { padding: theme.spacing.lg, backgroundColor: theme.colors.dangerBackground, borderRadius: theme.radius.medium },
  delete: { marginTop: theme.spacing.xl },
});
