import { getLocale, t } from '../../src/i18n/locale';
import { useLanguage } from '../../src/i18n/useLanguage';
import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Repeat2, Search, X } from 'lucide-react-native';
import { SectionList, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { AddTransactionButton } from '../../src/components/AddTransactionButton';
import { MonthPicker } from '../../src/components/MonthPicker';
import { ScreenHeading } from '../../src/components/ScreenHeading';
import { decorativeIconProps } from '../../src/components/decorativeIconProps';
import { ScreenContainer } from '../../src/components/ScreenContainer';
import { SegmentedControl } from '../../src/components/SegmentedControl';
import { IconButton } from '../../src/components/IconButton';
import { EmptyState } from '../../src/components/EmptyState';
import { QueryState } from '../../src/components/QueryState';
import { TransactionRow } from '../../src/features/transactions/TransactionRow';
import { useMonthlyTransactions } from '../../src/features/transactions/hooks';
import { useAppStore } from '../../src/stores/useAppStore';
import { formatMoney } from '../../src/lib/money';
import { localDateKey } from '../../src/lib/dates';
import { monthlySummary } from '../../src/lib/finance';
import { theme } from '../../src/theme';
import type { Transaction } from '../../src/features/transactions/types';
import { getExpenseSubcategory } from '../../src/features/categories/subcategories';

const filters = [
  { value: 'all', label: 'Toutes' }, { value: 'expense', label: 'Dépenses' }, { value: 'income', label: 'Revenus' },
] as const;
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr-FR');


export default function HistoryScreen() {
  const language = useLanguage();
  const historyDate = new Intl.DateTimeFormat(getLocale(), { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const { transactions, categories, loading, error } = useMonthlyTransactions();
  const month = useAppStore((state) => state.month);
  const filter = useAppStore((state) => state.filter);
  const setFilter = useAppStore((state) => state.setFilter);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const { width, fontScale } = useWindowDimensions();
  const stackedSummary = Math.min(width, theme.layout.contentMaxWidth) < theme.layout.compactContentWidth
    || fontScale >= theme.layout.stackedFontScale;
  const categoryMap = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const visible = useMemo(() => transactions.filter((item) =>
    (filter === 'all' || item.kind === filter)
      && normalize(`${item.label} ${t(categoryMap.get(item.categoryId)?.label)} ${t(getExpenseSubcategory(item.subcategoryId)?.label)}`).includes(normalize(query.trim())),
  ), [transactions, filter, query, categoryMap, language]);
  const sections = useMemo(() => {
    const dates = new Map<string, Transaction[]>();
    for (const transaction of visible) {
      const group = dates.get(transaction.occurredOn) ?? [];
      group.push(transaction);
      dates.set(transaction.occurredOn, group);
    }
    return [...dates].map(([date, data]) => ({ date, data }));
  }, [visible]);
  const summary = useMemo(() => monthlySummary(visible, month), [visible, month]);
  const hasPlanned = visible.some((item) => item.isPlanned);
  const filtered = filter !== 'all' || query.trim().length > 0;
  const showAdd = !loading && !error;
  return <ScreenContainer footer={showAdd ? <AddTransactionButton /> : undefined}>
    <SectionList sections={loading || error ? [] : sections} keyExtractor={(item) => item.id}
      stickySectionHeadersEnabled={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.page}
      ListHeaderComponent={<>
        <ScreenHeading title={t("Historique")} action={<IconButton icon={searchOpen ? X : Search}
          label={searchOpen ? t("Fermer la recherche") : t("Rechercher une transaction")} onPress={() => { setSearchOpen(!searchOpen); setQuery(''); }} />} />
        <MonthPicker />
        {!loading && !error ? <View style={styles.overview}>
          <View style={[styles.totals, stackedSummary && styles.stackedTotals]}>
            {filter !== 'income' ? <View style={[styles.totalCard, styles.expenseCard, stackedSummary && styles.compactCard]}>
              <View style={styles.totalLabel}>
                <ArrowUpRight size={theme.size.icon.medium} color={theme.colors.dangerText} {...decorativeIconProps} />
                <Text style={styles.totalTitle}>{t("Dépenses")}</Text>
              </View>
              <Text style={[styles.totalAmount, styles.expenseAmount]}>{formatMoney(summary.expenseCents)}</Text>
            </View> : null}
            {filter !== 'expense' ? <View style={[styles.totalCard, styles.incomeCard, stackedSummary && styles.compactCard]}>
              <View style={styles.totalLabel}>
                <ArrowDownLeft size={theme.size.icon.medium} color={theme.colors.textAction} {...decorativeIconProps} />
                <Text style={styles.totalTitle}>{t("Revenus")}</Text>
              </View>
              <Text style={[styles.totalAmount, styles.incomeAmount]}>{formatMoney(summary.incomeCents)}</Text>
            </View> : null}
          </View>
          {hasPlanned ? <View style={styles.planned}>
            <Repeat2 size={theme.size.icon.small} color={theme.colors.textAction} {...decorativeIconProps} />
            <Text style={styles.meta}>{t("Échéances prévues incluses")}</Text>
          </View> : null}
        </View> : null}
        <View style={styles.tools}>
          <SegmentedControl label={t("Type de transactions")} options={filters} value={filter} onChange={setFilter} />
          {searchOpen ? <View style={[styles.search, { borderColor: focused ? theme.colors.focusRing : theme.colors.controlBorder }]}>
            <Search size={theme.size.icon.medium} color={theme.colors.textSubtle} {...decorativeIconProps} />
            <TextInput accessibilityLabel={t("Rechercher une transaction dans le mois affiché")}
              accessibilityRole="search" value={query} onChangeText={setQuery} placeholder={t("Rechercher une transaction")}
              placeholderTextColor={theme.colors.textSubtle} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
              style={styles.searchInput} returnKeyType="search" />
            {query ? <IconButton icon={X} label={t("Effacer la recherche")} onPress={() => setQuery('')} /> : null}
          </View> : null}
        </View>
        {!loading && !error ? <View style={styles.listHeading}>
          <Text accessibilityRole="header" style={styles.listTitle}>{filtered ? t("Résultats") : t("Opérations")}</Text>
          <View style={styles.countBadge}><Text style={styles.count}>{visible.length}</Text></View>
          <View style={styles.headingLine} />
        </View> : null}
      </>}
      renderSectionHeader={({ section }) => <Text accessibilityRole="header" style={styles.date}>{section.date === localDateKey() ? t("Aujourd’hui")
        : historyDate.format(new Date(`${section.date}T12:00:00Z`))}</Text>}
      renderItem={({ item, index, section }) => <TransactionRow transaction={item}
        category={categoryMap.get(item.categoryId)} last={index === section.data.length - 1} variant="history" />}
      ListEmptyComponent={loading || error ? <QueryState error={error} /> : <EmptyState
        title={filtered ? t("Aucun résultat") : t("Aucune transaction ce mois-ci")}
        description={filtered ? t("Essayez un autre mot ou effacez les filtres.")
          : t("Ajoutez une première transaction.")}
        actionLabel={t("Effacer les filtres")}
        onAdd={filtered ? () => { setQuery(''); setFilter('all'); } : undefined} />}
    />
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: theme.layout.gutter, paddingBottom: theme.spacing.xl, flexGrow: 1 },
  tools: { gap: theme.spacing.lg, marginBottom: theme.spacing.lg },
  search: { minHeight: theme.size.inputMinHeight, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
    paddingLeft: theme.spacing.lg, paddingRight: theme.spacing.xs,
    borderWidth: theme.size.focusWidth, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface },
  searchInput: { ...theme.typography.body, color: theme.colors.textPrimary, flex: 1, minWidth: 0,
    paddingVertical: theme.spacing.md },
  overview: { gap: theme.spacing.md, marginBottom: theme.spacing.xl },
  totals: { flexDirection: 'row', gap: theme.spacing.md },
  stackedTotals: { flexDirection: 'column' },
  totalCard: { flex: 1, minWidth: 0, padding: theme.spacing.lg, gap: theme.spacing.sm,
    borderRadius: theme.radius.large },
  compactCard: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
    flexGrow: 0, flexShrink: 0, flexBasis: 'auto' },
  expenseCard: { backgroundColor: theme.colors.peachBackground },
  incomeCard: { backgroundColor: theme.colors.primaryLight },
  totalLabel: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flexShrink: 1 },
  totalTitle: { ...theme.typography.bodySmall, fontFamily: theme.fontFamily.medium,
    color: theme.colors.textPrimary, flexShrink: 1 },
  totalAmount: { ...theme.typography.headingL, ...theme.typography.amount, flexShrink: 1 },
  expenseAmount: { color: theme.colors.dangerText },
  incomeAmount: { color: theme.colors.textAction },
  planned: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  meta: { ...theme.typography.bodySmall, color: theme.colors.textSubtle, flexShrink: 1 },
  listHeading: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
    marginTop: theme.spacing.sm, marginBottom: theme.spacing.xs },
  listTitle: { ...theme.typography.headingS, color: theme.colors.textPrimary, flexShrink: 1 },
  countBadge: { minWidth: theme.spacing.xl, paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs, alignItems: 'center',
    backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.full },
  count: { ...theme.typography.caption, ...theme.typography.amount, color: theme.colors.textSubtle },
  headingLine: { flex: 1, height: theme.size.borderWidth, backgroundColor: theme.colors.border,
    marginLeft: theme.spacing.xs },
  date: { ...theme.typography.caption, color: theme.colors.textSubtle, textTransform: 'capitalize',
    marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm },
});
