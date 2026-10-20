import { t } from '../../i18n/locale';
import { useLanguage } from '../../i18n/useLanguage';
import { useState } from 'react';
import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { AppHeader } from '../../components/AppHeader';
import { Button } from '../../components/Button';
import { Disclosure } from '../../components/Disclosure';
import { FormField } from '../../components/FormField';
import { ScreenContainer } from '../../components/ScreenContainer';
import { ScreenHeading } from '../../components/ScreenHeading';
import { SegmentedControl } from '../../components/SegmentedControl';
import { SurfaceCard } from '../../components/SurfaceCard';
import { monthLabel, shortDate } from '../../lib/dates';
import { formatMoney } from '../../lib/money';
import { expenseByCategory } from '../../lib/finance';
import { useAppStore } from '../../stores/useAppStore';
import { parseBudgetAmount } from '../budgets/validation';
import { ProvisionList } from '../provisions/ProvisionList';
import { budgetForecast, horizonEnd, sumCents } from './calculations';
import { useForecast } from './hooks';
import { forecastStyles as styles } from './styles';

type ForecastData = NonNullable<ReturnType<typeof useForecast>['data']>;

function Margin({ data }: { data: ForecastData }) {
  useLanguage();
  const [purchase, setPurchase] = useState('0');
  const [reserve, setReserve] = useState('0');
  const budget = data.budgets.monthly?.amountCents ?? null;
  let simulation: ReturnType<typeof budgetForecast> | undefined;
  let error = '';
  try { simulation = budgetForecast(data.entries, budget, data.today, { purchaseCents: parseBudgetAmount(purchase), reserveCents: parseBudgetAmount(reserve) }); }
  catch { error = t("Saisissez des montants entre 0,00 et 9 999 999,99 €, avec au plus deux décimales."); }
  const base = budgetForecast(data.entries, budget, data.today);
  return <View style={styles.group}>
    <SurfaceCard style={[styles.card, styles.hero]}>
      <Text accessibilityRole="header" style={styles.title}>{t("Marge après charges")}</Text>
      <Text style={styles.note}>{monthLabel(data.today.slice(0, 7))}{t(" · avant simulation")}</Text>
      <Text style={[styles.amount, base.marginCents !== null && base.marginCents < 0 && styles.negative]}>{base.marginCents === null ? t("Budget à définir") : formatMoney(base.marginCents)}</Text>
      <Text style={styles.note}>{t("Estimation hors dépenses variables à venir, distincte du solde bancaire.")}</Text>
      {base.dailyCents !== null ? <Text style={styles.copy}>{formatMoney(base.dailyCents)}{t(" / jour · ")}{base.daysLeft}{t(" jours, aujourd’hui inclus")}</Text> : null}
      <Button title={budget === null ? t("Définir le budget du mois") : t("Modifier le budget du mois")} variant="secondary"
        onPress={() => router.push({ pathname: '/budget', params: { month: data.today.slice(0, 7) } })} />
    </SurfaceCard>
    <Disclosure title={t("Détail du calcul")}>
      <Text style={styles.copy}>{t("Budget : ")}{budget === null ? t("non défini") : formatMoney(budget)}</Text>
      <Text style={styles.copy}>{t("− Dépenses enregistrées : ")}{formatMoney(base.recordedCents)}</Text>
      <Text style={styles.copy}>{t("− Échéances non enregistrées : ")}{formatMoney(base.plannedCents)}</Text>
      <Text style={styles.note}>{t("Les dépenses futures sont comptées une seule fois. Le repère journalier est arrondi à la baisse.")}</Text>
    </Disclosure>
    <SurfaceCard style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>{t("Simuler un achat")}</Text>
      <FormField label={t("Achat envisagé en euros")} suffix="€" keyboardType="decimal-pad" value={purchase} onChangeText={setPurchase} />
      <FormField label={t("Marge de précaution en euros")} suffix="€" keyboardType="decimal-pad" value={reserve} onChangeText={setReserve} />
      <Text style={styles.note}>{t("Simulation temporaire, sans enregistrement ni effet sur les provisions.")}</Text>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{t(error)}</Text> : <View accessibilityLiveRegion="polite">
        <Text style={styles.copy}>{t("Après simulation")}</Text>
        <Text style={[styles.amount, simulation!.marginCents !== null && simulation!.marginCents < 0 && styles.negative]}>
          {simulation!.marginCents === null ? t("Budget à définir") : formatMoney(simulation!.marginCents)}</Text>
        {simulation!.marginCents !== null && simulation!.marginCents < 0 ? <Text style={styles.error}>{t("Le budget serait dépassé de ")}{formatMoney(-simulation!.marginCents)}.</Text> : null}
      </View>}
      <Button title={t("Réinitialiser la simulation")} variant="ghost" onPress={() => { setPurchase('0'); setReserve('0'); }} />
    </SurfaceCard>
    {data.budgets.categories.map((limit) => {
      const spent = expenseByCategory(data.entries.filter((entry) => entry.occurredOn.slice(0, 7) === data.today.slice(0, 7)))
        .find((part) => part.categoryId === limit.categoryId)?.amountCents ?? 0;
      if (spent <= limit.amountCents) return null;
      return <Text key={limit.categoryId} style={styles.error}>{t(data.categories.find((category) => category.id === limit.categoryId)?.label)}{t(" : les dépenses et charges connues dépassent l’enveloppe de ")}{formatMoney(spent - limit.amountCents)}.</Text>;
    })}
  </View>;
}

