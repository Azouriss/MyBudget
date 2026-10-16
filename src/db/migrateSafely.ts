import { sql } from 'drizzle-orm';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite/driver';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

type MigrationBundle = Parameters<typeof migrate>[1];

export class DatabaseVersionError extends Error {
  constructor() {
    super('Cette version de l’application ne prend pas en charge la base existante. Installez une version plus récente sans désinstaller l’application.');
    this.name = 'DatabaseVersionError';
  }
}

// Drizzle only compares the latest timestamp. Refuse an older binary or an
// unknown migration history before it can write to a newer database.
export async function migrateSafely<T extends Record<string, unknown>>(
  db: ExpoSQLiteDatabase<T>, bundle: MigrationBundle,
) {
  const ledgerExists = db.get(sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations'`);
  if (ledgerExists) {
    const applied = db.all<{ created_at: number }>(sql`SELECT created_at FROM __drizzle_migrations ORDER BY created_at`);
    if (applied.some((entry, index) => Number(entry.created_at) !== bundle.journal.entries[index]?.when)) {
      throw new DatabaseVersionError();
    }
  }
  // The installed Drizzle Expo migrator applies all pending SQL and its ledger
  // in one transaction, rolling them back together on failure.
  await migrate(db, bundle);
}
