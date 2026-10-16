import { isISODate, parseFrenchDate } from '../../lib/dates';
import { parseAmountToCents } from '../../lib/money';
import { transactionDraftSchema } from '../transactions/validation';
import type { TransactionDraft } from '../transactions/types';

export const MAX_FILE_BYTES = 8 * 1024 * 1024;
export function utf8Bytes(text: string): number {
  let bytes = 0;
  for (const char of text) { const code = char.codePointAt(0)!; bytes += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4; }
  return bytes;
}
export function parseCsv(text: string, delimiter: ';' | ',' | '\t'): string[][] {
  if (text.length > MAX_FILE_BYTES || utf8Bytes(text) > MAX_FILE_BYTES) throw new Error('Fichier trop volumineux (8 Mo maximum).');
  const rows: string[][] = []; let row: string[] = [], field = '', quoted = false, closed = false;
  const source = text.replace(/^\uFEFF/, '');
  function cell() { row.push(field); field = ''; closed = false; if (row.length > 50) throw new Error('50 colonnes maximum.'); }
  function line() { cell(); if (row.some((s) => s.trim())) rows.push(row); row = []; if (rows.length > 1001) throw new Error('1 000 opérations maximum par import.'); }
  for (let i = 0; i < source.length; i++) {
    const c = source[i]!;
    if (quoted) {
      if (c === '"' && source[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else field += c;
    } else if (c === delimiter) cell();
    else if (c === '\n' || c === '\r') { if (c === '\r' && source[i + 1] === '\n') i++; line(); }
    else if (c === '"' && !field && !closed) quoted = true;
    else { if (closed || c === '"') throw new Error('Guillemets CSV invalides.'); field += c; }
  }
  if (quoted) throw new Error('Guillemets CSV non fermés.');
  if (field || row.length || closed) line();
  if (rows.length < 2) throw new Error('Ajoutez un en-tête et au moins une opération.');
  const width = rows[0]!.length;
  if (rows.some((r) => r.length !== width)) throw new Error('Nombre de colonnes incohérent. Vérifiez le séparateur.');
  return rows;
}
export type CsvMapping = { date: number; label: number; amount: number; credit: number; mode: 'signed' | 'separate'; dateFormat: 'fr' | 'iso' };
export type CsvRule = { pattern: string; kind: 'expense' | 'income'; categoryId: string };
export function normalizeLabel(value: string) { return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr'); }
export function previewCsv(rows: string[][], map: CsvMapping, rules: CsvRule[], fileDigest: string) {
  if (!/^[a-f0-9]{64}$/.test(fileDigest)) throw new Error('Empreinte de fichier invalide.');
  const seen = new Map<string, number>();
  return rows.slice(1).map((row, i) => {
    try {
      const cell = (index: number) => { if (!Number.isInteger(index) || index < 0 || index >= row.length) throw new Error('Colonne invalide.'); return row[index]!.trim(); };
      const date = cell(map.date), label = cell(map.label);
      const occurredOn = map.dateFormat === 'fr' ? parseFrenchDate(date) : date;
      if (!isISODate(occurredOn)) throw new Error('Date invalide.');
      let kind: 'expense' | 'income', amountCents: number;
      if (map.mode === 'signed') {
        const raw = cell(map.amount); kind = raw.startsWith('-') ? 'expense' : 'income';
        amountCents = parseAmountToCents(raw.replace(/^[+-]/, ''));
      } else {
        const debit = cell(map.amount), credit = cell(map.credit);
        const nonzero = (s: string) => !!s && !/^[+]?0+(?:[.,]0{1,2})?$/.test(s);
        if (nonzero(debit) === nonzero(credit)) throw new Error('Renseignez soit le débit, soit le crédit.');
        kind = nonzero(debit) ? 'expense' : 'income'; amountCents = parseAmountToCents(nonzero(debit) ? debit : credit);
      }
      const matches = rules.filter((r) => r.kind === kind && normalizeLabel(label).includes(normalizeLabel(r.pattern)));
      const targets = new Set(matches.map((r) => r.categoryId));
      const draft = transactionDraftSchema.parse({ kind, amountCents, label, occurredOn,
        categoryId: targets.size === 1 ? matches[0]!.categoryId : kind === 'expense' ? 'other-expense' : 'other-income' });
      const key = JSON.stringify([draft.occurredOn, draft.kind, draft.amountCents, normalizeLabel(draft.label)]);
      const ordinal = (seen.get(key) ?? 0) + 1; seen.set(key, ordinal);
      return { line: i + 2, draft, fingerprint: JSON.stringify([fileDigest, key, ordinal]), ambiguousRule: targets.size > 1, error: '' };
    } catch { return { line: i + 2, error: 'Date, montant, libellé ou correspondance de colonnes invalide.' }; }
  });
}
export type CsvPreview = ReturnType<typeof previewCsv>[number];
export function exportCsv(entries: TransactionDraft[]): string {
  const escape = (s: string) => `"${(/^[\s]*[=+\-@\t\r]/.test(s) ? "'" : '') + s.replace(/"/g, '""')}"`;
  return '\uFEFFDate;Libellé;Débit;Crédit;Catégorie\r\n' + entries.map((e) => [e.occurredOn, escape(e.label),
    e.kind === 'expense' ? (e.amountCents / 100).toFixed(2).replace('.', ',') : '',
    e.kind === 'income' ? (e.amountCents / 100).toFixed(2).replace('.', ',') : '', escape(e.categoryId)].join(';')).join('\r\n');
}
