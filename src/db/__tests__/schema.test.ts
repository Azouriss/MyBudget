import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration SQL et intégrité SQLite', () => {
  let db: DatabaseSync;
  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    db.exec('PRAGMA foreign_keys = ON');
    const sql = readFileSync(join(__dirname, '../migrations/0000_initial.sql'), 'utf8');
    db.exec(sql);
    db.prepare("INSERT INTO categories VALUES (?, ?, ?, ?, ?, ?)").run('food', 'Alimentation', 'expense', '#B3F5D2', 'shopping', 0);
  });
  afterEach(() => { db.close(); });

  function insert(amount: number, category = 'food', label = 'Courses') {
    db.prepare(`INSERT INTO transactions
      (id, kind, amount_cents, label, category_id, occurred_on, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run('tx-1', 'expense', amount, label, category, '2026-10-15', 1, 1);
  }

  it('stocke, modifie et supprime une opération', () => {
    insert(4229);
    expect(db.prepare('SELECT amount_cents FROM transactions').get()?.amount_cents).toBe(4229);
    db.prepare('UPDATE transactions SET amount_cents = ? WHERE id = ?').run(4329, 'tx-1');
    expect(db.prepare('SELECT amount_cents FROM transactions').get()?.amount_cents).toBe(4329);
    db.prepare('DELETE FROM transactions WHERE id = ?').run('tx-1');
    expect(db.prepare('SELECT COUNT(*) AS count FROM transactions').get()?.count).toBe(0);
  });

  test.each([0, -1, 42.29, 1_000_000_000])('bloque le montant invalide %s dans SQLite', (amount) => {
    expect(() => insert(amount)).toThrow();
  });

  it('interdit les catégories absentes, les libellés vides et la suppression d’une catégorie utilisée', () => {
    expect(() => insert(10, 'unknown')).toThrow();
    expect(() => insert(10, 'food', ' ')).toThrow();
    insert(10);
    expect(() => db.prepare('DELETE FROM categories WHERE id = ?').run('food')).toThrow();
  });

  it('ne laisse pas une migration partielle après un échec dans une transaction', () => {
    db.exec('BEGIN');
    try {
      db.exec('CREATE TABLE temporary_migration (id text)');
      db.exec('INSERT INTO table_that_does_not_exist VALUES (1)');
    } catch {
      db.exec('ROLLBACK');
    }
    expect(db.prepare("SELECT name FROM sqlite_master WHERE name = 'temporary_migration'").get()).toBeUndefined();
    expect(db.prepare('SELECT COUNT(*) AS count FROM categories').get()?.count).toBe(1);
  });
});
