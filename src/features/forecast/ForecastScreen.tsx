import { t } from '../../i18n/locale';
import { useLanguage } from '../../i18n/useLanguage';
import { useState } from 'react';
import { router } from 'expo-router';
import { ChevronRight, SlidersHorizontal } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { AppHeader } from '../../components/AppHeader';
import { Button } from '../../components/Button';
import { CategoryIcon } from '../../components/CategoryIcon';
import { decorativeIconProps } from '../../components/decorativeIconProps';
import { Disclosure } from '../../components/Disclosure';
import { FormField } from '../../components/FormField';
import { IconButton } from '../../components/IconButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { ScreenHeading } from '../../components/ScreenHeading';
import { SegmentedControl } from '../../components/SegmentedControl';
import { SurfaceCard } from '../../components/SurfaceCard';
import { monthLabel, shortDate } from '../../lib/dates';
import { formatMoney } from '../../lib/money';
import { expenseByCategory } from '../../lib/finance';
import { recurringId } from '../transactions/types';
import { useAppStore } from '../../stores/useAppStore';
import { theme } from '../../theme';
import { parseBudgetAmount } from '../budgets/validation';
import { ProvisionList } from '../provisions/ProvisionList';
import { budgetForecast, horizonEnd, sumCents } from './calculations';
import { useForecast } from './hooks';
import { forecastStyles as styles } from './styles';

type ForecastData = NonNullable<ReturnType<typeof useForecast>['data']>;

type ForecastSection = 'margin' | 'agenda' | 'provisions';

function ForecastTabs({ value, onChange }: { value: ForecastSection; onChange: (value: ForecastSection) => void }) {
  const [focused, setFocused] = useState<ForecastSection | null>(null);
  const { fontScale } = useWindowDimensions();
  const options: { value: ForecastSection; label: string }[] = [
    { value: 'margin', label: t('Marge') }, { value: 'agenda', label: t('Agenda') }, { value: 'provisions', label: t('Provisions') },
  ];
  return <View accessibilityRole="radiogroup" accessibilityLabel={t('Prévisions')}
    style={[styles.tabs, fontScale >= theme.layout.stackedFontScale && styles.tabsStacked]}>
    {options.map((option) => <Pressable cssInterop={false} key={option.value} accessibilityRole="radio"
      accessibilityLabel={option.label} accessibilityState={{ checked: value === option.value }} aria-checked={value === option.value}
      onFocus={() => setFocused(option.value)} onBlur={() => setFocused(null)} onPress={() => onChange(option.value)}
      style={({ pressed }) => [styles.tab, {
        backgroundColor: pressed ? theme.colors.primaryLight : value === option.value ? theme.colors.primary : theme.colors.transparent,
        borderColor: focused === option.value ? theme.colors.focusRing : theme.colors.transparent,
      }]}>
      <Text style={[styles.tabLabel, value === option.value && styles.tabSelected]}>{option.label}</Text>
    </Pressable>)}
  </View>;
}


