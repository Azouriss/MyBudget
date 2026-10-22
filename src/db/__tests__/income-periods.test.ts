import { planningDatabase } from '../test-support/planningDatabase';
import { createRecurringRepository, materializeDueExpenses } from '../../features/recurring/repository';
import { createTransactionRepository } from '../../features/transactions/repository';
import { createEntryToolsRepository } from '../../features/entry-tools/repository';
import { createPaydayRepository } from '../../features/payday/repository';
import { createPeriodRepository } from '../../features/payday/period';
import { createBudgetRepository } from '../../features/budgets/repository';
import { createForecastRepository } from '../../features/forecast/repository';
import { budgetForecast } from '../../features/forecast/calculations';
import { monthlyReview } from '../../features/review/calculations';
import { monthlySummary, expenseByCategory } from '../../lib/finance';
import { makeBackup, parseBackup, restoreBackup } from '../../features/portability/backup';

jest.mock('expo-crypto', () => ({ randomUUID: () => require('node:crypto').randomUUID() }));
const expense = { kind: 'expense', label: 'Frais bancaires fictifs', amountCents: 1500, categoryId: 'other-expense', subcategoryId: 'other-expense-bank', occurredOn: '2026-10-25' } as const;
const benefit = { kind: 'income', label: 'CAF fictive', amountCents: 23000, categoryId: 'benefits', occurredOn: '2026-10-05' } as const;

