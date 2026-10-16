import { useState } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { SettingsPage, settingsStyles as s } from '../src/components/SettingsPage';
import { Button } from '../src/components/Button';
import { SurfaceCard } from '../src/components/SurfaceCard';
import { useConfirmation } from '../src/components/ConfirmationProvider';
import { useDatabase } from '../src/db/DatabaseProvider';
import { makeBackup, parseBackup, restoreBackup } from '../src/features/portability/backup';
import { readUserFile, writeUserFile } from '../src/features/portability/files';
import { exportCsv } from '../src/features/csv/parser';
import { transactions } from '../src/db/schema';
import { OperationError, useOperation } from '../src/features/entry-tools/ui';

export default function DataTransferScreen() {
  const db = useDatabase(), confirm = useConfirmation(), op = useOperation();
  const [pending, setPending] = useState<{ text: string; count: number; exportedAt: string } | null>(null);
  const fileName = (ext: string) => `MyBudget-${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`;
  return <SettingsPage title="Sauvegarder et transférer">
    <Text style={s.copy}>La sauvegarde JSON contient toutes vos données. Le CSV contient les transactions pour consultation, sans les réglages ni les répartitions. Ces fichiers ne sont pas chiffrés : choisissez un emplacement privé.</Text>
    <Button title="Enregistrer une sauvegarde complète" disabled={op.busy} onPress={() => void op.run(async () => {
      const text = makeBackup(db); await writeUserFile(fileName('json'), text, 'application/json');
    }, 'Fichier de sauvegarde transmis au sélecteur de fichiers')} />
    <Button title="Exporter les transactions en CSV" variant="secondary" disabled={op.busy} onPress={() => void op.run(async () => {
      const entries = db.select().from(transactions).orderBy(transactions.occurredOn).all();
      await writeUserFile(fileName('csv'), exportCsv(entries), 'text/csv');
    }, 'Export transmis au sélecteur de fichiers')} />
    <Button title="Choisir une sauvegarde à restaurer" variant="secondary" disabled={op.busy} onPress={() => void op.run(async () => {
      setPending(null); const text = await readUserFile(); if (text === null) return;
      try { const value = parseBackup(text); setPending({ text, count: value.tables.transactions.length, exportedAt: value.exportedAt }); }
      catch { throw new Error('Sauvegarde invalide ou incompatible avec cette version. Aucune donnée modifiée.'); }
    })} />
    {pending ? <SurfaceCard style={s.card}>
      <Text style={s.label}>{pending.count} transactions · sauvegarde du {new Date(pending.exportedAt).toLocaleString('fr-FR')}</Text>
      <Text style={s.copy}>La restauration remplace toutes les données locales. Les rappels seront désactivés. Faites d’abord une sauvegarde de vos données actuelles.</Text>
      <Button title="Remplacer les données par cette sauvegarde" variant="danger" disabled={op.busy} onPress={() => void op.run(async () => {
        if (!await confirm({ title: 'Restaurer cette sauvegarde ?', message: 'Toutes les transactions, budgets, favoris et réglages actuels seront remplacés. Les rappels devront être réactivés.', confirmLabel: 'Remplacer mes données', destructive: true })) return false;
        // Restore in the same SQLite database; never replace its file or migration ledger.
        try { restoreBackup(db, pending.text); } catch { throw new Error('Restauration refusée. Vos données précédentes sont conservées.'); }
        setPending(null);
      }, 'Restauration terminée')} />
      <Button title="Annuler la restauration" variant="ghost" onPress={() => setPending(null)} disabled={op.busy} />
    </SurfaceCard> : null}
    <Button title="Importer un fichier CSV" variant="secondary" disabled={op.busy} onPress={() => router.push('/csv-import')} />
    <OperationError message={op.error} />
  </SettingsPage>;
}
