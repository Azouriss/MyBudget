import { eq } from 'drizzle-orm';
import type { AppDatabase } from '../../db/client';
import { userProfile } from '../../db/schema';
import { defaultProfile, profileSchema, type Profile } from './validation';

export function createProfileRepository(db: AppDatabase) {
  return {
    get(): Profile {
      const row = db.select().from(userProfile).where(eq(userProfile.id, 1)).get();
      return row ? profileSchema.parse({ firstName: row.firstName, lastName: row.lastName, language: row.language })
        : { ...defaultProfile };
    },
    save(values: Profile) {
      const profile = profileSchema.parse(values);
      db.insert(userProfile).values({ id: 1, ...profile })
        .onConflictDoUpdate({ target: userProfile.id, set: profile }).run();
      return profile;
    },
  };
}
