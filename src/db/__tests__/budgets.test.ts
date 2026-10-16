import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { drizzle } from 'drizzle-orm/expo-sqlite/driver';
import * as schema from '../schema';
import { createBudgetRepository } from '../../features/budgets/repository';

describe('migration et dépôt des budgets sur une vraie base SQLite', () => {
  let sqlite: DatabaseSync;
  let repository: ReturnType<typeof createBudgetRepository>;
  beforeEach(() => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec('PRAGMA foreign_keys = ON');
    sqlite.exec(readFileSync(join(__dirname, '../migrations/0000_initial.sql'), 'utf8'));
    sqlite.prepare('INSERT INTO categories VALUES (?, ?, ?, ?, ?, ?)').run('food', 'Alimentation', 'expense', '#577A68', 'shopping', 0);
    sqlite.prepare('INSERT INTO categories VALUES (?, ?, ?, ?, ?, ?)').run('salary', 'Salaire', 'income', '#32765B', 'briefcase', 1);
    sqlite.prepare('INSERT INTO transactions (id, kind, amount_cents, label, category_id, occurred_on, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run('preserved', 'expense', 29, 'Transaction existante', 'food', '2026-10-16', 1, 1);
    sqlite.exec(readFileSync(join(__dirname, '../migrations/0001_monthly_budgets.sql'), 'utf8'));
    sqlite.exec(readFileSync(join(__dirname, '../migrations/0002_zero_budgets.sql'), 'utf8'));
    // Adapt the actual Node SQLite driver to the two synchronous methods used by Drizzle's Expo adapter.
    const client = {
      prepareSync(sql: string) {
        const statement = sqlite.prepare(sql);
        return {
          executeSync(params: SQLInputValue[]) { return statement.run(...params); },
          executeForRawResultSync(params: SQLInputValue[]) {
            statement.setReturnArrays(true);
            return { getAllSync: () => statement.all(...params) };
          },
        };
      },
    };
    repository = createBudgetRepository(drizzle(client as unknown as Parameters<typeof drizzle>[0], { schema }));
  });
  afterEach(() => sqlite.close());

  it('conserve les données existantes lors de la migration', () => {
    expect(sqlite.prepare('SELECT amount_cents FROM transactions WHERE id = ?').get('preserved')?.amount_cents).toBe(29);
    expect(repository.forMonth('2026-10')).toEqual({ monthly: undefined, categories: [] });
  });
  it('crée et modifie une seule limite mensuelle sans toucher au mois voisin', () => {
    repository.setMonthly({ month: '2026-10', amountCents: 120_000 });
    repository.setMonthly({ month: '2026-11', amountCents: 80_000 });
    repository.setMonthly({ month: '2026-10', amountCents: 90_000 });
    expect(repository.forMonth('2026-10').monthly?.amountCents).toBe(90_000);
    expect(repository.forMonth('2026-11').monthly?.amountCents).toBe(80_000);
    expect(sqlite.prepare('SELECT count(*) AS count FROM monthly_budgets').get()?.count).toBe(2);
  });
  it('garde les limites de catégorie indépendantes du budget global', () => {
    repository.setCategory({ month: '2026-10', amountCents: 25_000 }, 'food');
    repository.setMonthly({ month: '2026-10', amountCents: 120_000 });
    repository.removeMonthly('2026-10');
    expect(repository.forMonth('2026-10').categories[0]?.amountCents).toBe(25_000);
    repository.setCategory({ month: '2026-10', amountCents: 30_000 }, 'food');
    expect(repository.forMonth('2026-10').categories).toHaveLength(1);
    repository.removeCategory('2026-10', 'food');
    expect(repository.forMonth('2026-10').categories).toEqual([]);
    expect(sqlite.prepare('SELECT count(*) AS count FROM transactions').get()?.count).toBe(1);
  });
  it('refuse une catégorie de revenu ou inexistante dans le dépôt et dans SQL', () => {
    for (const categoryId of ['salary', 'unknown']) {
      expect(() => repository.setCategory({ month: '2026-10', amountCents: 100 }, categoryId)).toThrow();
      expect(() => sqlite.prepare('INSERT INTO category_budgets (month, category_id, amount_cents, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
        .run('2026-10', categoryId, 100, 1, 1)).toThrow();
    }
  });
  test.each([-1, 1.5, 1_000_000_000])('interdit le montant %s dans les deux tables', (amount) => {
    expect(() => repository.setMonthly({ month: '2026-10', amountCents: amount })).toThrow();
    expect(() => sqlite.prepare('INSERT INTO monthly_budgets VALUES (?, ?, ?, ?)').run('2026-10', amount, 1, 1)).toThrow();
    expect(() => sqlite.prepare('INSERT INTO category_budgets (month, category_id, amount_cents, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run('2026-10', 'food', amount, 1, 1)).toThrow();
  });
  test.each(['2026-00', '2026-13', '2026-1', '1899-12', '2100-01'])('bloque le mois %s dans SQL', (month) => {
    expect(() => sqlite.prepare('INSERT INTO monthly_budgets VALUES (?, ?, ?, ?)').run(month, 100, 1, 1)).toThrow();
    expect(() => sqlite.prepare('INSERT INTO category_budgets (month, category_id, amount_cents, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run(month, 'food', 100, 1, 1)).toThrow();
  });
  it('conserve un budget nul comme une limite explicite et permet ensuite son retrait', () => {
    repository.setMonthly({ month: '2026-10', amountCents: 0 });
    repository.setCategory({ month: '2026-10', amountCents: 0 }, 'food');
    expect(repository.forMonth('2026-10').monthly?.amountCents).toBe(0);
    expect(repository.forMonth('2026-10').categories[0]?.amountCents).toBe(0);
    repository.removeMonthly('2026-10');
    expect(repository.forMonth('2026-10').monthly).toBeUndefined();
    expect(repository.forMonth('2026-10').categories[0]?.amountCents).toBe(0);
  });
  it('préserve les limites déjà enregistrées en passant du schéma initial aux budgets nuls', () => {
    const legacy = new DatabaseSync(':memory:');
    try {
      legacy.exec('PRAGMA foreign_keys = ON');
      legacy.exec(readFileSync(join(__dirname, '../migrations/0000_initial.sql'), 'utf8'));
      legacy.exec(readFileSync(join(__dirname, '../migrations/0001_monthly_budgets.sql'), 'utf8'));
      legacy.prepare('INSERT INTO categories VALUES (?, ?, ?, ?, ?, ?)').run('food', 'Alimentation', 'expense', '#577A68', 'shopping', 0);
      legacy.prepare('INSERT INTO monthly_budgets VALUES (?, ?, ?, ?)').run('2026-10', 120_000, 1, 2);
      legacy.prepare('INSERT INTO category_budgets (month, category_id, amount_cents, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
        .run('2026-10', 'food', 25_000, 1, 2);
      legacy.exec('BEGIN');
      legacy.exec(readFileSync(join(__dirname, '../migrations/0002_zero_budgets.sql'), 'utf8'));
      legacy.exec('COMMIT');
      expect(legacy.prepare('SELECT amount_cents FROM monthly_budgets').get()?.amount_cents).toBe(120_000);
      expect(legacy.prepare('SELECT amount_cents FROM category_budgets').get()?.amount_cents).toBe(25_000);
      expect(legacy.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
      legacy.exec('UPDATE monthly_budgets SET amount_cents = 0');
      expect(legacy.prepare('SELECT amount_cents FROM monthly_budgets').get()?.amount_cents).toBe(0);
    } finally { legacy.close(); }
  });
});
