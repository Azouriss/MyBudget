import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { drizzle } from 'drizzle-orm/expo-sqlite/driver';
import * as schema from '../schema';
import journal from '../migrations/meta/_journal.json';
import { defaultCategories } from '../../features/categories/defaults';

export function planningDatabase() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  for (const entry of journal.entries) sqlite.exec(readFileSync(join(__dirname, '../migrations', `${entry.tag}.sql`), 'utf8'));
  const client = { prepareSync(query: string) {
    const statement = sqlite.prepare(query);
    return {
      executeSync(params: SQLInputValue[]) {
        if (statement.columns().length) { const rows = statement.all(...params); return { getAllSync: () => rows, getFirstSync: () => rows[0] }; }
        return statement.run(...params);
      },
      executeForRawResultSync(params: SQLInputValue[]) { statement.setReturnArrays(true); return { getAllSync: () => statement.all(...params) }; },
    };
  } };
  const db = drizzle(client as unknown as Parameters<typeof drizzle>[0], { schema });
  for (const category of defaultCategories) db.insert(schema.categories).values(category).run();
  return { db, sqlite };
}
