import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Search, X } from 'lucide-react-native';
import { SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { AddTransactionButton, FAB_RESERVE } from '../../src/components/AddTransactionButton';
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
import { displayDate, localDateKey } from '../../src/lib/dates';
import { monthlySummary } from '../../src/lib/finance';
import { theme } from '../../src/theme';
import type { Transaction } from '../../src/features/transactions/types';

const filters = [
  { value: 'all', label: 'Toutes' }, { value: 'expense', label: 'Dépenses' }, { value: 'income', label: 'Revenus' },
] as const;
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr-FR');

export default function HistoryScreen() {
  const { transactions, categories, loading, error } = useMonthlyTransactions();
  const month = useAppStore((state) => state.month);
  const filter = useAppStore((state) => state.filter);
  const setFilter = useAppStore((state) => state.setFilter);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const categoryMap = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const visible = useMemo(() => transactions.filter((item) =>
    (filter === 'all' || item.kind === filter)
      && normalize(`${item.label} ${categoryMap.get(item.categoryId)?.label ?? ''}`).includes(normalize(query.trim())),
  ), [transactions, filter, query, categoryMap]);
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
  const filtered = filter !== 'all' || query.trim().length > 0;
  const showAdd = !loading && !error && visible.length > 0;
  return <ScreenContainer>
    <SectionList sections={loading || error ? [] : sections} keyExtractor={(item) => item.id}
      stickySectionHeadersEnabled={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.page, { paddingBottom: showAdd ? FAB_RESERVE : theme.spacing.xl }]}
      ListHeaderComponent={<>
        <ScreenHeading title="Mes dépenses" action={<IconButton icon={searchOpen ? X : Search}
          label={searchOpen ? 'Fermer la recherche' : 'Rechercher une transaction'} onPress={() => { setSearchOpen(!searchOpen); setQuery(''); }} />} />
        <View style={styles.tools}>
          <SegmentedControl label="Type de transactions" options={filters} value={filter} onChange={setFilter} />
          {searchOpen ? <View style={[styles.search, { borderColor: focused ? theme.colors.focusRing : theme.colors.controlBorder }]}>
            <Search size={theme.size.icon.medium} color={theme.colors.textSubtle} {...decorativeIconProps} />
            <TextInput accessibilityLabel="Rechercher une transaction dans le mois affiché"
              accessibilityRole="search" value={query} onChangeText={setQuery} placeholder="Rechercher une transaction"
              placeholderTextColor={theme.colors.textSubtle} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
              style={styles.searchInput} returnKeyType="search" />
            {query ? <IconButton icon={X} label="Effacer la recherche" onPress={() => setQuery('')} /> : null}
          </View> : null}
        </View>
        <MonthPicker />
        {!loading && !error && visible.length ? <View style={styles.summary}>
          <Text style={styles.meta}>{filtered ? 'Résultats filtrés' : 'Toutes les transactions'} · {visible.length}</Text>
          {filter !== 'income' ? <Text style={styles.total}>Dépenses : {formatMoney(summary.expenseCents)}</Text> : null}
          {filter !== 'expense' ? <Text style={styles.total}>Revenus : {formatMoney(summary.incomeCents)}</Text> : null}
        </View> : null}
      </>}
      renderSectionHeader={({ section }) => <Text accessibilityRole="header" style={styles.date}>{section.date === localDateKey() ? 'Aujourd’hui' : displayDate(section.date)}</Text>}
      renderItem={({ item, index, section }) => <TransactionRow transaction={item}
        category={categoryMap.get(item.categoryId)} last={index === section.data.length - 1} />}
      ListEmptyComponent={loading || error ? <QueryState error={error} /> : <EmptyState
        title={filtered ? 'Aucun résultat' : 'Aucune transaction ce mois-ci'}
        description={filtered ? 'Essayez un autre mot ou retirez les filtres pour retrouver vos transactions.'
          : 'Ajoutez une dépense ou un revenu pour commencer.'}
        actionLabel={filtered ? 'Effacer les filtres' : 'Ajouter une transaction'}
        onAdd={filtered ? () => { setQuery(''); setFilter('all'); } : () => router.push('/transaction')} />}
    />
    {showAdd ? <AddTransactionButton /> : null}
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: theme.layout.gutter, flexGrow: 1 },
  tools: { gap: theme.spacing.lg, marginBottom: theme.spacing.lg },
  search: { minHeight: theme.size.inputMinHeight, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
    paddingLeft: theme.spacing.lg, paddingRight: theme.spacing.xs,
    borderWidth: theme.size.focusWidth, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface },
  searchInput: { ...theme.typography.body, color: theme.colors.textPrimary, flex: 1, minWidth: 0,
    paddingVertical: theme.spacing.md },
  summary: { gap: theme.spacing.xs, paddingBottom: theme.spacing.md },
  meta: { ...theme.typography.bodySmall, color: theme.colors.textSubtle },
  total: { ...theme.typography.bodySmall, ...theme.typography.amount, color: theme.colors.textPrimary },
  date: { ...theme.typography.bodySmall, fontFamily: theme.fontFamily.semibold,
    color: theme.colors.textSubtle, marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm },
});