function Margin({ data }: { data: ForecastData }) {
  useLanguage();
  const [purchase, setPurchase] = useState('0');
  const [reserve, setReserve] = useState('0');
  const budget = data.budgets.monthly?.amountCents ?? null;
  const editBudget = () => router.push({ pathname: '/budget', params: { month: data.month } });
  let simulation: ReturnType<typeof budgetForecast> | undefined;
  let error = '';
  try { simulation = budgetForecast(data.entries, budget, data.today, { purchaseCents: parseBudgetAmount(purchase), reserveCents: parseBudgetAmount(reserve) }, data.period); }
  catch { error = t('Saisissez des montants entre 0,00 et 9 999 999,99 €, avec au plus deux décimales.'); }
  const base = budgetForecast(data.entries, budget, data.today, undefined, data.period);
  return <View style={styles.group}>
    <SurfaceCard style={styles.card}>
      <View style={styles.cardHeading}>
        <View style={styles.headingCopy}>
          <Text accessibilityRole="header" style={styles.title}>{t('Marge après charges')}</Text>
          <Text style={styles.note}>{shortDate(data.period.start)} → {data.period.end === '2100-01-01' ? '01/01/2100' : shortDate(data.period.end)}{t(" · fin exclue")}</Text>
        </View>
        {budget !== null ? <IconButton icon={SlidersHorizontal} label={t('Modifier le budget du mois')} onPress={editBudget} /> : null}
      </View>
      <View style={[styles.balance, base.marginCents !== null && base.marginCents < 0 && styles.balanceNegative]}>
        <Text style={[budget === null ? styles.emptyTitle : styles.amount, base.marginCents !== null && base.marginCents < 0 && styles.negative]}>
          {base.marginCents === null ? t('Budget à définir') : formatMoney(base.marginCents)}
        </Text>
        <Text style={styles.note}>{t('Estimation hors dépenses variables à venir, distincte du solde bancaire.')}</Text>
      </View>
      {base.dailyCents !== null ? <View style={styles.daily}>
        <View style={styles.dailyMetric}>
          <Text style={styles.note}>{t('Repère par jour')}</Text>
          <Text style={styles.secondaryAmount}>{formatMoney(base.dailyCents)}</Text>
        </View>
        <Text style={styles.dailyPeriod}>{base.daysLeft}{t(' jours, aujourd’hui inclus')}</Text>
      </View> : null}
      {budget === null ? <Button title={t('Définir le budget du mois')} onPress={editBudget} /> : null}
      <Disclosure title={t('Détail du calcul')}>
        {[
          { label: t('Budget'), value: budget === null ? t('non défini') : formatMoney(budget) },
          { label: t('Dépenses enregistrées'), value: formatMoney(base.recordedCents) },
          { label: t('Remboursements reçus'), value: formatMoney(base.reimbursementCents) },
          { label: t('Échéances non enregistrées'), value: formatMoney(base.plannedCents) },
        ].map((item) => <View key={item.label} style={styles.detailRow}>
          <Text style={styles.detailLabel}>{item.label}</Text><Text style={styles.detailAmount}>{item.value}</Text>
        </View>)}
        <Text style={styles.note}>{t('Les dépenses futures sont comptées une seule fois. Le repère journalier est arrondi à la baisse.')}</Text>
      </Disclosure>
    </SurfaceCard>
    <SurfaceCard style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>{t('Simuler un achat')}</Text>
      <FormField label={t('Achat envisagé en euros')} suffix="€" keyboardType="decimal-pad" value={purchase} onChangeText={setPurchase} />
      <FormField label={t('Marge de précaution en euros')} suffix="€" keyboardType="decimal-pad" value={reserve} onChangeText={setReserve} />
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : <View accessibilityLiveRegion="polite"
        style={[styles.simulation, simulation!.marginCents !== null && simulation!.marginCents < 0 && styles.balanceNegative]}>
        <Text style={styles.note}>{t('Après simulation')}</Text>
        <Text style={[simulation!.marginCents === null ? styles.emptyTitle : styles.amount, simulation!.marginCents !== null && simulation!.marginCents < 0 && styles.negative]}>
          {simulation!.marginCents === null ? t('Budget à définir') : formatMoney(simulation!.marginCents)}</Text>
        {simulation!.marginCents !== null && simulation!.marginCents < 0 ? <Text style={styles.error}>{t('Le budget serait dépassé de ')}{formatMoney(-simulation!.marginCents)}.</Text> : null}
      </View>}
      <Text style={styles.note}>{t('Simulation temporaire, sans enregistrement ni effet sur les provisions.')}</Text>
      <Button title={t('Réinitialiser la simulation')} variant="ghost" onPress={() => { setPurchase('0'); setReserve('0'); }} />
    </SurfaceCard>
    {data.budgets.categories.map((limit) => {
      const spent = expenseByCategory(data.entries.filter((entry) => entry.occurredOn >= data.period.start && entry.occurredOn < data.period.end))
        .find((part) => part.categoryId === limit.categoryId)?.amountCents ?? 0;
      if (spent <= limit.amountCents) return null;
      return <Text key={limit.categoryId} style={styles.error}>{data.categories.find((category) => category.id === limit.categoryId)?.label}{t(' : les dépenses et charges connues dépassent l’enveloppe de ')}{formatMoney(spent - limit.amountCents)}.</Text>;
    })}
  </View>;
}

