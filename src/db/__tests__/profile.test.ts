import { planningDatabase } from '../test-support/planningDatabase';
import { createProfileRepository } from '../../features/profile/repository';
import { createTransactionRepository } from '../../features/transactions/repository';
import { defaultProfile } from '../../features/profile/validation';
import { makeBackup, parseBackup, restoreBackup } from '../../features/portability/backup';

jest.mock('expo-crypto', () => ({ randomUUID: () => require('node:crypto').randomUUID() }));
const profile = { firstName: ' Élise ', lastName: " D’O'Neil ", language: 'en' } as const;

describe('profil privé sur SQLite isolé', () => {
  let test: ReturnType<typeof planningDatabase>;
  beforeEach(() => { test = planningDatabase(); });
  afterEach(() => test.sqlite.close());
  const repo = () => createProfileRepository(test.db);

  it('utilise le français sans créer de profil ni de transaction à la première lecture', () => {
    expect(repo().get()).toEqual(defaultProfile);
    expect(test.sqlite.prepare('SELECT * FROM user_profile').all()).toEqual([]);
    expect(test.sqlite.prepare('SELECT * FROM transactions').all()).toEqual([]);
  });
  it('conserve accents, apostrophes et langue dans un profil unique, puis permet de vider les noms', () => {
    repo().save(profile);
    expect(createProfileRepository(test.db).get()).toEqual({ firstName: 'Élise', lastName: "D’O'Neil", language: 'en' });
    repo().save({ firstName: "Robert'); DROP TABLE transactions; --", lastName: '', language: 'fr' });
    expect(test.sqlite.prepare('SELECT count(*) AS n FROM user_profile').get()?.n).toBe(1);
    expect(test.sqlite.prepare('SELECT * FROM transactions').all()).toEqual([]);
    repo().save(defaultProfile);
    expect(repo().get()).toEqual(defaultProfile);
  });
  it.each([
    { firstName: 'a'.repeat(81) }, { lastName: 'a'.repeat(81) }, { language: 'de' },
    { firstName: 'A\u0000B' }, { lastName: 'A\nB' }, { firstName: null }, { unexpected: 'field' },
  ])('refuse un profil invalide sans écraser le précédent : %j', (bad) => {
    repo().save(profile);
    const before = repo().get();
    expect(() => repo().save({ ...before, ...bad } as typeof before)).toThrow();
    expect(repo().get()).toEqual(before);
  });
  it.each([[2, 'A', 'B', 'fr'], [1, 'A', 'B', 'de'], [1, 'A'.repeat(81), 'B', 'fr']])(
    'impose aussi les contraintes SQL : %j', (...values) => {
      expect(() => test.sqlite.prepare('INSERT INTO user_profile VALUES (?, ?, ?, ?)').run(...values)).toThrow();
    },
  );
  it('sauvegarde et restaure le profil et sa langue avec les autres données', () => {
    repo().save(profile);
    const saved = makeBackup(test.db);
    repo().save(defaultProfile);
    restoreBackup(test.db, saved);
    expect(repo().get()).toEqual({ firstName: 'Élise', lastName: "D’O'Neil", language: 'en' });
  });
  it('restaure une sauvegarde antérieure au profil, sans perdre ses finances fictives', () => {
    const entries = createTransactionRepository(test.db);
    entries.create({ kind: 'expense', label: 'Courses fictives', amountCents: 1234, categoryId: 'food', occurredOn: '2026-10-20' });
    const legacy = JSON.parse(makeBackup(test.db));
    legacy.migrations = legacy.migrations.slice(0, 7);
    delete legacy.tables.recurring_incomes;
    for (const row of legacy.tables.transactions) { delete row.recurring_income_id; delete row.recurring_income_on; }
    legacy.tables.categories = legacy.tables.categories.filter((c: { id: string }) => !['benefits', 'reimbursements'].includes(c.id));
    delete legacy.tables.user_profile;
    repo().save(profile);
    restoreBackup(test.db, JSON.stringify(legacy));
    expect(repo().get()).toEqual(defaultProfile);
    expect(entries.forMonth('2026-10')[0]).toMatchObject({ label: 'Courses fictives', amountCents: 1234 });
  });
  it('refuse un profil importé invalide et les historiques incomplets sans modifier la base', () => {
    repo().save(profile);
    const saved = makeBackup(test.db);
    for (const change of ['language', 'name', 'duplicate', 'history', 'missing'] as const) {
      const bad = JSON.parse(saved);
      if (change === 'language') bad.tables.user_profile[0].language = 'de';
      if (change === 'name') bad.tables.user_profile[0].first_name = 'x'.repeat(81);
      if (change === 'duplicate') bad.tables.user_profile.push(bad.tables.user_profile[0]);
      if (change === 'history') bad.migrations.splice(2, 1);
      if (change === 'missing') delete bad.tables.user_profile;
      expect(() => restoreBackup(test.db, JSON.stringify(bad))).toThrow();
      expect(parseBackup(makeBackup(test.db)).tables).toEqual(parseBackup(saved).tables);
    }
  });
});
