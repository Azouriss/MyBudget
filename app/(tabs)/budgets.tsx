import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { ChevronRight, Plus, SlidersHorizontal } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { AppHeader } from '../../src/components/AppHeader';
import { BudgetProgress } from '../../src/components/BudgetProgress';
import { Button } from '../../src/components/Button';
import { CategoryIcon } from '../../src/components/CategoryIcon';
import { decorativeIconProps } from '../../src/components/decorativeIconProps';
import { EmptyState } from '../../src/components/EmptyState';
import { IconButton } from '../../src/components/IconButton';
import { MonthPicker } from '../../src/components/MonthPicker';
import { QueryState } from '../../src/components/QueryState';
import { ScreenContainer } from '../../src/components/ScreenContainer';
import { SectionHeader } from '../../src/components/SectionHeader';
import { SurfaceCard } from '../../src/components/SurfaceCard';
import { useMonthlyBudgets } from '../../src/features/budgets/hooks';
import { useMonthlyTransactions } from '../../src/features/transactions/hooks';
import { budgetProgress } from '../../src/lib/budgets';
import { expenseByCategory, monthlySummary } from '../../src/lib/finance';
import { formatMoney } from '../../src/lib/money';
import { useAppStore } from '../../src/stores/useAppStore';
import { theme } from '../../src/theme';

