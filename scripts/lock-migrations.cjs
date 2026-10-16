const { readFileSync, writeFileSync } = require('node:fs');
const path = require('node:path');
const { checkRelease, sqlHash } = require('./check-release.cjs');

function lockMigrations(root = path.join(__dirname, '..')) {
  // Existing identities, SQL hashes and journal entries must still match.
  // This command can only append protection; it cannot rebaseline old SQL.
  checkRelease(root, { allowUnfrozen: true });
  const filename = path.join(root, 'release-policy.json');
  const policy = JSON.parse(readFileSync(filename, 'utf8'));
  const journal = JSON.parse(readFileSync(path.join(root, 'src/db/migrations/meta/_journal.json'), 'utf8'));
  const additions = journal.entries.slice(policy.migrations.length).map((entry) => ({
    entry, sha256: sqlHash(readFileSync(path.join(root, 'src/db/migrations', `${entry.tag}.sql`), 'utf8')),
  }));
  if (additions.length) {
    policy.migrations.push(...additions);
    writeFileSync(filename, JSON.stringify(policy, null, 2) + '\n');
  }
  return additions.length;
}

if (require.main === module) {
  try { console.log(`${lockMigrations()} nouvelle(s) migration(s) protégée(s). Relire release-policy.json avant distribution.`); }
  catch (error) { console.error(`Protection interrompue : ${error.message}`); process.exitCode = 1; }
}

module.exports = { lockMigrations };
