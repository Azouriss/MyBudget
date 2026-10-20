import { useState } from 'react';
import { digestStringAsync, CryptoDigestAlgorithm } from 'expo-crypto';
import { Switch, Text, View } from 'react-native';
import { SettingsPage, settingsStyles as s } from '../src/components/SettingsPage';
import { SurfaceCard } from '../src/components/SurfaceCard';
import { Button } from '../src/components/Button';
import { Disclosure } from '../src/components/Disclosure';
import { FormField } from '../src/components/FormField';
import { SegmentedControl } from '../src/components/SegmentedControl';
import { useConfirmation } from '../src/components/ConfirmationProvider';
import { useDatabase } from '../src/db/DatabaseProvider';
import { categories } from '../src/db/schema';
import { createImportRepository } from '../src/features/csv/repository';
import { parseCsv, previewCsv, type CsvMapping } from '../src/features/csv/parser';
import { readUserFile } from '../src/features/portability/files';
import { formatMoney } from '../src/lib/money';
import { OperationError, QueryFeedback, useLocalQuery, useOperation, useDraftGuard } from '../src/features/entry-tools/ui';

type Reviewed = ReturnType<ReturnType<typeof createImportRepository>['review']>;
export default function CsvImportScreen() {
  const db = useDatabase(), repository = createImportRepository(db), op = useOperation(), confirm = useConfirmation();
  const query = useLocalQuery(() => ({ categories: db.select().from(categories).all(), rules: repository.rules() }));
  const [text, setText] = useState(''), [delimiter, setDelimiter] = useState<';' | ',' | '\t'>(';');
  const [mapping, setMapping] = useState<CsvMapping>({ date: 0, label: 1, amount: 2, credit: 3, mode: 'signed', dateFormat: 'fr' });
  const [rows, setRows] = useState<string[][]>([]), [preview, setPreview] = useState<Reviewed>([]), [selected, setSelected] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(0), [pattern, setPattern] = useState(''), [categoryId, setCategoryId] = useState('food');
  useDraftGuard(!!text || !!pattern, op.busy);
  function invalidatePreview() { setPreview([]); setSelected(new Set()); setPage(0); }
  function changeMapping(next: CsvMapping) { setMapping(next); invalidatePreview(); }
  return <SettingsPage title="Importer un relevé CSV">
    <Text style={s.copy}>Traitement local · 8 Mo maximum · 1 000 opérations.</Text>
    <Button title="Choisir un fichier CSV" disabled={op.busy} onPress={() => void op.run(async () => {
      const content = await readUserFile(); if (content === null) return; setText(content); setRows([]); invalidatePreview();
    })} />
    {text ? <>
      <SegmentedControl label="Séparateur" value={delimiter} options={[{ value: ';', label: ';' }, { value: ',', label: ',' }, { value: '\t', label: 'Tabulation' }]}
        disabled={op.busy} onChange={(v) => { setDelimiter(v); setRows([]); invalidatePreview(); }} />
      <Button title="Lire les colonnes" variant="secondary" disabled={op.busy} onPress={() => void op.run(() => { invalidatePreview(); setRows(parseCsv(text, delimiter)); })} />
    </> : null}
    {rows.length ? <>
      <Text style={s.copy}>Première ligne : en-têtes. Vérifiez les colonnes et les dates.</Text>
      <SegmentedControl label="Montants" value={mapping.mode} options={[{ value: 'signed', label: 'Signé (+ revenu)' }, { value: 'separate', label: 'Débit / crédit' }]}
        disabled={op.busy} onChange={(mode) => changeMapping({ ...mapping, mode })} />
      <SegmentedControl label="Dates" value={mapping.dateFormat} options={[{ value: 'fr', label: 'JJ/MM/AAAA' }, { value: 'iso', label: 'AAAA-MM-JJ' }]}
        disabled={op.busy} onChange={(dateFormat) => changeMapping({ ...mapping, dateFormat })} />
      {(['date', 'label', 'amount', ...(mapping.mode === 'separate' ? ['credit'] as const : [])] as const).map((key) => <View key={key} style={s.card}>
        <Text style={s.label}>Colonne {({ date: 'date', label: 'libellé', amount: mapping.mode === 'signed' ? 'montant signé' : 'débit', credit: 'crédit' })[key]}</Text>
        {rows[0]!.map((header, index) => <Button key={index} title={`${index + 1} · ${header || 'Sans titre'}`} variant={mapping[key] === index ? 'primary' : 'secondary'} disabled={op.busy}
          onPress={() => changeMapping({ ...mapping, [key]: index })} />)}
      </View>)}
      <Button title="Préparer l’aperçu" disabled={op.busy} onPress={() => void op.run(async () => {
        const digest = await digestStringAsync(CryptoDigestAlgorithm.SHA256, text);
        const result = repository.review(previewCsv(rows, mapping, repository.rules(), digest)); setPreview(result); setPage(0);
        setSelected(new Set(result.filter((r) => r.draft && !r.imported && !r.possibleDuplicate && !r.labelMatch && !r.ambiguousRule).map((r) => r.line)));
      })} />
    </> : null}
    {preview.length ? <>
      <Text style={s.label}>{selected.size} sélectionnées · {preview.filter((r) => r.error).length} invalides · {preview.filter((r) => r.imported).length} déjà importées</Text>
      <Text style={s.copy}>Vérifiez montants et catégories. Doublons possibles décochés.</Text>
      <Button title="Tout décocher" variant="ghost" disabled={op.busy} onPress={() => setSelected(new Set())} />
      {preview.slice(page * 25, (page + 1) * 25).map((row) => <SurfaceCard key={row.line} style={s.card}>
        <Text style={s.label}>Ligne {row.line} · {row.draft?.label ?? 'Ligne invalide'}</Text>
        <Text style={s.copy}>{row.draft ? `${row.draft.occurredOn} · ${row.draft.kind === 'expense' ? 'Dépense' : 'Revenu'} · ${formatMoney(row.draft.amountCents)}` : row.error}</Text>
        {row.imported || row.possibleDuplicate || row.labelMatch || row.ambiguousRule ? <Text style={s.copy}>{row.imported ? 'Déjà importée : exclue.' : row.possibleDuplicate || row.labelMatch ? 'Doublon possible : vérifiez avant de cocher.' : 'Plusieurs règles : choisissez une catégorie.'}</Text> : null}
        {row.draft && !row.imported ? <>
          <Switch accessibilityLabel={`Importer la ligne ${row.line}`} value={selected.has(row.line)} disabled={op.busy} onValueChange={(enabled) => setSelected((previous) => { const next = new Set(previous); if (enabled) next.add(row.line); else next.delete(row.line); return next; })} />
          {query.data?.categories.filter((c) => c.kind === row.draft!.kind).map((c) => <Button key={c.id} title={c.label} variant={row.draft!.categoryId === c.id ? 'primary' : 'secondary'} disabled={op.busy}
            onPress={() => setPreview((previous) => previous.map((r) => r.line === row.line && r.draft ? { ...r, draft: { ...r.draft, categoryId: c.id, subcategoryId: null } } : r))} />)}
        </> : null}
      </SurfaceCard>)}
      <Text style={s.copy}>Page {page + 1} / {Math.ceil(preview.length / 25)}</Text>
      <Button title="Page précédente" variant="secondary" disabled={op.busy || page === 0} onPress={() => setPage(page - 1)} />
      <Button title="Page suivante" variant="secondary" disabled={op.busy || (page + 1) * 25 >= preview.length} onPress={() => setPage(page + 1)} />
      <Button title={`Importer les ${selected.size} lignes sélectionnées`} disabled={op.busy || !selected.size} onPress={() => void op.run(async () => {
        if (!await confirm({ title: 'Importer ces opérations ?', message: `${selected.size} transactions seront ajoutées à votre historique. Les lignes décochées sont ignorées.`, confirmLabel: 'Importer' })) return false;
        repository.commit(preview.filter((r) => selected.has(r.line))); invalidatePreview(); setRows([]); setText('');
      }, 'Import terminé')} />
    </> : null}
    <OperationError message={op.error} />
    <Disclosure title="Règles de catégorisation">
      <Text style={s.copy}>Propose une catégorie selon le libellé, sans modifier l’historique ni distinguer les majuscules.</Text>
      {!query.data ? <QueryFeedback {...query} /> : <>
        <FormField label="Texte à reconnaître" value={pattern} onChangeText={setPattern} maxLength={80} editable={!op.busy} />
        {query.data.categories.map((c) => <Button key={c.id} title={c.label} variant={categoryId === c.id ? 'primary' : 'secondary'} disabled={op.busy} onPress={() => setCategoryId(c.id)} />)}
        <Button title="Ajouter cette règle" disabled={op.busy || !pattern.trim()} onPress={() => void op.run(() => { repository.saveRule(pattern, categoryId); setPattern(''); invalidatePreview(); }, 'Règle enregistrée')} />
        {query.data.rules.map((r) => <SurfaceCard key={r.id} style={s.card}>
          <Text style={s.copy}>{r.pattern} → {query.data!.categories.find((c) => c.id === r.categoryId)?.label}</Text>
          <Button title={`Supprimer la règle ${r.pattern}`} variant="ghost" disabled={op.busy} onPress={() => void op.run(async () => {
            if (await confirm({ title: 'Supprimer cette règle ?', message: 'Les transactions existantes sont conservées.', confirmLabel: 'Supprimer', destructive: true })) { repository.removeRule(r.id); invalidatePreview(); }
          })} />
        </SurfaceCard>)}
      </>}
    </Disclosure>
  </SettingsPage>;
}
