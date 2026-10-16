import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { drizzle } from 'drizzle-orm/expo-sqlite/driver';
import * as schema from '../schema';
import journal from '../migrations/meta/_journal.json';
import { createForecastRepository, ForecastPendingError } from '../../features/forecast/repository';
import { budgetForecast, horizonEnd } from '../../features/forecast/calculations';
import { createProvisionRepository } from '../../features/provisions/repository';
import { provisionPlan } from '../../features/provisions/calculations';
import { createRecurringRepository, materializeDueExpenses } from '../../features/recurring/repository';
import { createTransactionRepository } from '../../features/transactions/repository';
import { createBudgetRepository } from '../../features/budgets/repository';

jest.mock('expo-crypto', () => ({ randomUUID: () => require('node:crypto').randomUUID() }));

describe('prévisions et provisions dans SQLite isolé', () => {
  let sqlite: DatabaseSync;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  const draft = { kind: 'expense', label: 'Énergie', amountCents: 27000, categoryId: 'food', occurredOn: '2026-09-20' } as const;
  const goal = { label: 'Assurance annuelle', targetCents: 60000, dueOn: '2027-04-15', contributionDay: 20 };
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
  function scenario() {
    createRecurringRepository(db).saveTransaction(draft, 'monthly');
    createTransactionRepository(db).create({ ...draft, amountCents: 82000, occurredOn: '2026-10-10' });
    createBudgetRepository(db).setMonthly({ month: '2026-10', amountCents: 150000 });
    return createForecastRepository(db);
  }
  it('calcule 310 euros sans modifier transactions, règles ou curseurs', () => {
    const repository = scenario();
    const changes = sqlite.prepare('SELECT total_changes() AS n').get()?.n;
    const data = repository.read('2026-10-16');
    const result = budgetForecast(data.entries, data.budgets.monthly!.amountCents, data.today, { purchaseCents: 0, reserveCents: 10000 });
    expect(result).toMatchObject({ marginCents: 31000, dailyCents: 1937, daysLeft: 16, plannedCents: 27000, recordedCents: 82000 });
    expect(sqlite.prepare('SELECT total_changes() AS n').get()?.n).toBe(changes);
    expect(createRecurringRepository(db).all()[0]?.nextIndex).toBe(1);
  });
  it('simule un déficit et distingue absence de budget et zéro', () => {
    const data = scenario().read('2026-10-16');
    expect(budgetForecast(data.entries, null, data.today).marginCents).toBeNull();
    expect(budgetForecast(data.entries, 0, data.today).marginCents).toBe(-109000);
    expect(budgetForecast(data.entries, 150000, data.today, { purchaseCents: 40000, reserveCents: 10000 }))
      .toMatchObject({ marginCents: -9000, dailyCents: null });
  });
  it('bloque une marge tant que le rattrapage du jour reste à faire', () => {
    const repository = scenario();
    expect(() => repository.read('2026-10-20')).toThrow(ForecastPendingError);
    materializeDueExpenses(db, '2026-10-20');
    const data = repository.read('2026-10-20');
    expect(budgetForecast(data.entries, 150000, data.today)).toMatchObject({ recordedCents: 109000, plannedCents: 0, marginCents: 41000 });
  });
  it('déduplique une occurrence enregistrée puis déplacée hors du mois', () => {
    const repository = scenario();
    materializeDueExpenses(db, '2026-10-20');
    const recorded = createTransactionRepository(db).forMonth('2026-10').find((entry) => entry.recurringExpenseId)!;
    createTransactionRepository(db).update(recorded.id, { ...draft, occurredOn: '2026-12-01', amountCents: 30000 });
    // Force an old cursor to exercise identity lookup independently from catch-up.
    sqlite.exec('UPDATE recurring_expenses SET next_index = 1');
    expect(budgetForecast(repository.read('2026-10-16').entries, 150000, '2026-10-16').plannedCents).toBe(0);
  });
  it('ne recrée pas une occurrence supprimée après rattrapage', () => {
    const repository = scenario();
    materializeDueExpenses(db, '2026-10-20');
    const recorded = createTransactionRepository(db).forMonth('2026-10').find((entry) => entry.recurringExpenseId)!;
    createTransactionRepository(db).remove(recorded.id);
    const data = repository.read('2026-10-20');
    expect(budgetForecast(data.entries, 150000, data.today).marginCents).toBe(68000);
  });
  it('une règle arrêtée disparaît du prévu, pas des dépenses enregistrées', () => {
    const repository = scenario();
    createRecurringRepository(db).stop(createRecurringRepository(db).all()[0]!.id);
    expect(repository.read('2026-10-16').entries.filter((entry) => entry.isPlanned)).toHaveLength(0);
    expect(createTransactionRepository(db).forMonth('2026-09')).toHaveLength(1);
  });
  it('prend le montant modifié de la règle et la saisie manuelle future sans compter les revenus', () => {
    const repository = scenario();
    sqlite.exec('UPDATE recurring_expenses SET amount_cents = 30000');
    createTransactionRepository(db).create({ ...draft, occurredOn: '2026-10-30', amountCents: 5000 });
    createTransactionRepository(db).create({ ...draft, kind: 'income', categoryId: 'salary', occurredOn: '2026-10-15', amountCents: 250000 });
    expect(budgetForecast(repository.read('2026-10-16').entries, 150000, '2026-10-16').marginCents).toBe(33000);
  });
  it('projette trente jours sur deux mois, mais la marge reste mensuelle', () => {
    createRecurringRepository(db).saveTransaction({ ...draft, occurredOn: '2026-10-31' }, 'monthly');
    createRecurringRepository(db).saveTransaction({ ...draft, occurredOn: '2026-11-05', amountCents: 5000 }, 'monthly');
    const data = createForecastRepository(db).read('2026-11-16');
    expect(data.entries.map((entry) => entry.occurredOn)).toEqual(['2026-11-05', '2026-11-30', '2026-12-05']);
    expect(budgetForecast(data.entries, 100000, data.today).plannedCents).toBe(27000);
  });
  it('préserve les fins de mois bissextiles', () => {
    createRecurringRepository(db).saveTransaction({ ...draft, occurredOn: '2028-01-31' }, 'monthly');
    const data = createForecastRepository(db).read('2028-02-15');
    expect(data.entries[0]?.occurredOn).toBe('2028-02-29');
    expect(budgetForecast(data.entries, 30000, data.today).daysLeft).toBe(15);
  });
  it('borne les trente jours à la fin de 2099', () => {
    createRecurringRepository(db).saveTransaction({ ...draft, occurredOn: '2099-11-30' }, 'monthly');
    expect(createForecastRepository(db).read('2099-12-20').entries[0]?.occurredOn).toBe('2099-12-30');
    expect(horizonEnd('2099-12-20', 30)).toBe('2100-01-01');
  });
  it('enregistre une provision et ses mouvements sans créer de dépense ni changer la marge', () => {
    const forecast = scenario();
    const before = budgetForecast(forecast.read('2026-10-16').entries, 150000, '2026-10-16');
    const repository = createProvisionRepository(db);
    const id = repository.save(goal);
    repository.move(id, 15000);
    repository.move(id, -5000);
    expect(repository.find(id)?.reservedCents).toBe(10000);
    expect(repository.movements(id)).toHaveLength(2);
    expect(budgetForecast(forecast.read('2026-10-16').entries, 150000, '2026-10-16')).toEqual(before);
    expect(createProvisionRepository(db).find(id)?.reservedCents).toBe(10000);
  });
  it('refuse les retraits excessifs et dépassements sans mouvement partiel', () => {
    const repository = createProvisionRepository(db);
    const id = repository.save(goal);
    repository.move(id, 10000);
    for (const value of [-10001, 50001, 0, 0.1, NaN, Infinity]) expect(() => repository.move(id, value)).toThrow();
    expect(repository.find(id)?.reservedCents).toBe(10000);
    expect(repository.movements(id)).toHaveLength(1);
  });
  it('empêche une cible inférieure à la réserve et conserve le journal lors des modifications', () => {
    const repository = createProvisionRepository(db);
    const id = repository.save(goal);
    repository.move(id, 15000);
    expect(() => repository.save({ ...goal, targetCents: 10000 }, id)).toThrow();
    repository.save({ ...goal, label: 'Nouvelle assurance', targetCents: 70000 }, id);
    expect(repository.find(id)).toMatchObject({ label: 'Nouvelle assurance', targetCents: 70000, reservedCents: 15000 });
    expect(repository.movements(id)).toHaveLength(1);
  });
  it('supprime seulement l’objectif choisi et son historique', () => {
    const repository = createProvisionRepository(db);
    const id = repository.save(goal);
    const other = repository.save({ ...goal, label: 'Autre' });
    repository.move(id, 1000);
    repository.move(other, 2000);
    repository.remove(id);
    expect(repository.find(id)).toBeUndefined();
    expect(repository.movements(id)).toEqual([]);
    expect(repository.find(other)?.reservedCents).toBe(2000);
    expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  });
  test.each(['2026-02-29', '2026-04-31', '2026-00-12', '2100-01-01'])('refuse la date %s dans Zod et SQLite', (dueOn) => {
    expect(() => createProvisionRepository(db).save({ ...goal, dueOn })).toThrow();
    expect(() => sqlite.prepare('INSERT INTO provision_goals VALUES (?, ?, ?, ?, ?, ?, ?)').run('bad', 'But', 100, dueOn, 1, 1, 1)).toThrow();
  });
  it('refuse une réserve pour un objectif absent', () => {
    expect(() => createProvisionRepository(db).move('missing', 100)).toThrow();
    expect(() => sqlite.prepare('INSERT INTO provision_movements VALUES (?, ?, ?, ?)').run('bad', 'missing', 100, 1)).toThrow();
  });
});

