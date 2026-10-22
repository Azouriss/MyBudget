import { t } from '../src/i18n/locale';
import { useLanguage } from '../src/i18n/useLanguage';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { eq } from 'drizzle-orm';
import { SettingsPage, settingsStyles as s } from '../src/components/SettingsPage';
import { SurfaceCard } from '../src/components/SurfaceCard';
import { Button } from '../src/components/Button';
import { FormField } from '../src/components/FormField';
import { DateField } from '../src/components/DateField';
import { useConfirmation } from '../src/components/ConfirmationProvider';
import { useDatabase } from '../src/db/DatabaseProvider';
import { categories, transactions } from '../src/db/schema';
import { transactionSplits } from '../src/db/planningSchema';
import { createEntryToolsRepository } from '../src/features/entry-tools/repository';
import { OperationError, QueryFeedback, useLocalQuery, useOperation, useDraftGuard } from '../src/features/entry-tools/ui';
import { centsToInput, formatMoney, parseAmountToCents } from '../src/lib/money';
import { displayDate, localDateKey, parseFrenchDate } from '../src/lib/dates';

export default function ExpenseDetailsScreen() {
  useLanguage();
  const params = useLocalSearchParams<{ id?: string }>();
  const db = useDatabase(), repository = createEntryToolsRepository(db), op = useOperation(), confirm = useConfirmation();
  const [id, setId] = useState(params.id ?? ''), [search, setSearch] = useState('');
  const query = useLocalQuery(() => ({ entries: db.select().from(transactions).where(eq(transactions.kind, 'expense')).all().sort((a, b) => b.occurredOn.localeCompare(a.occurredOn)),
    categories: db.select().from(categories).where(eq(categories.kind, 'expense')).all(), claims: repository.claims(),
    splits: db.select().from(transactionSplits).all() }));
  const [expected, setExpected] = useState(''), [label, setLabel] = useState(''), [received, setReceived] = useState(''), [date, setDate] = useState(displayDate(localDateKey()));
  const [parts, setParts] = useState<{ categoryId: string; amount: string }[]>([]);
  useDraftGuard(!!expected || !!label || !!received || parts.length > 0, op.busy);
  const entry = query.data?.entries.find((t) => t.id === id), claim = query.data?.claims.find((c) => c.expenseId === id);
  const storedParts = query.data?.splits.filter((s) => s.transactionId === id) ?? [];
  return <SettingsPage title={t("Répartition et remboursements")}>
    {!query.data ? <QueryFeedback {...query} /> : <>
      <FormField label={t("Rechercher une dépense")} placeholder={t("Libellé ou AAAA-MM-JJ")} value={search} onChangeText={setSearch} editable={!op.busy} />
      <Text style={s.copy}>{t("30 premiers résultats.")}</Text>
      {query.data.entries.filter((t) => `${t.label} ${t.occurredOn}`.toLocaleLowerCase('fr').includes(search.toLocaleLowerCase('fr'))).slice(0, 30).map((t) =>
        <Button key={t.id} title={`${displayDate(t.occurredOn)} · ${t.label} · ${formatMoney(t.amountCents)}`} variant={id === t.id ? 'primary' : 'secondary'} disabled={op.busy}
          onPress={() => { setId(t.id); setExpected(''); setLabel(''); setReceived(''); setParts([]); }} />)}
      {entry ? <>
        <Text style={s.label}>{t("Dépense sélectionnée : ")}{entry.label} · {formatMoney(entry.amountCents)}</Text>
        <SurfaceCard style={s.card}>
          <Text accessibilityRole="header" style={s.label}>{t("Répartir le ticket")}</Text>
          <Text style={s.copy}>{t("Répartition par catégorie, sans changer le total payé.")}</Text>
          {storedParts.map((p) => <Text key={p.id} style={s.copy}>{t(query.data!.categories.find((c) => c.id === p.categoryId)?.label)} : {formatMoney(p.amountCents)}</Text>)}
          <Button title={t("Préparer la répartition")} variant="secondary" disabled={op.busy} onPress={() => setParts(storedParts.length ? storedParts.map((p) => ({ categoryId: p.categoryId, amount: centsToInput(p.amountCents) }))
            : [{ categoryId: entry.categoryId, amount: '' }, { categoryId: 'other-expense', amount: '' }])} />
          {parts.map((part, index) => <View key={index} style={s.card}>
            <FormField label={t("Part {0} en euros", [index + 1])} value={part.amount} keyboardType="decimal-pad" editable={!op.busy}
              onChangeText={(value) => setParts(parts.map((p, i) => i === index ? { ...p, amount: value } : p))} />
            {query.data!.categories.map((c) => <Button key={c.id} title={t(c.label)} variant={part.categoryId === c.id ? 'primary' : 'secondary'} disabled={op.busy}
              onPress={() => setParts(parts.map((p, i) => i === index ? { ...p, categoryId: c.id } : p))} />)}
            {parts.length > 2 ? <Button title={t("Retirer la part {0}", [index + 1])} variant="ghost" disabled={op.busy} onPress={() => setParts(parts.filter((_, i) => i !== index))} /> : null}
          </View>)}
          {parts.length ? <>
            <Button title={t("Ajouter une part")} variant="secondary" disabled={op.busy || parts.length >= 20} onPress={() => setParts([...parts, { categoryId: 'other-expense', amount: '' }])} />
            <Button title={t("Enregistrer la répartition")} disabled={op.busy} onPress={() => void op.run(() => { repository.split(id, parts.map((p) => ({ categoryId: p.categoryId, amountCents: parseAmountToCents(p.amount) }))); setParts([]); }, t("Répartition enregistrée"))} />
          </> : null}
          {storedParts.length ? <Button title={t("Retirer la répartition")} variant="ghost" disabled={op.busy} onPress={() => void op.run(async () => {
            if (await confirm({ title: t("Retirer la répartition ?"), message: t("La dépense entière sera de nouveau affectée à sa catégorie principale."), confirmLabel: t("Retirer"), destructive: true })) { repository.clearSplits(id); setParts([]); }
          })} /> : null}
        </SurfaceCard>
        <SurfaceCard style={s.card}>
          <Text accessibilityRole="header" style={s.label}>{t("Suivre un remboursement")}</Text>
          <Text style={s.copy}>{t("Les versements reçus réduisent les dépenses nettes, sans augmenter les revenus gagnés.")}</Text>
          {claim ? <>
            <Text style={s.label}>{claim.label}{t(" · Attendu : ")}{formatMoney(claim.expectedCents)}{t(" · Reçu : ")}{formatMoney(claim.receivedCents)}{t(" · Restant : ")}{formatMoney(claim.outstandingCents)}</Text>
            <Text style={s.copy}>{t("Coût net de cet achat à ce jour : ")}{formatMoney(entry.amountCents - claim.receivedCents)}.</Text>
            {claim.received.map((r) => <View key={r.id} style={s.card}>
              <Text style={s.copy}>{displayDate(r.occurredOn)} · {formatMoney(r.amountCents)}{t(" reçu")}</Text>
              <Button title={t("Annuler ce remboursement enregistré")} variant="ghost" disabled={op.busy} onPress={() => void op.run(async () => {
                if (await confirm({ title: t("Annuler ce versement ?"), message: t("Le revenu lié sera supprimé et le montant redeviendra attendu."), confirmLabel: t("Annuler le versement"), destructive: true })) repository.cancelReceipt(r.id);
              })} />
            </View>)}
            {claim.outstandingCents > 0 ? <>
              <FormField label={t("Versement reçu en euros")} value={received} onChangeText={setReceived} keyboardType="decimal-pad" editable={!op.busy} />
              <DateField label={t("Date de réception · JJ/MM/AAAA")} value={date} onChangeText={setDate} editable={!op.busy} />
              <Button title={t("Enregistrer le versement reçu")} disabled={op.busy} onPress={() => void op.run(() => { repository.receive(id, parseAmountToCents(received), parseFrenchDate(date)); setReceived(''); }, t("Remboursement enregistré"))} />
            </> : null}
            <Button title={t("Modifier le montant attendu")} variant="secondary" disabled={op.busy} onPress={() => { setExpected(centsToInput(claim.expectedCents)); setLabel(claim.label); }} />
            <Button title={t("Arrêter le suivi du remboursement")} variant="ghost" disabled={op.busy} onPress={() => void op.run(async () => {
              if (await confirm({ title: t("Arrêter ce suivi ?"), message: t("La dépense et les remboursements reçus restent liés dans votre historique. Le montant restant ne sera plus attendu."), confirmLabel: t("Arrêter le suivi"), destructive: true })) repository.removeClaim(id);
            })} />
          </> : null}
          <FormField label={t("Objet ou organisme qui rembourse")} value={label} onChangeText={setLabel} maxLength={80} editable={!op.busy} />
          <FormField label={t("Montant total attendu en euros")} value={expected} onChangeText={setExpected} keyboardType="decimal-pad" editable={!op.busy} />
          <Button title={claim ? t("Mettre à jour le montant attendu") : t("Créer le suivi du remboursement")} disabled={op.busy || !expected || !label} onPress={() => void op.run(() => { repository.claim(id, parseAmountToCents(expected), label); setExpected(''); setLabel(''); }, t("Suivi enregistré"))} />
        </SurfaceCard>
      </> : <Text style={s.copy}>{t("Sélectionnez une dépense.")}</Text>}
    </>}
    <OperationError message={op.error} />
  </SettingsPage>;
}