function Agenda({ data }: { data: ForecastData }) {
  useLanguage();
  const [days, setDays] = useState<'7' | '30'>('7');
  const end = horizonEnd(data.today, Number(days));
  const entries = data.entries.filter((entry) => entry.kind === 'expense' && entry.occurredOn >= data.today && entry.occurredOn < end);
  const months = [...new Set(entries.map((entry) => entry.occurredOn.slice(0, 7)))];
  return <View style={styles.group}>
    <SegmentedControl label={t("Période de l’agenda")} options={[{ value: '7', label: t("7 jours") }, { value: '30', label: t("30 jours") }]} value={days} onChange={setDays} />
    <Text style={styles.note}>{t("Aujourd’hui inclus · « Enregistré » ne confirme pas le débit bancaire.")}</Text>
    {entries.length === 0 ? <SurfaceCard style={styles.card}><Text style={styles.title}>{t("Aucune charge connue sur cette période")}</Text>
      </SurfaceCard> : null}
    {months.map((month) => <SurfaceCard key={month} style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>{monthLabel(month)}</Text>
      <Text style={styles.copy}>{t("Charges de la période : ")}{formatMoney(sumCents(entries.filter((entry) => entry.occurredOn.startsWith(month)).map((entry) => entry.amountCents)))}</Text>
      {entries.filter((entry) => entry.occurredOn.startsWith(month)).map((entry) => <View key={entry.id} style={styles.line}>
        <Text style={styles.copy}>{shortDate(entry.occurredOn)} · {entry.label}</Text>
        <Text style={styles.copy}>{formatMoney(entry.amountCents)} · {entry.isPlanned ? t("Prévu") : t("Enregistré")}</Text>
        <Button title={entry.isPlanned ? t("Voir la récurrence") : t("Voir la dépense")} variant="ghost" onPress={() => router.push({
          pathname: entry.isPlanned ? '/recurring-expense' : '/transaction', params: { id: entry.isPlanned ? entry.recurringExpenseId! : entry.id },
        })} />
      </View>)}
    </SurfaceCard>)}
    <Button title={t("Gérer les récurrences")} variant="secondary" onPress={() => router.push('/recurring')} />
  </View>;
}

export function ForecastScreen() {
  useLanguage();
  const [section, setSection] = useState<'margin' | 'agenda' | 'provisions'>('margin');
  const state = useForecast();
  const invalidate = useAppStore((store) => store.invalidate);
  return <ScreenContainer><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
    <AppHeader profile />
    <ScreenHeading title={t("Prévoir")} />
    <SegmentedControl label={t("Prévisions")} value={section} onChange={setSection} options={[
      { value: 'margin', label: t("Marge") }, { value: 'agenda', label: t("Agenda") }, { value: 'provisions', label: t("Provisions") },
    ]} />
    {section === 'provisions' ? <ProvisionList /> : state.error ? <SurfaceCard style={styles.card}>
      <Text accessibilityRole="alert" style={styles.error}>{state.error}</Text><Button title={t("Actualiser les prévisions")} onPress={invalidate} />
    </SurfaceCard> : !state.data ? <Text style={styles.note}>{t("Actualisation des prévisions…")}</Text>
      : section === 'margin' ? <Margin data={state.data} /> : <Agenda data={state.data} />}
  </ScrollView></ScreenContainer>;
}
