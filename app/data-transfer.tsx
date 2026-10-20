import { getLocale, t } from '../src/i18n/locale';
import { useLanguage } from '../src/i18n/useLanguage';
import { useState } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { SettingsPage, settingsStyles as s } from '../src/components/SettingsPage';
import { Button } from '../src/components/Button';
import { Disclosure } from '../src/components/Disclosure';
import { SurfaceCard } from '../src/components/SurfaceCard';
import { useConfirmation } from '../src/components/ConfirmationProvider';
import { useDatabase } from '../src/db/DatabaseProvider';
import { makeBackup, parseBackup, restoreBackup } from '../src/features/portability/backup';
import { readUserFile, writeUserFile } from '../src/features/portability/files';
import { exportCsv } from '../src/features/csv/parser';
import { transactions } from '../src/db/schema';
import { OperationError, useOperation } from '../src/features/entry-tools/ui';

export default function DataTransferScreen() {
  useLanguage();
  const db = useDatabase(), confirm = useConfirmation(), op = useOperation();
  const [pending, setPending] = useState<{ text: string; count: number; exportedAt: string } | null>(null);
  const fileName = (ext: string) => `MyBudget-${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`;
  return <SettingsPage title={t("Sauvegarder et transférer")}>
    <Text style={s.copy}>{t("Fichiers non chiffrés : choisissez un emplacement privé.")}</Text>
    <Button title={t("Sauvegarder mes données")} disabled={op.busy} onPress={() => void op.run(async () => {
      const text = makeBackup(db); await writeUserFile(fileName('json'), text, 'application/json');
    }, t("Fichier de sauvegarde transmis au sélecteur de fichiers"))} />
    <Button title={t("Exporter les transactions (CSV)")} variant="secondary" disabled={op.busy} onPress={() => void op.run(async () => {
      const entries = db.select().from(transactions).orderBy(transactions.occurredOn).all();
      await writeUserFile(fileName('csv'), exportCsv(entries), 'text/csv');
    }, t("Export transmis au sélecteur de fichiers"))} />
    <Button title={t("Restaurer une sauvegarde")} variant="secondary" disabled={op.busy} onPress={() => void op.run(async () => {
      setPending(null); const text = await readUserFile(); if (text === null) return;
      try { const value = parseBackup(text); setPending({ text, count: value.tables.transactions.length, exportedAt: value.exportedAt }); }
      catch { throw new Error('Sauvegarde invalide ou incompatible avec cette version. Aucune donnée modifiée.'); }
    })} />
    {pending ? <SurfaceCard style={s.card}>
      <Text style={s.label}>{pending.count}{t(" transactions · sauvegarde du ")}{new Date(pending.exportedAt).toLocaleString(getLocale())}</Text>
      <Text style={s.copy}>{t("Remplace toutes les données et désactive les rappels. Sauvegardez d’abord vos données actuelles.")}</Text>
      <Button title={t("Restaurer et remplacer les données")} variant="danger" disabled={op.busy} onPress={() => void op.run(async () => {
        if (!await confirm({ title: t("Restaurer cette sauvegarde ?"), message: t("Toutes les transactions, budgets, favoris et réglages actuels seront remplacés. Les rappels devront être réactivés."), confirmLabel: t("Remplacer mes données"), destructive: true })) return false;
        // Restore in the same SQLite database; never replace its file or migration ledger.
        try { restoreBackup(db, pending.text); } catch { throw new Error('Restauration refusée. Vos données précédentes sont conservées.'); }
        setPending(null);
      }, t("Restauration terminée"))} />
      <Button title={t("Annuler la restauration")} variant="ghost" onPress={() => setPending(null)} disabled={op.busy} />
    </SurfaceCard> : null}
    <Button title={t("Importer un fichier CSV")} variant="secondary" disabled={op.busy} onPress={() => router.push('/csv-import')} />
    <Disclosure title={t("Contenu des fichiers")}>
      <Text style={s.copy}>{t("Sauvegarde JSON : toutes vos données, pour restauration.")}</Text>
      <Text style={s.copy}>{t("Export CSV : transactions pour consultation, sans réglages ni répartitions.")}</Text>
    </Disclosure>
    <OperationError message={op.error} />
  </SettingsPage>;
}