describe('revenus, remboursements et budget de paie à paie', () => {
  let test: ReturnType<typeof planningDatabase>;
  beforeEach(() => { jest.useFakeTimers().setSystemTime(new Date(2026, 10, 10, 12)); test = planningDatabase(); });
  afterEach(() => { test.sqlite.close(); jest.useRealTimers(); });
  const entries = () => createTransactionRepository(test.db);
  const periods = () => createPeriodRepository(test.db);
  const tools = () => createEntryToolsRepository(test.db);

  it('compte le 24 inclus et la paie suivante exclue, dans toutes les lectures communes', () => {
    createPaydayRepository(test.db).save(24, false);
    for (const date of ['2026-10-23', '2026-10-24', '2026-11-01', '2026-11-23', '2026-11-24']) entries().create({ ...expense, occurredOn: date });
    expect(periods().forMonth('2026-10')).toEqual({ start: '2026-10-24', end: '2026-11-24' });
    expect(periods().monthForDate('2026-11-23')).toBe('2026-10');
    expect(periods().monthForDate('2026-11-24')).toBe('2026-11');
    const october = entries().forBudgetMonth('2026-10');
    expect(october.map((e) => e.occurredOn)).toEqual(['2026-11-23', '2026-11-01', '2026-10-24']);
    expect(entries().forBudgetMonth('2026-11')).toHaveLength(1);
    expect(monthlySummary(october, '2026-10', periods().forMonth('2026-10')).expenseCents).toBe(4500);
    const all = [...october, ...entries().forBudgetMonth('2026-09')];
    expect(monthlyReview(all, '2026-10', (m) => periods().forMonth(m)).deltaCents).toBe(3000);
    const data = createForecastRepository(test.db).read('2026-11-10');
    expect(data.month).toBe('2026-10');
    expect(budgetForecast(data.entries, 10000, data.today, undefined, data.period)).toMatchObject({ recordedCents: 4500, daysLeft: 14, marginCents: 5500 });
  });

  it('utilise les dates de salaire réellement saisies sans créer de budget ou de revenu', () => {
    createPaydayRepository(test.db).save(24, false);
    entries().saveSalary('2026-10', { ...benefit, categoryId: 'salary', amountCents: 200000, occurredOn: '2026-10-23' });
    entries().saveSalary('2026-11', { ...benefit, categoryId: 'salary', amountCents: 210000, occurredOn: '2026-11-25' });
    const before = test.sqlite.prepare('SELECT total_changes() AS n').get()?.n;
    expect(periods().forMonth('2026-10')).toEqual({ start: '2026-10-23', end: '2026-11-25' });
    expect(periods().monthForDate('2026-11-24')).toBe('2026-10');
    expect(createBudgetRepository(test.db).forMonth('2026-10')).toMatchObject({ monthlySource: 'salary', monthly: { amountCents: 200000 } });
    expect(test.sqlite.prepare('SELECT total_changes() AS n').get()?.n).toBe(before);
    createBudgetRepository(test.db).setMonthly({ month: '2026-10', amountCents: 0 });
    expect(createBudgetRepository(test.db).forMonth('2026-10')).toMatchObject({ monthlySource: 'budget', monthly: { amountCents: 0 } });
  });

  it.each([
    [31, '2028-02', '2028-02-29', '2028-03-31'],
    [31, '2026-02', '2026-02-28', '2026-03-31'],
    [24, '2026-12', '2026-12-24', '2027-01-24'],
  ])('gère la paie le %i en %s', (day, month, start, end) => {
    createPaydayRepository(test.db).save(Number(day), false);
    expect(periods().forMonth(String(month))).toEqual({ start, end });
  });

  it('préserve les mois calendaires sans configuration et les limites de dates', () => {
    expect(periods().forMonth('2026-10')).toEqual({ start: '2026-10-01', end: '2026-11-01' });
    createPaydayRepository(test.db).save(31, false);
    expect(periods().monthForDate('1900-01-01')).toBe('1900-01');
    expect(periods().forMonth('2099-12').end).toBe('2100-01-01');
  });

  it('projette la CAF entre deux paies, sans écriture ni hausse des revenus reçus ou de la marge', () => {
    createPaydayRepository(test.db).save(24, false);
    createRecurringRepository(test.db).saveTransaction(benefit, 'monthly');
    const before = test.sqlite.prepare('SELECT total_changes() AS n').get()?.n;
    const october = entries().withPlannedForBudgetMonth('2026-10', '2026-10-22');
    expect(october).toHaveLength(1);
    expect(october[0]).toMatchObject({ kind: 'income', occurredOn: '2026-11-05', isPlanned: true });
    expect(monthlySummary(october, '2026-10', periods().forMonth('2026-10'))).toMatchObject({ incomeCents: 0, plannedIncomeCents: 23000 });
    expect(budgetForecast(october, 10000, '2026-10-25', undefined, periods().forMonth('2026-10')).marginCents).toBe(10000);
    expect(test.sqlite.prepare('SELECT total_changes() AS n').get()?.n).toBe(before);
    materializeDueExpenses(test.db, '2026-11-05');
    expect(entries().forBudgetMonth('2026-10')).toHaveLength(1);
    expect(monthlySummary(entries().forBudgetMonth('2026-10'), '2026-10', periods().forMonth('2026-10')).incomeCents).toBe(23000);
    expect(materializeDueExpenses(test.db, '2026-11-05').count).toBe(0);
  });

  it('modifie, arrête et reprend les revenus futurs en préservant les anciennes échéances', () => {
    const repo = createRecurringRepository(test.db);
    const first = repo.saveTransaction(benefit, 'monthly');
    const rule = repo.all()[0]!;
    materializeDueExpenses(test.db, '2026-11-05');
    repo.update(rule.id, { ...benefit, amountCents: 25000 }, 'monthly', '2027-01-05');
    expect(repo.plannedForMonth('2027-01', '2026-11-10')[0]?.amountCents).toBe(25000);
    repo.stop(rule.id);
    expect(repo.plannedForMonth('2027-01', '2026-11-10')).toEqual([]);
    repo.update(rule.id, benefit, 'monthly', '2027-02-05');
    materializeDueExpenses(test.db, '2027-02-05');
    expect(entries().find(first)?.amountCents).toBe(23000);
    const last = entries().forMonth('2027-02')[0]!;
    entries().remove(last.id);
    expect(materializeDueExpenses(test.db, '2027-02-05').count).toBe(0);
    expect(test.sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  });

  it('ne recrée pas une échéance déplacée et impose son identité dans SQLite', () => {
    const repo = createRecurringRepository(test.db); repo.saveTransaction(benefit, 'monthly');
    materializeDueExpenses(test.db, '2026-11-05');
    const entry = entries().forMonth('2026-11')[0]!;
    entries().update(entry.id, { ...benefit, occurredOn: '2026-12-01' });
    test.sqlite.exec('UPDATE recurring_incomes SET next_index = 1');
    expect(repo.plannedForMonth('2026-11', '2026-10-22')).toEqual([]);
    materializeDueExpenses(test.db, '2026-11-05');
    expect(entries().forMonth('2026-11')).toEqual([]);
    expect(() => test.sqlite.prepare('UPDATE transactions SET kind = ? WHERE id = ?').run('expense', entry.id)).toThrow();
    expect(() => test.sqlite.prepare('UPDATE transactions SET recurring_income_on = NULL WHERE id = ?').run(entry.id)).toThrow();
    expect(() => repo.saveTransaction({ ...benefit, categoryId: 'food' }, 'monthly')).toThrow();
  });

  it('annule ensemble les revenus et curseurs en cas d’échec', () => {
    const repo = createRecurringRepository(test.db); repo.saveTransaction(benefit, 'monthly');
    test.sqlite.exec("CREATE TRIGGER fail_income BEFORE INSERT ON transactions WHEN NEW.occurred_on = '2026-12-05' BEGIN SELECT RAISE(ABORT, 'probe'); END");
    expect(() => materializeDueExpenses(test.db, '2026-12-05')).toThrow();
    expect(repo.all()[0]?.nextIndex).toBe(1);
    expect(entries().forMonth('2026-11')).toEqual([]);
  });

  it('ne compte aucun remboursement attendu et annule le coût net seulement à réception', () => {
    createPaydayRepository(test.db).save(24, false);
    const id = entries().create(expense); tools().claim(id, 1500, 'Frais bancaires');
    const summary = () => monthlySummary(entries().forBudgetMonth('2026-10'), '2026-10', periods().forMonth('2026-10'));
    expect(summary()).toMatchObject({ expenseCents: 1500, incomeCents: 0, reimbursementCents: 0 });
    tools().receive(id, 500, '2026-11-01'); tools().receive(id, 1000, '2026-11-02');
    expect(summary()).toMatchObject({ grossExpenseCents: 1500, expenseCents: 0, incomeCents: 0, netCents: 0, reimbursementCents: 1500 });
    expect(expenseByCategory(entries().forBudgetMonth('2026-10'))).toEqual([{ categoryId: 'other-expense', amountCents: 0 }]);
    expect(() => tools().receive(id, 1, '2026-11-03')).toThrow();
    expect(() => createRecurringRepository(test.db).saveTransaction({ ...benefit, categoryId: 'reimbursements' }, 'monthly')).toThrow();
    tools().removeClaim(id);
    expect(summary().incomeCents).toBe(0);
    expect(entries().find(tools().claims()[0]!.received[0]!.id)?.reimbursement?.expenseId).toBe(id);
  });

  it('affecte un remboursement ultérieur à sa période de réception sans réécrire le passé', () => {
    createPaydayRepository(test.db).save(24, false);
    const id = entries().create({ ...expense, occurredOn: '2026-09-25' }); tools().claim(id, 1500, 'Frais bancaires');
    tools().receive(id, 1500, '2026-10-25');
    expect(monthlySummary(entries().forBudgetMonth('2026-09'), '2026-09', periods().forMonth('2026-09')).expenseCents).toBe(1500);
    const current = entries().forBudgetMonth('2026-10');
    expect(monthlySummary(current, '2026-10', periods().forMonth('2026-10'))).toMatchObject({ expenseCents: -1500, incomeCents: 0 });
    expect(budgetForecast(current, 10000, '2026-11-10', undefined, periods().forMonth('2026-10')).marginCents).toBe(11500);
    tools().cancelReceipt(tools().claims()[0]!.received[0]!.id);
    expect(entries().forBudgetMonth('2026-10')).toEqual([]);
  });

  it('répartit les remboursements partiels au centime sans dépasser les postes originaux', () => {
    const id = entries().create({ ...expense, amountCents: 999999999 });
    tools().split(id, [{ categoryId: 'food', amountCents: 333333333 }, { categoryId: 'housing', amountCents: 666666666 }]);
    tools().claim(id, 999999999, 'Partage');
    tools().receive(id, 666666667, '2026-10-26'); tools().receive(id, 333333332, '2026-10-27');
    expect(expenseByCategory(entries().forMonth('2026-10'))).toEqual([{ categoryId: 'food', amountCents: 0 }, { categoryId: 'housing', amountCents: 0 }]);
  });

  it('restaure les revenus récurrents et les liens de remboursement', () => {
    const id = entries().create(expense); tools().claim(id, 1500, 'Banque'); tools().receive(id, 1500, '2026-10-26');
    createRecurringRepository(test.db).saveTransaction(benefit, 'monthly');
    const saved = makeBackup(test.db), other = planningDatabase();
    try { restoreBackup(other.db, saved); expect(parseBackup(makeBackup(other.db)).tables).toEqual(parseBackup(saved).tables); }
    finally { other.sqlite.close(); }
  });

  it('importe le schéma précédent et ajoute les catégories sans modifier les finances', () => {
    entries().create(expense);
    const legacy = JSON.parse(makeBackup(test.db)); legacy.migrations.pop(); delete legacy.tables.recurring_incomes;
    for (const row of legacy.tables.transactions) { delete row.recurring_income_id; delete row.recurring_income_on; }
    legacy.tables.categories = legacy.tables.categories.filter((c: { id: string }) => !['benefits', 'reimbursements'].includes(c.id));
    restoreBackup(test.db, JSON.stringify(legacy));
    expect(entries().forMonth('2026-10')[0]).toMatchObject(expense);
    expect(entries().categories().map((c) => c.id)).toEqual(expect.arrayContaining(['benefits', 'reimbursements']));
  });
});