function Agenda({ data }: { data: ForecastData }) {
  useLanguage();
  const [days, setDays] = useState<'7' | '30'>('7');
  const [focused, setFocused] = useState<string | null>(null);
  const end = horizonEnd(data.today, Number(days));
  const entries = data.entries.filter((entry) => entry.kind === 'expense' && entry.occurredOn >= data.today && entry.occurredOn < end);
  const incomes = data.entries.filter((entry) => entry.kind === 'income' && !entry.reimbursement && entry.categoryId !== 'reimbursements' && entry.occurredOn >= data.today && entry.occurredOn < end);
  const months = [...new Set(entries.map((entry) => entry.occurredOn.slice(0, 7)))];
  return <View style={styles.group}>
    <SurfaceCard style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>{t('Charges de la période')}</Text>
      <Text style={styles.amount}>{formatMoney(sumCents(entries.map((entry) => entry.amountCents)))}</Text>
      <SegmentedControl label={t('Période de l’agenda')} options={[{ value: '7', label: t('7 jours') }, { value: '30', label: t('30 jours') }]} value={days} onChange={setDays} />
      <Text style={styles.note}>{t('Aujourd’hui inclus · « Enregistré » ne confirme pas le débit bancaire.')}</Text>
    </SurfaceCard>
    {incomes.length ? <SurfaceCard style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>{t('Revenus à venir')}</Text>
      {incomes.map((entry) => <View key={entry.id}>
        <Button title={`${shortDate(entry.occurredOn)} · ${entry.label} · ${formatMoney(entry.amountCents)}`} variant="ghost"
          onPress={() => router.push({ pathname: entry.isPlanned ? '/recurring-expense' : '/transaction', params: { id: entry.isPlanned ? recurringId(entry)! : entry.id } })} />
        <Text style={styles.note}>{entry.isPlanned ? t('Prévu, hors revenus reçus') : t('Enregistré')}</Text>
      </View>)}
    </SurfaceCard> : null}
    {entries.length === 0 ? <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{t('Aucune charge connue sur cette période')}</Text>
    </View> : null}
    {months.map((month) => <View key={month} style={styles.monthGroup}>
      <View style={styles.monthHeading}>
        <Text accessibilityRole="header" style={styles.monthTitle}>{monthLabel(month)}</Text>
        <Text style={styles.detailAmount}>{formatMoney(sumCents(entries.filter((entry) => entry.occurredOn.startsWith(month)).map((entry) => entry.amountCents)))}</Text>
      </View>
      <SurfaceCard style={styles.agendaList}>
        {entries.filter((entry) => entry.occurredOn.startsWith(month)).map((entry, index, all) => <Pressable cssInterop={false}
          key={entry.id} accessibilityRole="button"
          accessibilityLabel={`${shortDate(entry.occurredOn)}, ${entry.label}, ${formatMoney(entry.amountCents)}, ${entry.isPlanned ? t('Prévu') : t('Enregistré')}. ${entry.isPlanned ? t('Voir la récurrence') : t('Voir la dépense')}`}
          onFocus={() => setFocused(entry.id)} onBlur={() => setFocused(null)}
          onPress={() => router.push({ pathname: entry.isPlanned ? '/recurring-expense' : '/transaction',
            params: { id: entry.isPlanned ? entry.recurringExpenseId! : entry.id } })}
          style={({ pressed }) => [styles.agendaEntry, index === all.length - 1 && styles.lastEntry, {
            backgroundColor: pressed ? theme.colors.primaryLight : theme.colors.transparent,
            borderColor: focused === entry.id ? theme.colors.focusRing : theme.colors.transparent,
          }]}>
          <View style={styles.entryHeading}>
            <CategoryIcon category={data.categories.find((category) => category.id === entry.categoryId)} />
            <View style={styles.headingCopy}>
              <Text style={styles.entryTitle}>{entry.label}</Text>
              <Text style={styles.note}>{shortDate(entry.occurredOn)}</Text>
            </View>
            <ChevronRight size={theme.size.icon.small} color={theme.colors.textSubtle} {...decorativeIconProps} />
          </View>
          <View style={styles.entryAmounts}>
            <Text style={styles.entryAmount}>{formatMoney(entry.amountCents)}</Text>
            <View style={[styles.status, entry.isPlanned && styles.statusPlanned]}>
              <Text style={styles.statusText}>{entry.isPlanned ? t('Prévu') : t('Enregistré')}</Text>
            </View>
          </View>
        </Pressable>)}
      </SurfaceCard>
    </View>)}
    <Button title={t('Gérer les récurrences')} variant="secondary" onPress={() => router.push('/recurring')} />
  </View>;
}

export function ForecastScreen() {
  useLanguage();
  const [section, setSection] = useState<ForecastSection>('margin');
  const state = useForecast();
  const invalidate = useAppStore((store) => store.invalidate);
  return <ScreenContainer><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
    <AppHeader profile />
    <ScreenHeading title={t('Prévoir')} />
    <ForecastTabs value={section} onChange={setSection} />
    {section === 'provisions' ? <ProvisionList /> : state.error ? <SurfaceCard style={styles.card}>
      <Text accessibilityRole="alert" style={styles.error}>{state.error}</Text><Button title={t('Actualiser les prévisions')} onPress={invalidate} />
    </SurfaceCard> : !state.data ? <Text style={styles.note}>{t('Actualisation des prévisions…')}</Text>
      : section === 'margin' ? <Margin data={state.data} /> : <Agenda data={state.data} />}
  </ScrollView></ScreenContainer>;
}
