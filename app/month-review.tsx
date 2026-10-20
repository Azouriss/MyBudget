import { Text } from 'react-native';
import { router } from 'expo-router';
import { SettingsPage, settingsStyles as s } from '../src/components/SettingsPage';
import { SurfaceCard } from '../src/components/SurfaceCard';
import { Button } from '../src/components/Button';
import { Disclosure } from '../src/components/Disclosure';
import { MonthPicker } from '../src/components/MonthPicker';
import { useDatabase } from '../src/db/DatabaseProvider';
import { categories, transactions } from '../src/db/schema';
import { attachSplits, createEntryToolsRepository } from '../src/features/entry-tools/repository';
import { monthlyReview } from '../src/features/review/calculations';
import { QueryFeedback, useLocalQuery } from '../src/features/entry-tools/ui';
import { useAppStore } from '../src/stores/useAppStore';
import { formatMoney } from '../src/lib/money';
import { currentMonth, monthLabel } from '../src/lib/dates';

export default function MonthReviewScreen() {
  const db = useDatabase(), month = useAppStore((s) => s.month);
  const query = useLocalQuery(() => ({ entries: attachSplits(db, db.select().from(transactions).all()), categories: db.select().from(categories).all(), claims: createEntryToolsRepository(db).claims() }));
  let result: ReturnType<typeof monthlyReview> | undefined;
  try { if (query.data) result = monthlyReview(query.data.entries, month); } catch { /* Earliest supported month has no comparison. */ }
  return <SettingsPage title="Comprendre mon mois">
    <MonthPicker />
    <Text style={s.copy}>Dépenses enregistrées comparées au mois précédent complet.</Text>
    {month >= currentMonth() ? <Text style={s.copy}>Mois incomplet : écart provisoire.</Text> : null}
    {!query.data ? <QueryFeedback {...query} /> : !result ? <Text style={s.copy}>Comparaison indisponible pour cette période.</Text> : <>
      <SurfaceCard style={s.card}>
        <Text style={s.label}>{formatMoney(result.currentSummary.expenseCents)} dépensés · {formatMoney(result.currentSummary.incomeCents)} de revenus enregistrés</Text>
        <Text style={s.copy}>Écart avec {monthLabel(result.previousMonth)} : {formatMoney(result.deltaCents)}{result.percent === null ? ' · Pourcentage indisponible sans dépenses antérieures.' : ` (${result.percent > 0 ? '+' : ''}${result.percent} %).`}</Text>
        {!result.currentSummary.count ? <Text style={s.copy}>Aucune opération enregistrée pour ce mois.</Text> : null}
      </SurfaceCard>
      {result.contributions.map((c) => <SurfaceCard key={c.categoryId} style={s.card}>
        <Text style={s.label}>{query.data!.categories.find((k) => k.id === c.categoryId)?.label} · écart {formatMoney(c.deltaCents)}</Text>
        <Text style={s.copy}>Ce mois : {formatMoney(c.currentCents)} · précédent : {formatMoney(c.previousCents)}</Text>
        {result!.current.filter((t) => t.kind === 'expense' && (t.splits?.length ? t.splits.some((p) => p.categoryId === c.categoryId) : t.categoryId === c.categoryId)).map((t) =>
          <Button key={t.id} title={`${t.occurredOn} · ${t.label} · ${formatMoney(t.splits?.length ? t.splits.filter((p) => p.categoryId === c.categoryId).reduce((n, p) => n + p.amountCents, 0) : t.amountCents)}`} variant="ghost" onPress={() => router.push({ pathname: '/transaction', params: { id: t.id } })} />)}
      </SurfaceCard>)}
      <SurfaceCard style={s.card}><Text style={s.label}>Remboursements attendus · tous mois</Text>
        <Text style={s.copy}>{formatMoney(query.data.claims.reduce((n, c) => n + c.outstandingCents, 0))} non reçus</Text>
        <Button title="Voir les remboursements" variant="secondary" onPress={() => router.push('/expense-details')} />
      </SurfaceCard>
    </>}
    <Disclosure title="Détail de la comparaison">
      <Text style={s.copy}>Prévisions exclues. Les remboursements reçus restent dans les revenus. L’écart ne prédit pas la fin du mois.</Text>
    </Disclosure>
  </SettingsPage>;
}