describe('calendrier des contributions', () => {
  const goal = { label: 'Assurance', targetCents: 60000, dueOn: '2027-04-15', contributionDay: 20 };
  it('compte six contributions avant la facture et calcule 75 euros', () => {
    expect(provisionPlan(goal, 15000, '2026-10-16')).toMatchObject({ contributions: 6, monthlyCents: 7500, remainingCents: 45000 });
  });
  it('écarte le mois courant si la date de contribution est passée', () => {
    expect(provisionPlan(goal, 15000, '2026-10-21').contributions).toBe(5);
  });
  it('inclut une contribution le jour de l’échéance et les mois courts', () => {
    expect(provisionPlan({ ...goal, dueOn: '2028-02-29', contributionDay: 31 }, 0, '2028-02-01').contributions).toBe(1);
  });
  it('expose une échéance dépassée et un objectif déjà rempli', () => {
    expect(provisionPlan(goal, 15000, '2027-04-16')).toMatchObject({ overdue: true, contributions: 0, monthlyCents: null });
    expect(provisionPlan(goal, 60000, '2027-04-16')).toMatchObject({ overdue: false, remainingCents: 0 });
  });
  it('arrondit l’effort au centime supérieur', () => {
    expect(provisionPlan({ ...goal, targetCents: 100 }, 0, '2026-10-16').monthlyCents).toBe(17);
  });
});
