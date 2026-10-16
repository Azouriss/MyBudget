import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { drizzle } from 'drizzle-orm/expo-sqlite/driver';
import { migrateSafely } from '../migrateSafely';
import journal from '../migrations/meta/_journal.json';

const bundle = {
  journal,
  migrations: Object.fromEntries(journal.entries.map((entry) => [
    `m${String(entry.idx).padStart(4, '0')}`,
    readFileSync(join(__dirname, '../migrations', `${entry.tag}.sql`), 'utf8'),
  ])),
};

function open(filename: string) {
  const sqlite = new DatabaseSync(filename);
  sqlite.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  const client = {
    prepareSync(query: string) {
      const statement = sqlite.prepare(query);
      return {
        executeSync(params: SQLInputValue[]) {
          // Drizzle uses executeSync both for writes and for untyped reads.
          if (statement.columns().length) {
            // ALTER ... ADD ... CHECK can also report result columns. Execute
            // eagerly even when Drizzle only asks for run()'s write result.
            const rows = statement.all(...params);
            return { getAllSync: () => rows, getFirstSync: () => rows[0] };
          }
          return statement.run(...params);
        },
        executeForRawResultSync(params: SQLInputValue[]) {
          statement.setReturnArrays(true);
          return { getAllSync: () => statement.all(...params) };
        },
      };
    },
  };
  return { sqlite, db: drizzle(client as unknown as Parameters<typeof drizzle>[0]) };
}