export default function BudgetsScreen() {
  const month = useAppStore((state) => state.month);
  const budgets = useMonthlyBudgets();
  const data = useMonthlyTransactions();
  const [focusedCategory, setFocusedCategory] = useState<string | null>(null);
  const { width, fontScale } = useWindowDimensions();
  const stacked = Math.min(width, theme.layout.contentMaxWidth) < 360 || fontScale >= theme.layout.stackedFontScale;
  const summary = useMemo(() => monthlySummary(data.transactions, month), [data.transactions, month]);
  const hasPlanned = data.transactions.some((item) => item.isPlanned);
  const spending = useMemo(() => new Map(expenseByCategory(data.transactions).map((item) => [item.categoryId, item.amountCents])), [data.transactions]);
  const limits = useMemo(() => new Map(budgets.categories.map((item) => [item.categoryId, item.amountCents])), [budgets.categories]);
  const progress = budgets.monthly ? budgetProgress(summary.expenseCents, budgets.monthly.amountCents) : undefined;
  function edit(categoryId?: string) {
    router.push({ pathname: '/budget', params: { month, ...(categoryId ? { categoryId } : {}) } });
  }
  return <ScreenContainer><ScrollView contentContainerStyle={styles.page}>
    <AppHeader />
    <MonthPicker />
    {budgets.loading || data.loading || budgets.error || data.error ? <>
      {budgets.error || data.error ? <EmptyState title="Budget indisponible" description="Les budgets ou les dépenses n’ont pas pu être lus. Vos données sont conservées."
        actionLabel="Réessayer" onAdd={() => useAppStore.getState().invalidate()} /> : <QueryState error={false} />}
    </> : <View style={styles.sections}>
      <SurfaceCard>
        {hasPlanned ? <Text style={styles.meta}>Les totaux incluent les échéances récurrentes prévues.</Text> : null}
        <View style={styles.cardHeading}><Text accessibilityRole="header" style={styles.heading}>Vue d’ensemble</Text>
          <IconButton icon={SlidersHorizontal} label="Modifier le budget global" onPress={() => edit()} /></View>
        {budgets.monthly && progress ? <>
          <View style={[styles.overview, stacked && styles.overviewStacked]}>
            {[
              { amount: summary.expenseCents, label: hasPlanned ? 'prévus' : 'dépensés', color: theme.colors.textPrimary },
              { amount: budgets.monthly.amountCents, label: 'budget', color: theme.colors.textPrimary },
              { amount: Math.abs(progress.remainingCents), label: progress.exceeded ? 'de dépassement' : 'restants', color: progress.exceeded ? theme.colors.dangerText : theme.colors.success },
            ].map((item) => <View key={item.label} style={styles.stat}><Text style={[styles.amount, { color: item.color }]}>{formatMoney(item.amount)}</Text>
              <Text style={styles.meta}>{item.label}</Text></View>)}
          </View>
          <BudgetProgress spent={summary.expenseCents} limit={budgets.monthly.amountCents} />
        </> : <View style={styles.intro}>
          <Text style={styles.total}>{formatMoney(summary.expenseCents)}</Text>
          <Text style={styles.copy}>{hasPlanned ? 'de dépenses prévues' : 'de dépenses'} ce mois-ci. Définissez votre budget pour suivre ce qu’il vous reste.</Text>
          <Button title="Définir mon budget" icon={Plus} onPress={() => edit()} />
        </View>}
        {budgets.monthly?.amountCents === 0 ? <Text style={styles.meta}>Aucun montant autorisé pour ce mois.</Text> : null}
      </SurfaceCard>
      <View>
        <SectionHeader title="Budget par catégorie" />
        <SurfaceCard style={styles.list}>
          {data.categories.filter((category) => category.kind === 'expense').map((category, index, all) => {
            const spent = spending.get(category.id) ?? 0;
            const limit = limits.get(category.id);
            const exceeded = limit !== undefined && spent > limit;
            return <Pressable key={category.id} accessibilityRole="button"
              accessibilityLabel={`${category.label}, ${formatMoney(spent)} ${hasPlanned ? 'prévus' : 'dépensés'}, ${limit === undefined ? 'limite à définir' : `budget ${formatMoney(limit)}`}. Modifier la limite.`}
              onPress={() => edit(category.id)} onFocus={() => setFocusedCategory(category.id)} onBlur={() => setFocusedCategory(null)}
              style={({ pressed }) => [styles.category, index === all.length - 1 && styles.last,
                { backgroundColor: pressed ? theme.colors.primaryLight : theme.colors.transparent,
                  borderColor: focusedCategory === category.id ? theme.colors.focusRing : theme.colors.transparent }]}>
              <CategoryIcon category={category} />
              <View style={styles.categoryCopy}>
                <View style={styles.categoryHeading}><Text style={styles.categoryName}>{category.label}</Text>
                  <Text style={[styles.categoryAmount, exceeded && styles.exceeded]}>{formatMoney(spent)}{limit === undefined ? ' · À définir' : ` / ${formatMoney(limit)}`}</Text></View>
                {limit !== undefined ? <BudgetProgress spent={spent} limit={limit} /> : <View style={styles.emptyTrack} />}
                {exceeded ? <Text style={styles.exceeded}>Dépassé de {formatMoney(spent - limit!)}</Text> : null}
              </View>
              <ChevronRight size={theme.size.icon.small} color={theme.colors.textSubtle} {...decorativeIconProps} />
            </Pressable>;
          })}
        </SurfaceCard>
      </View>
      <Text style={styles.note}>Chaque limite est propre au mois affiché. Le budget global et les limites par catégorie sont indépendants.</Text>
    </View>}
  </ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: theme.layout.gutter, paddingBottom: theme.spacing.xl },
  sections: { gap: theme.spacing.xl },
  cardHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: -theme.spacing.sm, marginBottom: theme.spacing.sm },
  heading: { ...theme.typography.body, fontFamily: theme.fontFamily.semibold, color: theme.colors.textPrimary },
  overview: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  overviewStacked: { flexDirection: 'column', gap: theme.spacing.md },
  stat: { flex: 1, minWidth: 0, gap: theme.spacing.xs },
  amount: { ...theme.typography.body, fontFamily: theme.fontFamily.semibold, ...theme.typography.amount },
  meta: { ...theme.typography.bodySmall, color: theme.colors.textSubtle },
  intro: { gap: theme.spacing.md },
  total: { ...theme.typography.financial, color: theme.colors.textPrimary },
  copy: { ...theme.typography.bodySmall, color: theme.colors.textSubtle },
  list: { padding: theme.spacing.xs },
  category: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, padding: theme.spacing.md,
    minHeight: 80, borderWidth: theme.size.focusWidth, borderBottomWidth: theme.size.borderWidth,
    borderBottomColor: theme.colors.border, borderRadius: theme.radius.small },
  last: { borderBottomWidth: 0 },
  categoryCopy: { flex: 1, gap: theme.spacing.xs, minWidth: 0 },
  categoryHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.xs },
  categoryName: { ...theme.typography.bodySmall, fontFamily: theme.fontFamily.semibold, color: theme.colors.textPrimary, flexGrow: 1 },
  categoryAmount: { ...theme.typography.bodySmall, ...theme.typography.amount, color: theme.colors.textSubtle },
  emptyTrack: { height: theme.size.progressHeight, backgroundColor: theme.colors.chartTrack, borderRadius: theme.radius.full, marginVertical: 5 },
  exceeded: { ...theme.typography.caption, color: theme.colors.dangerText },
  note: { ...theme.typography.bodySmall, color: theme.colors.textSubtle, textAlign: 'center' },
});
