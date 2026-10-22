import { t } from '../../i18n/locale';
import { useLanguage } from '../../i18n/useLanguage';
import { useRef, useState } from 'react';
import { router, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { ArrowLeft, Trash2 } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { FormField } from '../../components/FormField';
import { IconButton } from '../../components/IconButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useConfirmation } from '../../components/ConfirmationProvider';
import { centsToInput, formatMoney } from '../../lib/money';
import { shortDate } from '../../lib/dates';
import { useBudgetPeriod } from '../transactions/hooks';
import { monthLabel } from '../../lib/dates';
import { budgetEnvelopeExcess } from '../../lib/budgets';
import { useAppStore } from '../../stores/useAppStore';
import { theme } from '../../theme';
import { useBudgetRepository } from './hooks';
import { parseBudgetAmount } from './validation';

export function BudgetForm({ month, categoryId, label, existingAmount, defaultAmount }: {
  month: string; categoryId?: string; label: string; existingAmount?: number; defaultAmount?: number;
}) {
  useLanguage();
  const period = useBudgetPeriod(month);
  const repository = useBudgetRepository();
  const navigation = useNavigation();
  const confirm = useConfirmation();
  const invalidate = useAppStore((state) => state.invalidate);
  const showNotice = useAppStore((state) => state.showNotice);
  const initialAmount = existingAmount ?? defaultAmount;
  const initial = initialAmount === undefined ? '' : centsToInput(initialAmount);
  const [amount, setAmount] = useState(initial);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const allowLeave = useRef(false);

  usePreventRemove(amount !== initial, ({ data }) => {
    if (allowLeave.current) { navigation.dispatch(data.action); return; }
    if (busy.current) return;
    void confirm({ title: t("Quitter sans enregistrer ?"), message: t("Le montant saisi ne sera pas enregistré."), confirmLabel: t("Quitter") })
      .then((accepted) => { if (accepted) navigation.dispatch(data.action); });
  });
  function back() {
    if (router.canGoBack()) router.back();
    else router.replace('/budgets');
  }
  function complete(message: string) {
    invalidate();
    showNotice(message);
    allowLeave.current = true;
    back();
  }
  async function save() {
    if (busy.current) return;
    let amountCents: number;
    try { amountCents = parseBudgetAmount(amount); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Montant invalide.'); return; }
    busy.current = true;
    setSaving(true);
    setError('');
    try {
      const current = repository.forMonth(month);
      const excess = budgetEnvelopeExcess(current, { amountCents, categoryId });
      if (excess > 0) {
        const accepted = await confirm({ title: t("Limites supérieures au budget global"),
          message: t("Les enveloppes dépassent le budget global de {0}. Voulez-vous conserver cette répartition ? Aucun montant ne sera ajusté automatiquement.", [formatMoney(excess)]),
          confirmLabel: t("Conserver la répartition") });
        if (!accepted) { busy.current = false; setSaving(false); return; }
      }
      if (categoryId) repository.setCategory({ month, amountCents }, categoryId);
      else repository.setMonthly({ month, amountCents });
      complete(t("Budget enregistré"));
    } catch {
      setError('Impossible d’enregistrer le budget. Votre saisie est conservée.');
      busy.current = false;
      setSaving(false);
    }
  }
  async function remove() {
    if (busy.current) return;
    const accepted = await confirm({ title: t("Supprimer cette limite ?"),
      message: categoryId ? t("Vos transactions et le budget global seront conservés.")
        : 'Vos transactions et les limites par catégorie seront conservées. Le salaire net saisi pour ce mois sera utilisé par défaut, s’il est renseigné.', confirmLabel: t("Supprimer"), destructive: true });
    if (!accepted || busy.current) return;
    busy.current = true;
    setSaving(true);
    try {
      if (categoryId) repository.removeCategory(month, categoryId);
      else repository.removeMonthly(month);
      complete(t("Limite supprimée"));
    } catch {
      setError('Impossible de supprimer cette limite. Vos données sont conservées.');
      busy.current = false;
      setSaving(false);
    }
  }
  return <ScreenContainer inTabs={false} footer={<Button title={t("Enregistrer le budget")} onPress={() => { void save(); }} loading={saving} />}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
      <View style={styles.header}><IconButton icon={ArrowLeft} label={t("Fermer le budget")} onPress={back} disabled={saving} />
        <Text accessibilityRole="header" style={styles.headerTitle}>{t("Mon budget")}</Text><View style={styles.spacer} /></View>
      <View style={styles.intro}>
        <Text style={styles.period}>{monthLabel(month)}</Text>
        <Text style={styles.note}>{shortDate(period.start)} → {period.end === '2100-01-01' ? '01/01/2100' : shortDate(period.end)}{t(" · fin exclue")}</Text>
        <Text style={styles.title}>{t(label)}</Text>
      </View>
      <FormField label={t("Budget en euros")} amount suffix="€" placeholder="0,00" keyboardType="decimal-pad"
        value={amount} onChangeText={(value) => { setAmount(value); setError(''); }} error={error} editable={!saving}
        onSubmitEditing={() => { void save(); }} returnKeyType="done" />
      <Text style={styles.note}>{t("0 € : aucune dépense autorisée.")}</Text>
      {!categoryId ? <Text style={styles.note}>{t("Sans limite, le salaire net du mois sert de budget.")}</Text> : null}
      {existingAmount !== undefined ? <Button title={t("Supprimer cette limite")} variant="danger" icon={Trash2}
        onPress={() => { void remove(); }} disabled={saving} /> : null}
    </ScrollView>
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: theme.layout.gutter, paddingBottom: theme.spacing.xl, gap: theme.spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingTop: theme.spacing.sm },
  headerTitle: { ...theme.typography.body, fontFamily: theme.fontFamily.semibold, color: theme.colors.textPrimary, flex: 1, textAlign: 'center' },
  spacer: { width: theme.size.iconButton },
  intro: { gap: theme.spacing.sm },
  period: { ...theme.typography.bodySmall, color: theme.colors.textSubtle, textTransform: 'capitalize' },
  title: { ...theme.typography.editorial, color: theme.colors.textPrimary },
  note: { ...theme.typography.bodySmall, color: theme.colors.textSubtle },
});