function seed(sqlite: DatabaseSync, count: number) {
  sqlite.prepare('INSERT INTO categories VALUES (?, ?, ?, ?, ?, ?)').run('food', 'Épicerie', 'expense', '#577A68', 'shopping', 0);
  sqlite.prepare('INSERT INTO categories VALUES (?, ?, ?, ?, ?, ?)').run('salary', 'Salaire', 'income', '#32765B', 'briefcase', 1);
  const insert = sqlite.prepare('INSERT INTO transactions (id, kind, amount_cents, label, category_id, occurred_on, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  insert.run('expense', 'expense', 29, 'Dépense existante', 'food', '2026-10-16', 1, 2);
  insert.run('income', 'income', 120_000, 'Revenu existant', 'salary', '2026-11-01', 3, 4);
  if (count >= 2) {
    sqlite.prepare('INSERT INTO monthly_budgets VALUES (?, ?, ?, ?)').run('2026-10', 120_000, 5, 6);
    sqlite.prepare('INSERT INTO monthly_budgets VALUES (?, ?, ?, ?)').run('2026-11', count >= 3 ? 0 : 80_000, 7, 8);
    sqlite.prepare('INSERT INTO category_budgets VALUES (?, ?, ?, ?, ?, ?)').run('2026-10', 'food', 'expense', 25_000, 9, 10);
  }
  if (count >= 4) {
    sqlite.prepare('INSERT INTO recurring_expenses (id, label, amount_cents, category_id, frequency, start_on, next_index, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run('subscription', 'Abonnement existant', 3900, 'food', 'monthly', '2026-10-01', 1, 1, 11, 12);
    sqlite.prepare('INSERT INTO transactions (id, kind, amount_cents, label, category_id, occurred_on, created_at, updated_at, recurring_expense_id, recurring_occurrence_on) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run('recurring-payment', 'expense', 3900, 'Abonnement existant', 'food', '2026-10-01', 11, 12, 'subscription', '2026-10-01');
    sqlite.prepare('INSERT INTO payday_settings (id, day, notifications_enabled) VALUES (?, ?, ?)').run(1, 28, 0);
  }
  if (count >= 5) {
    sqlite.prepare('UPDATE transactions SET subcategory_id = ? WHERE id = ?').run('food-groceries', 'expense');
    sqlite.prepare('UPDATE recurring_expenses SET subcategory_id = ? WHERE id = ?').run('food-meal-kits', 'subscription');
  }
}

function snapshot(sqlite: DatabaseSync) {
  const tables = ['categories', 'transactions', 'monthly_budgets', 'category_budgets', 'recurring_expenses', 'payday_settings', '__drizzle_migrations'];
  return Object.fromEntries(tables.filter((table) => sqlite.prepare('SELECT name FROM sqlite_master WHERE name = ?').get(table))
    .map((table) => [table, sqlite.prepare(`SELECT * FROM "${table}" ORDER BY rowid`).all()]));
}

describe('mises à niveau via le véritable migrateur Drizzle Expo et SQLite sur disque', () => {
  let directory: string;
  let connection: ReturnType<typeof open>;
  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'mybudget-upgrade-'));
    connection = open(join(directory, 'budget.db'));
  });
  afterEach(() => {
    connection.sqlite.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('installe une base vierge et ne réapplique rien au deuxième démarrage', async () => {
    await migrateSafely(connection.db, bundle);
    const first = snapshot(connection.sqlite);
    await migrateSafely(connection.db, bundle);
    expect(snapshot(connection.sqlite)).toEqual(first);
    expect(first.__drizzle_migrations).toHaveLength(journal.entries.length);
  });

  test.each(journal.entries.map((entry) => entry.idx + 1))('préserve les données après %i migrations, fermeture et réouverture', async (count) => {
    await migrateSafely(connection.db, { ...bundle, journal: { ...journal, entries: journal.entries.slice(0, count) } });
    seed(connection.sqlite, count);
    const before = snapshot(connection.sqlite);
    connection.sqlite.close();
    connection = open(join(directory, 'budget.db'));
    await migrateSafely(connection.db, bundle);
    const after = snapshot(connection.sqlite);
    for (const [table, rows] of Object.entries(before)) {
      if (table === '__drizzle_migrations') continue;
      const actual = after[table]!;
      expect(actual).toHaveLength(rows.length);
      // New nullable columns are compatible. Every existing field and row must
      // retain its exact value, including cents, references and timestamps.
      expect(actual.map((row, index) => Object.fromEntries(Object.keys(rows[index]!).map((key) => [key, row[key]])))).toEqual(rows);
    }
    expect(after.__drizzle_migrations).toHaveLength(journal.entries.length);
    if (count < 5) {
      expect(connection.sqlite.prepare('SELECT subcategory_id FROM transactions').all().every((row) => row.subcategory_id === null)).toBe(true);
      expect(connection.sqlite.prepare('SELECT subcategory_id FROM recurring_expenses').all().every((row) => row.subcategory_id === null)).toBe(true);
    }
    expect(connection.sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    expect(connection.sqlite.prepare('PRAGMA integrity_check').get()?.integrity_check).toBe('ok');
    expect(connection.sqlite.prepare('PRAGMA foreign_keys').get()?.foreign_keys).toBe(1);
    await migrateSafely(connection.db, bundle);
    expect(snapshot(connection.sqlite)).toEqual(after);
  });

  it('annule les écritures et le journal si une migration échoue, puis permet une nouvelle tentative', async () => {
    await migrateSafely(connection.db, bundle);
    seed(connection.sqlite, journal.entries.length);
    const before = snapshot(connection.sqlite);
    const idx = journal.entries.length;
    const key = `m${String(idx).padStart(4, '0')}`;
    const next = { idx, when: journal.entries[journal.entries.length - 1]!.when + 1, tag: 'test_only', breakpoints: true };
    const failing = {
      journal: { ...journal, entries: [...journal.entries, next] },
      migrations: { ...bundle.migrations, [key]: 'CREATE TABLE upgrade_probe (id integer);--> statement-breakpoint\nUPDATE transactions SET amount_cents = 999;--> statement-breakpoint\nINSERT INTO missing_table VALUES (1);' },
    };
    await expect(migrateSafely(connection.db, failing)).rejects.toThrow();
    expect(snapshot(connection.sqlite)).toEqual(before);
    expect(connection.sqlite.prepare("SELECT name FROM sqlite_master WHERE name = 'upgrade_probe'").get()).toBeUndefined();
    await migrateSafely(connection.db, {
      ...failing, migrations: { ...bundle.migrations, [key]: 'CREATE TABLE upgrade_probe (id integer);' },
    });
    expect(connection.sqlite.prepare('SELECT count(*) AS count FROM __drizzle_migrations').get()?.count).toBe(idx + 1);
    expect(connection.sqlite.prepare('SELECT amount_cents FROM transactions WHERE id = ?').get('expense')?.amount_cents).toBe(29);
  });

  it('refuse un ancien binaire sans modifier la base plus récente', async () => {
    await migrateSafely(connection.db, bundle);
    seed(connection.sqlite, journal.entries.length);
    const before = snapshot(connection.sqlite);
    await expect(migrateSafely(connection.db, { ...bundle, journal: { ...journal, entries: journal.entries.slice(0, -1) } })).rejects.toThrow('version plus récente');
    expect(snapshot(connection.sqlite)).toEqual(before);
  });

  it('refuse un historique de migrations inconnu sans réinitialiser les données', async () => {
    await migrateSafely(connection.db, bundle);
    seed(connection.sqlite, journal.entries.length);
    connection.sqlite.exec('UPDATE __drizzle_migrations SET created_at = 1 WHERE created_at = (SELECT min(created_at) FROM __drizzle_migrations)');
    const before = snapshot(connection.sqlite);
    await expect(migrateSafely(connection.db, bundle)).rejects.toThrow();
    expect(snapshot(connection.sqlite)).toEqual(before);
  });
});
