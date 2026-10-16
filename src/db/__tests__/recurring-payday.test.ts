import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { drizzle } from 'drizzle-orm/expo-sqlite/driver';
import * as schema from '../schema';
import journal from '../migrations/meta/_journal.json';
import { createRecurringRepository, materializeDueExpenses } from '../../features/recurring/repository';
import { createTransactionRepository } from '../../features/transactions/repository';
import { createPaydayRepository } from '../../features/payday/repository';
import { occurrenceOn, occurrencesForMonth } from '../../features/recurring/schedule';
import { paydayOn, planSalaryReminders, REMINDER_PREFIX } from '../../features/payday/schedule';
import { reconcileReminders, type ScheduledReminder } from '../../features/payday/notificationPlan';
import { expenseByCategory, monthlySummary } from '../../lib/finance';

jest.mock('expo-crypto', () => ({ randomUUID: () => require('node:crypto').randomUUID() }));

describe('calendriers civils', () => {
  it('retrouve le 31 après février et traite les années bissextiles', () => {
    expect(occurrenceOn('2028-01-31', 'monthly', 1)).toBe('2028-02-29');
    expect(occurrenceOn('2028-01-31', 'monthly', 2)).toBe('2028-03-31');
    expect(occurrenceOn('2028-02-29', 'yearly', 1)).toBe('2029-02-28');
    expect(occurrenceOn('2028-02-29', 'yearly', 4)).toBe('2032-02-29');
    expect(occurrenceOn('2026-03-23', 'weekly', 1)).toBe('2026-03-30');
    expect(occurrenceOn('2099-12-31', 'monthly', 1)).toBeNull();
  });
  it('refuse les dates impossibles et les fréquences ou index invalides', () => {
    expect(() => occurrenceOn('2026-02-30', 'monthly', 1)).toThrow();
    expect(() => occurrenceOn('2026-01-01', 'monthly', -1)).toThrow();
    expect(() => occurrenceOn('2026-01-01', 'daily' as 'monthly', 1)).toThrow();
  });
  test.each([
    ['2028-01-31', 'monthly', 1, '2028-02', ['2028-02-29']],
    ['2028-01-31', 'monthly', 1, '2028-03', ['2028-03-31']],
    ['2026-12-28', 'weekly', 1, '2027-01', ['2027-01-04', '2027-01-11', '2027-01-18', '2027-01-25']],
    ['2028-02-29', 'yearly', 1, '2029-02', ['2029-02-28']],
    ['2028-02-29', 'yearly', 1, '2032-02', ['2032-02-29']],
    ['2028-02-29', 'yearly', 1, '2029-03', []],
    ['2027-03-31', 'monthly', 0, '2027-02', []],
    ['2027-01-31', 'monthly', 3, '2027-02', []],
    ['1900-01-01', 'weekly', 0, '2099-12', ['2099-12-07', '2099-12-14', '2099-12-21', '2099-12-28']],
    ['2099-12-31', 'monthly', 0, '2099-12', ['2099-12-31']],
  ] as const)('projette %s (%s) dans %s sans perdre l’ancrage', (start, frequency, cursor, month, expected) => {
    expect(occurrencesForMonth(start, frequency, cursor, month)).toEqual(expected);
  });
  it('borne le jour de paie et reporte les jours absents', () => {
    expect(paydayOn('2026-02', 31)).toBe('2026-02-28');
    expect(paydayOn('2028-02', 30)).toBe('2028-02-29');
    expect(() => paydayOn('2026-02', 0)).toThrow();
    expect(() => paydayOn('2026-02', 1.5)).toThrow();
  });
});

