import { planningDatabase } from '../test-support/planningDatabase';
import { createEntryToolsRepository, attachSplits } from '../../features/entry-tools/repository';
import { createTransactionRepository } from '../../features/transactions/repository';
import { createCycleRepository, cycleBounds } from '../../features/planning/repository';
import { createImportRepository } from '../../features/csv/repository';
import { parseCsv, previewCsv as buildPreview, exportCsv, MAX_FILE_BYTES } from '../../features/csv/parser';
import { createHash } from 'node:crypto';
import { makeBackup, parseBackup, restoreBackup } from '../../features/portability/backup';
import { createRenewalRepository, renewalReminder } from '../../features/renewals/repository';
import { createProvisionRepository } from '../../features/provisions/repository';
import { createRecurringRepository } from '../../features/recurring/repository';
import { monthlyReview } from '../../features/review/calculations';
import { expenseByCategory, monthlySummary } from '../../lib/finance';
import { transactions } from '../schema';

jest.mock('expo-crypto', () => ({ randomUUID: () => require('node:crypto').randomUUID() }));
const draft = { kind: 'expense', label: 'Courses', amountCents: 8500, categoryId: 'food', occurredOn: '2026-01-20' } as const;
const mapping = { date: 0, label: 1, amount: 2, credit: 3, mode: 'signed', dateFormat: 'fr' } as const;
function previewCsv(...args: [Parameters<typeof buildPreview>[0], Parameters<typeof buildPreview>[1], Parameters<typeof buildPreview>[2]]) {
  return buildPreview(...args, createHash('sha256').update(JSON.stringify(args[0])).digest('hex'));
}
describe('outils locaux sur SQLite isolé', () => {
  let test: ReturnType<typeof planningDatabase>;
  beforeEach(() => { test = planningDatabase(); });
  afterEach(() => test.sqlite.close());
  const entries = () => createTransactionRepository(test.db);
  const tools = () => createEntryToolsRepository(test.db);
  it('un favori ne crée aucune transaction', () => {
    tools().saveTemplate(draft); expect(tools().templates()[0]).toMatchObject({ amountCents: 8500 });
    expect(entries().forMonth('2026-01')).toEqual([]);
    tools().removeTemplate(tools().templates()[0]!.id); expect(tools().templates()).toEqual([]);
  });
  it('répartit les catégories sans doubler les dépenses et protège les modifications', () => {
    const id = entries().create(draft);
    tools().split(id, [{ categoryId: 'food', amountCents: 6000 }, { categoryId: 'housing', amountCents: 2500 }]);
    expect(expenseByCategory(entries().forMonth('2026-01'))).toEqual([{ categoryId: 'food', amountCents: 6000 }, { categoryId: 'housing', amountCents: 2500 }]);
    expect(monthlySummary(entries().forMonth('2026-01'), '2026-01').expenseCents).toBe(8500);
    expect(() => tools().split(id, [{ categoryId: 'food', amountCents: 6000 }, { categoryId: 'housing', amountCents: 2501 }])).toThrow();
    expect(tools().splits(id)).toHaveLength(2);
    expect(() => entries().update(id, { ...draft, amountCents: 9000 })).toThrow();
    expect(() => createRecurringRepository(test.db).saveTransaction({ ...draft, amountCents: 9000 }, 'monthly', id)).toThrow();
    tools().clearSplits(id); entries().update(id, { ...draft, amountCents: 9000 });
  });
  it('refuse une catégorie de revenu dans une répartition', () => {
    const id = entries().create(draft);
    expect(() => tools().split(id, [{ categoryId: 'food', amountCents: 6000 }, { categoryId: 'salary', amountCents: 2500 }])).toThrow();
    expect(tools().splits(id)).toEqual([]);
  });
  it('suit des versements partiels le mois suivant sans avancer les revenus', () => {
    const id = entries().create(draft); tools().claim(id, 6000, 'Avance');
    expect(monthlySummary(entries().forMonth('2026-01'), '2026-01')).toMatchObject({ expenseCents: 8500, incomeCents: 0 });
    tools().receive(id, 2000, '2026-02-02'); tools().receive(id, 1000, '2026-02-03');
    expect(tools().claims()[0]).toMatchObject({ receivedCents: 3000, outstandingCents: 3000 });
    expect(monthlySummary(entries().forMonth('2026-02'), '2026-02').incomeCents).toBe(3000);
    expect(() => tools().receive(id, 3001, '2026-02-04')).toThrow();
    expect(() => tools().claim(id, 2000, 'Avance')).toThrow();
    expect(() => entries().remove(id)).toThrow();
    const receipt = tools().claims()[0]!.received[0]!;
    expect(() => entries().update(receipt.id, { kind: 'income', label: receipt.label, categoryId: receipt.categoryId, occurredOn: receipt.occurredOn, amountCents: 1 })).toThrow();
    tools().cancelReceipt(receipt.id); expect(tools().claims()[0]?.outstandingCents).toBe(5000);
    tools().removeClaim(id); expect(monthlySummary(entries().forMonth('2026-02'), '2026-02').incomeCents).toBe(1000);
  });
  it('refuse les remboursements futurs ou précédant la dépense', () => {
    const id = entries().create(draft); tools().claim(id, 6000, 'Avance');
    expect(() => tools().receive(id, 100, '2099-01-01')).toThrow();
    expect(() => tools().receive(id, 100, '2026-01-19')).toThrow();
    expect(tools().claims()[0]?.receivedCents).toBe(0);
  });
  it('préserve les périodes existantes et refuse les chevauchements après changement de paie', () => {
    const repo = createCycleRepository(test.db);
    repo.save({ ...cycleBounds('2026-01-29', 28), budgetCents: 10000 });
    expect(() => repo.save({ ...cycleBounds('2026-02-02', 1), budgetCents: 5000 })).toThrow();
    repo.save({ startOn: '2026-02-28', endOn: '2026-03-01', budgetCents: 0 }); expect(repo.all()).toHaveLength(2);
  });
  it('compte chaque transaction dans une seule période, sans salaire attendu', () => {
    const repo = createCycleRepository(test.db);
    repo.save({ startOn: '2026-01-28', endOn: '2026-02-28', budgetCents: 10000 });
    repo.save({ startOn: '2026-02-28', endOn: '2026-03-28', budgetCents: 10000 });
    entries().create({ ...draft, occurredOn: '2026-02-28' });
    const results = repo.all().map((c) => repo.summary(c.id, '2026-02-28'));
    expect(results.map((r) => r.expenseCents).sort()).toEqual([0, 8500]);
    expect(results.every((r) => r.incomeCents === 0)).toBe(true);
  });
  it('inclut les charges futures une fois sans les écrire', () => {
    createRecurringRepository(test.db).saveTransaction(draft, 'monthly');
    const repo = createCycleRepository(test.db); repo.save({ startOn: '2026-01-28', endOn: '2026-02-28', budgetCents: 10000 });
    expect(repo.summary(repo.all()[0]!.id, '2026-02-01')).toMatchObject({ plannedCents: 8500, marginCents: 1500 });
    expect(entries().forMonth('2026-02')).toEqual([]);
  });
  it('importe un lot et bloque le réimport sans doublon', () => {
    const repo = createImportRepository(test.db);
    const preview = previewCsv(parseCsv('Date;Libellé;Montant\n20/01/2026;Courses;-85,00\n21/01/2026;Paie;2000,00', ';'), mapping, []);
    expect(repo.commit(preview)).toBe(2); expect(repo.review(preview).every((r) => r.imported)).toBe(true);
    expect(() => repo.commit(preview)).toThrow(); expect(entries().forMonth('2026-01')).toHaveLength(2);
  });
  it('annule tout le lot CSV si une ligne échoue', () => {
    const preview = previewCsv(parseCsv('Date;Libellé;Montant\n20/01/2026;Courses;-85,00\n31/02/2026;Erreur;-1', ';'), mapping, []);
    expect(() => createImportRepository(test.db).commit(preview)).toThrow(); expect(entries().forMonth('2026-01')).toEqual([]);
  });
  it('ne confond pas une identité déjà importée avec un doublon possible dans un autre fichier', () => {
    const repo = createImportRepository(test.db);
    const first = previewCsv(parseCsv('Date;Libellé;Montant\n20/01/2026;Courses;-85,00', ';'), mapping, []);
    repo.commit(first);
    const second = previewCsv(parseCsv('Date;Libellé;Montant\n20/01/2026;Courses;-85,00\n21/01/2026;Autre;-1', ';'), mapping, []);
    expect(repo.review(second)[0]).toMatchObject({ imported: false, possibleDuplicate: true });
  });
  it('signale doublons manuels et règles contradictoires', () => {
    entries().create(draft); const repo = createImportRepository(test.db); repo.saveRule('courses', 'food'); repo.saveRule('COURSES', 'housing');
    const preview = previewCsv(parseCsv('Date;Libellé;Montant\n20/01/2026;Courses;-85,00', ';'), mapping, repo.rules());
    expect(repo.review(preview)[0]).toMatchObject({ possibleDuplicate: true, ambiguousRule: true, imported: false });
    expect(entries().forMonth('2026-01')).toHaveLength(1);
  });
  function fixture() {
    const id = entries().create(draft); tools().saveTemplate(draft);
    tools().split(id, [{ categoryId: 'food', amountCents: 6000 }, { categoryId: 'housing', amountCents: 2500 }]);
    tools().claim(id, 3000, 'Partage'); tools().receive(id, 1000, '2026-02-02');
    createCycleRepository(test.db).save({ startOn: '2026-01-28', endOn: '2026-02-28', budgetCents: 20000 });
    createRenewalRepository(test.db).save({ label: 'Contrat', dueOn: '2027-02-01', cancelBy: '2027-01-01', remindDays: 7, amountCents: 5000, notificationsEnabled: true });
    createImportRepository(test.db).saveRule('Courses', 'food');
    const goal = createProvisionRepository(test.db).save({ label: 'Vacances', targetCents: 60000, dueOn: '2027-06-01', contributionDay: 28 });
    createProvisionRepository(test.db).move(goal, 10000);
    createRecurringRepository(test.db).saveTransaction({ ...draft, label: 'Charge' }, 'monthly');
  }
  it('restaure toutes les relations sur une autre base et désactive les rappels', () => {
    fixture(); const saved = makeBackup(test.db), parsed = parseBackup(saved), other = planningDatabase();
    try {
      restoreBackup(other.db, saved); const actual = parseBackup(makeBackup(other.db));
      parsed.tables.renewals.forEach((r) => { r.notifications_enabled = 0; });
      expect(actual.tables).toEqual(parsed.tables);
      expect(other.sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
      expect(other.sqlite.prepare('PRAGMA integrity_check').get()?.integrity_check).toBe('ok');
    } finally { other.sqlite.close(); }
  });
  it('annule une restauration si une référence manque, après les suppressions transactionnelles', () => {
    fixture(); const saved = makeBackup(test.db), bad = JSON.parse(saved); bad.tables.provision_movements[0].goal_id = 'absent';
    expect(() => restoreBackup(test.db, JSON.stringify(bad))).toThrow();
    expect(parseBackup(makeBackup(test.db)).tables).toEqual(parseBackup(saved).tables);
  });
  it('refuse version inconnue, table ou champ supplémentaires sans effacer les données', () => {
    fixture(); const text = makeBackup(test.db);
    for (const change of ['version', 'table', 'field']) {
      const bad = JSON.parse(text);
      if (change === 'version') bad.version = 2;
      else if (change === 'table') bad.tables.unexpected = [];
      else bad.tables.transactions[0].isPlanned = true;
      expect(() => restoreBackup(test.db, JSON.stringify(bad))).toThrow();
      expect(parseBackup(makeBackup(test.db)).tables).toEqual(parseBackup(text).tables);
    }
  });
  it('refuse les répartitions et remboursements incohérents dans une sauvegarde', () => {
    fixture(); const text = makeBackup(test.db);
    const split = JSON.parse(text); split.tables.transaction_splits[0].amount_cents++; expect(() => parseBackup(JSON.stringify(split))).toThrow();
    const claim = JSON.parse(text); claim.tables.reimbursement_claims[0].expected_cents = 1; expect(() => parseBackup(JSON.stringify(claim))).toThrow();
  });
  it('explique exactement l’écart mensuel sans inclure les prévisions', () => {
    const id = entries().create(draft); tools().split(id, [{ categoryId: 'food', amountCents: 6000 }, { categoryId: 'housing', amountCents: 2500 }]);
    entries().create({ ...draft, occurredOn: '2025-12-20', amountCents: 5000 });
    const data = attachSplits(test.db, test.db.select().from(transactions).all());
    const review = monthlyReview([...data, { ...data[0]!, id: 'forecast', isPlanned: true }], '2026-01');
    expect(review.deltaCents).toBe(3500); expect(review.contributions.reduce((n, c) => n + c.deltaCents, 0)).toBe(3500);
  });
});

describe('formats et calendriers', () => {
  it('borne les fichiers UTF-8 en octets pour que toute sauvegarde exportable soit réimportable', () => {
    const text = 'é'.repeat(MAX_FILE_BYTES / 2 + 1);
    expect(() => parseCsv(text, ';')).toThrow('volumineux');
    expect(() => parseBackup(text)).toThrow('volumineuse');
  });
  test.each([
    ['2026-02-27', 31, '2026-01-31', '2026-02-28'],
    ['2028-02-29', 31, '2028-02-29', '2028-03-31'],
    ['2026-12-31', 28, '2026-12-28', '2027-01-28'],
  ])('période de %s avec paie le %i', (today, day, startOn, endOn) => expect(cycleBounds(String(today), Number(day))).toEqual({ startOn, endOn }));
  it('lit BOM, CRLF, guillemets, séparateurs et retours internes', () => {
    expect(parseCsv('\uFEFFDate;Texte;Montant\r\n01/01/2026;"Courses; ""test""\nSuite";-1,29', ';')[1]).toEqual(['01/01/2026', 'Courses; "test"\nSuite', '-1,29']);
  });
  test.each(['a;b\n"x;y', 'a;b\nx;y;z', 'a;b\n"x"oops;y'])('refuse CSV invalide', (text) => expect(() => parseCsv(text, ';')).toThrow());
  it('distingue deux paiements identiques dans le même fichier', () => {
    const rows = previewCsv(parseCsv('Date;Libellé;Montant\n20/01/2026;Courses;-1\n20/01/2026;Courses;-1', ';'), mapping, []);
    expect(rows[0]?.fingerprint).not.toBe(rows[1]?.fingerprint);
  });
  it('exporte les centimes et neutralise les formules de tableur', () => {
    expect(exportCsv([{ ...draft, label: '=1+1', amountCents: 29 }])).toContain('"\'=1+1";0,29;');
    const rows = previewCsv(parseCsv(exportCsv([draft]), ';'), { ...mapping, mode: 'separate', dateFormat: 'iso' }, []);
    expect(rows[0]?.draft).toMatchObject({ amountCents: 8500, occurredOn: draft.occurredOn, kind: 'expense' });
  });
  it('programme avant la résiliation et ignore les rappels passés ou désactivés', () => {
    const row = { id: 'x', label: 'Contrat', dueOn: '2027-03-01', cancelBy: '2027-02-01', remindDays: 7, amountCents: 1000, notificationsEnabled: true };
    expect(renewalReminder(row, new Date(2027, 0, 1))?.timestamp).toBe(new Date(2027, 0, 25, 9).getTime());
    expect(renewalReminder(row, new Date(2027, 1, 1))).toBeNull();
    expect(renewalReminder({ ...row, notificationsEnabled: false }, new Date(2027, 0, 1))).toBeNull();
  });
});
