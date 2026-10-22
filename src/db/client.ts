import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { openDatabaseAsync } from 'expo-sqlite';
import * as schema from './schema';
import migrations from './migrations/migrations';
import { defaultCategories } from '../features/categories/defaults';
import { migrateSafely } from './migrateSafely';
import { catchUpExpenses } from '../features/recurring/repository';
import { createProfileRepository } from '../features/profile/repository';
import { setLanguage } from '../i18n/locale';
import { createPeriodRepository } from '../features/payday/period';
import { useAppStore } from '../stores/useAppStore';

export const DATABASE_NAME = 'clair-depenses.db';

async function initializeDatabase(): Promise<ExpoSQLiteDatabase<typeof schema>> {
  const sqlite = await openDatabaseAsync(DATABASE_NAME);
  try {
    await sqlite.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
    const db = drizzle(sqlite, { schema });
    // Migration failures leave the app at the recovery screen; never delete/recreate the database.
    await migrateSafely(db, migrations);
    db.transaction((tx) => {
      for (const category of defaultCategories) {
        tx.insert(schema.categories).values(category).onConflictDoNothing().run();
      }
    });
    await catchUpExpenses(db);
    useAppStore.getState().setMonth(createPeriodRepository(db).monthForDate());
    setLanguage(createProfileRepository(db).get().language);
    return db;
  } catch (error) {
    try { await sqlite.closeAsync(); } catch { /* Preserve the original initialization error. */ }
    throw error;
  }
}

export type AppDatabase = Awaited<ReturnType<typeof initializeDatabase>>;
let pending: Promise<AppDatabase> | undefined;

export function getDatabase(): Promise<AppDatabase> {
  if (!pending) {
    pending = initializeDatabase().catch((error: unknown) => {
      pending = undefined;
      throw error;
    });
  }
  return pending;
}