describe('récurrences et paie sur SQLite réel', () => {
  let sqlite: DatabaseSync;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  beforeEach(() => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec('PRAGMA foreign_keys = ON');
    for (const entry of journal.entries) sqlite.exec(readFileSync(join(__dirname, '../migrations', `${entry.tag}.sql`), 'utf8'));
    sqlite.prepare('INSERT INTO categories VALUES (?, ?, ?, ?, ?, ?)').run('food', 'Alimentation', 'expense', '#577A68', 'shopping', 0);
    sqlite.prepare('INSERT INTO categories VALUES (?, ?, ?, ?, ?, ?)').run('salary', 'Salaire', 'income', '#32765B', 'briefcase', 1);
    const client = { prepareSync(query: string) {
      const statement = sqlite.prepare(query);
      return {
        executeSync(params: SQLInputValue[]) { return statement.run(...params); },
        executeForRawResultSync(params: SQLInputValue[]) { statement.setReturnArrays(true); return { getAllSync: () => statement.all(...params) }; },
      };
    } };
    db = drizzle(client as unknown as Parameters<typeof drizzle>[0], { schema });
  });
  afterEach(() => sqlite.close());
  const draft = { kind: 'expense', label: 'Abonnement', amountCents: 999, categoryId: 'food', occurredOn: '2026-01-31' } as const;
  it('affiche le mois suivant sans écrire de transaction ni avancer le curseur', () => {
    const recurring = createRecurringRepository(db);
    const transactions = createTransactionRepository(db);
    recurring.saveTransaction({ ...draft, subcategoryId: 'food-groceries' }, 'monthly');
    const before = sqlite.prepare('SELECT total_changes() AS n').get()?.n;
    const forecast = transactions.withPlannedForMonth('2026-02', '2026-01-31');
    expect(forecast).toHaveLength(1);
    expect(forecast[0]).toMatchObject({ label: 'Abonnement', amountCents: 999, subcategoryId: 'food-groceries',
      occurredOn: '2026-02-28', recurringExpenseId: recurring.all()[0]!.id, isPlanned: true });
    expect(monthlySummary(forecast, '2026-02').expenseCents).toBe(999);
    expect(expenseByCategory(forecast)).toEqual([{ categoryId: 'food', amountCents: 999 }]);
    expect(transactions.withPlannedForMonth('2026-02', '2026-01-31')).toEqual(forecast);
    expect(transactions.withPlannedForMonth('2026-03', '2026-01-31')[0]?.occurredOn).toBe('2026-03-31');
    expect(transactions.forMonth('2026-02')).toEqual([]);
    expect(recurring.all()[0]!.nextIndex).toBe(1);
    expect(sqlite.prepare('SELECT total_changes() AS n').get()?.n).toBe(before);
  });
  it('garde les mois passés et courant sans prévision et trie les saisies avec les échéances futures', () => {
    createRecurringRepository(db).saveTransaction(draft, 'monthly');
    const transactions = createTransactionRepository(db);
    expect(transactions.withPlannedForMonth('2026-01', '2026-01-01')).toEqual(transactions.forMonth('2026-01'));
    expect(transactions.withPlannedForMonth('2026-02', '2026-03-01')).toEqual([]);
    transactions.create({ ...draft, label: 'Achat prévu fictif', occurredOn: '2026-02-15' });
    const february = transactions.withPlannedForMonth('2026-02', '2026-01-31');
    expect(february.map((item) => item.occurredOn)).toEqual(['2026-02-28', '2026-02-15']);
    expect(february.map((item) => !!item.isPlanned)).toEqual([true, false]);
    expect(() => transactions.withPlannedForMonth('2026-13', '2026-01-31')).toThrow();
    expect(() => transactions.withPlannedForMonth('2026-02', '2026-02-30')).toThrow();
  });
  it('remplace la prévision par l’échéance enregistrée et respecte suppression et déplacement', () => {
    const recurring = createRecurringRepository(db);
    const transactions = createTransactionRepository(db);
    recurring.saveTransaction(draft, 'monthly');
    expect(transactions.withPlannedForMonth('2026-02', '2026-01-31')[0]?.isPlanned).toBe(true);
    materializeDueExpenses(db, '2026-02-28');
    const february = transactions.withPlannedForMonth('2026-02', '2026-01-31');
    expect(february).toHaveLength(1);
    expect(february[0]?.isPlanned).toBeUndefined();
    transactions.update(february[0]!.id, { ...draft, occurredOn: '2026-03-01' });
    expect(transactions.withPlannedForMonth('2026-02', '2026-01-31')).toEqual([]);
    expect(transactions.withPlannedForMonth('2026-03', '2026-01-31')).toHaveLength(2);
    transactions.remove(february[0]!.id);
    expect(transactions.withPlannedForMonth('2026-02', '2026-01-31')).toEqual([]);
  });
  it('ne double pas une échéance déjà saisie même hors du mois de sa date d’origine', () => {
    const recurring = createRecurringRepository(db);
    const transactions = createTransactionRepository(db);
    const id = recurring.saveTransaction({ ...draft, occurredOn: '2027-01-31' }, 'monthly');
    const rule = recurring.all()[0]!;
    recurring.update(rule.id, draft, 'monthly', '2027-01-31');
    expect(transactions.withPlannedForMonth('2027-01', '2026-12-31')).toHaveLength(1);
    transactions.update(id, { ...draft, occurredOn: '2027-02-01' });
    expect(transactions.withPlannedForMonth('2027-01', '2026-12-31')).toEqual([]);
    expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  });
  it('actualise les prévisions après modification, arrêt et reprise sans changer les dépenses enregistrées', () => {
    const recurring = createRecurringRepository(db);
    const transactions = createTransactionRepository(db);
    const id = recurring.saveTransaction({ ...draft, occurredOn: '2027-01-31' }, 'monthly');
    const rule = recurring.all()[0]!;
    expect(transactions.withPlannedForMonth('2027-02', '2026-12-31')[0]?.amountCents).toBe(999);
    recurring.update(rule.id, { ...draft, label: 'Nouveau montant', amountCents: 1299 }, 'monthly', '2027-02-28');
    expect(transactions.withPlannedForMonth('2027-02', '2026-12-31')[0]).toMatchObject({ amountCents: 1299, label: 'Nouveau montant' });
    expect(transactions.withPlannedForMonth('2027-03', '2026-12-31')[0]?.occurredOn).toBe('2027-03-31');
    recurring.stop(rule.id);
    expect(transactions.withPlannedForMonth('2027-02', '2026-12-31')).toEqual([]);
    recurring.update(rule.id, draft, 'yearly', '2028-02-29');
    expect(transactions.withPlannedForMonth('2029-02', '2026-12-31')[0]?.occurredOn).toBe('2029-02-28');
    expect(transactions.find(id)).toMatchObject({ label: 'Abonnement', amountCents: 999, occurredOn: '2027-01-31' });
  });
  it('enregistre, relit, modifie et retire la sous-catégorie sans fragmenter les totaux', () => {
    const repository = createTransactionRepository(db);
    const id = repository.create({ ...draft, subcategoryId: 'food-groceries' });
    expect(repository.find(id)?.subcategoryId).toBe('food-groceries');
    repository.update(id, { ...draft, subcategoryId: 'food-restaurant' });
    expect(repository.forMonth('2026-01')[0]?.subcategoryId).toBe('food-restaurant');
    repository.create({ ...draft, subcategoryId: 'food-bakery' });
    expect(expenseByCategory(repository.forMonth('2026-01'))).toEqual([{ categoryId: 'food', amountCents: 1998 }]);
    expect(monthlySummary(repository.forMonth('2026-01'), '2026-01').expenseCents).toBe(1998);
    repository.update(id, { ...draft, subcategoryId: null });
    expect(repository.find(id)?.subcategoryId).toBeNull();
    expect(() => repository.create({ ...draft, subcategoryId: 'transport-fuel' })).toThrow();
    expect(repository.forMonth('2026-01')).toHaveLength(2);
  });
  it('transmet la sous-catégorie aux échéances et limite ses changements au futur', () => {
    const recurring = createRecurringRepository(db);
    const transactions = createTransactionRepository(db);
    const id = transactions.create({ ...draft, subcategoryId: 'food-groceries' });
    recurring.saveTransaction({ ...draft, subcategoryId: 'food-groceries' }, 'monthly', id);
    const rule = recurring.all()[0]!;
    expect(rule.subcategoryId).toBe('food-groceries');
    materializeDueExpenses(db, '2026-02-28');
    expect(transactions.forMonth('2026-02')[0]?.subcategoryId).toBe('food-groceries');
    recurring.update(rule.id, { ...draft, subcategoryId: 'food-restaurant' }, 'monthly', '2027-01-31');
    materializeDueExpenses(db, '2027-01-31');
    expect(transactions.forMonth('2027-01')[0]?.subcategoryId).toBe('food-restaurant');
    expect(transactions.find(id)?.subcategoryId).toBe('food-groceries');
    recurring.update(rule.id, { ...draft, subcategoryId: null }, 'monthly', '2027-02-28');
    materializeDueExpenses(db, '2027-02-28');
    expect(transactions.forMonth('2027-02')[0]?.subcategoryId).toBeNull();
    expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  });
  it('ajoute les seules échéances dues sans doublon, y compris après suppression ou changement de date d’une occurrence', () => {
    const recurring = createRecurringRepository(db);
    const transactions = createTransactionRepository(db);
    const firstId = recurring.saveTransaction(draft, 'monthly');
    expect(materializeDueExpenses(db, '2026-03-31')).toEqual({ count: 2, more: false });
    expect(transactions.forMonth('2026-02')[0]?.occurredOn).toBe('2026-02-28');
    expect(materializeDueExpenses(db, '2026-03-31').count).toBe(0);
    const feb = transactions.forMonth('2026-02')[0]!;
    transactions.update(feb.id, { ...draft, occurredOn: '2026-02-27' });
    transactions.remove(firstId);
    expect(materializeDueExpenses(db, '2026-03-31').count).toBe(0);
    expect(transactions.forMonth('2026-01')).toHaveLength(0);
    expect(transactions.forMonth('2026-02')).toHaveLength(1);
    expect(transactions.forMonth('2026-04')).toHaveLength(0);
    expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  });
  it('borne les rattrapages et avance leur curseur atomiquement', () => {
    createRecurringRepository(db).saveTransaction({ ...draft, occurredOn: '2026-01-01' }, 'weekly');
    expect(materializeDueExpenses(db, '2026-02-01', 2)).toEqual({ count: 2, more: true });
    expect(materializeDueExpenses(db, '2026-02-01', 2)).toEqual({ count: 2, more: false });
    expect(sqlite.prepare('SELECT count(*) AS n FROM transactions').get()?.n).toBe(5);
  });
  it('annule toutes les échéances et le curseur si une insertion échoue', () => {
    const recurring = createRecurringRepository(db);
    recurring.saveTransaction(draft, 'monthly');
    sqlite.exec("CREATE TRIGGER fail_due BEFORE INSERT ON transactions WHEN NEW.occurred_on = '2026-03-31' BEGIN SELECT RAISE(ABORT, 'probe'); END");
    expect(() => materializeDueExpenses(db, '2026-03-31')).toThrow();
    expect(recurring.all()[0]?.nextIndex).toBe(1);
    expect(sqlite.prepare('SELECT count(*) AS n FROM transactions').get()?.n).toBe(1);
  });
  it('arrête, reprend et modifie le futur en préservant les dépenses passées', () => {
    const repository = createRecurringRepository(db);
    repository.saveTransaction(draft, 'monthly');
    const rule = repository.all()[0]!;
    repository.stop(rule.id);
    expect(materializeDueExpenses(db, '2026-03-31').count).toBe(0);
    repository.update(rule.id, { ...draft, amountCents: 1299 }, 'yearly', '2027-01-31');
    materializeDueExpenses(db, '2027-01-31');
    expect(createTransactionRepository(db).forMonth('2026-01')[0]?.amountCents).toBe(999);
    expect(createTransactionRepository(db).forMonth('2027-01')[0]?.amountCents).toBe(1299);
  });
  it('préserve le jour 31 lors d’un simple changement de montant avant février', () => {
    const repository = createRecurringRepository(db);
    repository.saveTransaction({ ...draft, occurredOn: '2027-01-31' }, 'monthly');
    const rule = repository.all()[0]!;
    repository.update(rule.id, { ...draft, amountCents: 1299 }, 'monthly', '2027-02-28');
    const updated = repository.find(rule.id)!;
    expect(occurrenceOn(updated.startOn, updated.frequency, updated.nextIndex + 1)).toBe('2027-03-31');
  });
  it('refuse revenus, catégories incompatibles et activation multiple de la même transaction', () => {
    const recurring = createRecurringRepository(db);
    expect(() => recurring.saveTransaction({ ...draft, kind: 'income', categoryId: 'salary' }, 'monthly')).toThrow();
    expect(() => recurring.saveTransaction({ ...draft, categoryId: 'salary' }, 'monthly')).toThrow();
    const id = createTransactionRepository(db).create(draft);
    recurring.saveTransaction(draft, 'monthly', id);
    expect(() => recurring.saveTransaction(draft, 'monthly', id)).toThrow();
    expect(recurring.all()).toHaveLength(1);
  });
  it('enregistre les préférences sans créer de revenu et retrouve un salaire saisi manuellement', () => {
    const payday = createPaydayRepository(db);
    payday.save(31, true);
    payday.save(28, false);
    expect(payday.settings()).toMatchObject({ day: 28, notificationsEnabled: false });
    expect(payday.salaryForMonth('2026-10')).toBeUndefined();
    const repository = createTransactionRepository(db);
    const salary = { ...draft, kind: 'income', categoryId: 'salary', occurredOn: '2026-10-01' } as const;
    const id = repository.create(salary);
    expect(repository.saveSalary('2026-10', { ...salary, amountCents: 123456 })).toBe(id);
    expect(repository.forMonth('2026-10')).toHaveLength(1);
    expect(payday.salaryForMonth('2026-10')?.amountCents).toBe(123456);
    expect(payday.recordedMonths()).toEqual(new Set(['2026-10']));
    expect(() => repository.saveSalary('2026-11', salary)).toThrow();
    repository.remove(id);
    expect(payday.salaryForMonth('2026-10')).toBeUndefined();
    payday.remove();
    expect(payday.settings()).toBeUndefined();
  });
  test.each([0, 32, 1.5])('bloque le jour %s dans le dépôt et SQL', (day) => {
    expect(() => createPaydayRepository(db).save(day, true)).toThrow();
    expect(() => sqlite.prepare('INSERT INTO payday_settings VALUES (1, ?, 1)').run(day)).toThrow();
  });
});

describe('notifications locales', () => {
  it('planifie à 9 h locale, ignore les salaires saisis et ne répète pas un rappel déjà passé', () => {
    const plan = planSalaryReminders(31, new Set(['2026-02']), new Date(2026, 0, 1, 8));
    expect(plan).toHaveLength(11);
    const first = new Date(plan[0]!.timestamp);
    expect(first.getDate()).toBe(31);
    expect(first.getHours()).toBe(9);
    expect(planSalaryReminders(1, new Set(), new Date(2026, 0, 1, 10))[0]?.month).toBe('2026-02');
    expect(new Date(planSalaryReminders(31, new Set(), new Date(2026, 1, 1))[0]!.timestamp).getDate()).toBe(28);
  });
  it('ne touche qu’aux rappels de paie, annule le mois payé et reste idempotent', async () => {
    let scheduled: ScheduledReminder[] = [
      { identifier: 'other-feature', content: {} },
      { identifier: `${REMINDER_PREFIX}2026-01`, content: { data: { scheduledFor: 1 } } },
    ];
    const adapter = {
      list: async () => scheduled,
      cancel: jest.fn(async (id: string) => { scheduled = scheduled.filter((r) => r.identifier !== id); }),
      schedule: jest.fn(async (r: { identifier: string; timestamp: number }) => { scheduled.push({ identifier: r.identifier, content: { data: { scheduledFor: r.timestamp } } }); }),
    };
    const desired = planSalaryReminders(28, new Set(['2026-01']), new Date(2026, 0, 1));
    await reconcileReminders(adapter, desired);
    expect(adapter.cancel).toHaveBeenCalledWith(`${REMINDER_PREFIX}2026-01`);
    expect(scheduled.some((r) => r.identifier === 'other-feature')).toBe(true);
    expect(adapter.schedule).toHaveBeenCalledTimes(11);
    await reconcileReminders(adapter, desired);
    expect(adapter.schedule).toHaveBeenCalledTimes(11);
    await reconcileReminders(adapter, []);
    expect(scheduled).toEqual([{ identifier: 'other-feature', content: {} }]);
  });
});
