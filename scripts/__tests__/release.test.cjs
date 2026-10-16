const { test } = require('node:test');
const assert = require('node:assert/strict');
const { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { checkRelease } = require('../check-release.cjs');
const { lockMigrations } = require('../lock-migrations.cjs');
const { parseBadging, parseCertificates, compareApks } = require('../verify-apk-update.cjs');

const project = path.join(__dirname, '../..');
function fixture(run) {
  const directory = mkdtempSync(path.join(tmpdir(), 'mybudget-release-'));
  try {
    mkdirSync(path.join(directory, 'src/db'), { recursive: true });
    for (const file of ['app.json', 'eas.json', 'package.json', 'package-lock.json', 'release-policy.json', 'src/db/client.ts', 'src/db/migrations']) {
      cpSync(path.join(project, file), path.join(directory, file), { recursive: true });
    }
    const editJson = (file, edit) => {
      const filename = path.join(directory, file);
      const content = JSON.parse(readFileSync(filename, 'utf8'));
      edit(content);
      writeFileSync(filename, JSON.stringify(content));
    };
    run(directory, editJson);
  } finally { rmSync(directory, { recursive: true, force: true }); }
}

test('la configuration courante passe les contrôles de préparation', () => {
  assert.equal(checkRelease(project).androidPackage, 'fr.remid.depenseslocales');
});

for (const [description, file, edit, error] of [
  ['identifiant Android modifié', 'app.json', (value) => { value.expo.android.package += '.new'; }, /Identifiant Android/u],
  ['versions désalignées', 'package.json', (value) => { value.version = '999.0.0'; }, /Aligner la version/u],
  ['incrément désactivé', 'eas.json', (value) => { value.build.preview.autoIncrement = false; }, /incrément/u],
  ['contrôle EAS retiré', 'package.json', (value) => { delete value.scripts['eas-build-post-install']; }, /contrôles/u],
  ['migration retirée', 'src/db/migrations/meta/_journal.json', (value) => { value.entries.pop(); }, /migration/i],
  ['date historique modifiée', 'src/db/migrations/meta/_journal.json', (value) => { value.entries[0].when -= 1; }, /Historique protégé/u],
]) {
  test(`bloque : ${description}`, () => fixture((root, editJson) => {
    editJson(file, edit);
    assert.throws(() => checkRelease(root), error);
  }));
}

test('bloque la modification du SQL protégé', () => fixture((root) => {
  const filename = path.join(root, 'src/db/migrations/0000_initial.sql');
  writeFileSync(filename, readFileSync(filename, 'utf8') + '\nDROP TABLE transactions;');
  assert.throws(() => checkRelease(root), /SQL protégé/u);
}));

test('bloque un changement du nom du fichier SQLite', () => fixture((root) => {
  const filename = path.join(root, 'src/db/client.ts');
  writeFileSync(filename, readFileSync(filename, 'utf8').replace('clair-depenses.db', 'other.db'));
  assert.throws(() => checkRelease(root), /Nom de la base/u);
}));

test('accepte les fins de ligne Windows sans modifier la référence SQL', () => fixture((root) => {
  const filename = path.join(root, 'src/db/migrations/0000_initial.sql');
  writeFileSync(filename, readFileSync(filename, 'utf8').replace(/\r?\n/gu, '\r\n'));
  assert.doesNotThrow(() => checkRelease(root));
}));

test('bloque une migration présente dans le journal mais absente des imports du bundle', () => fixture((root, editJson) => {
  editJson('src/db/migrations/meta/_journal.json', (value) => {
    const previous = value.entries.at(-1);
    value.entries.push({ ...previous, idx: previous.idx + 1, tag: '0003_future', when: previous.when + 1 });
  });
  writeFileSync(path.join(root, 'src/db/migrations/0003_future.sql'), 'SELECT 1;');
  assert.throws(() => checkRelease(root), /import et un export/u);
}));

test('exige la protection d’une nouvelle migration et la permet sans remplacer les empreintes précédentes', () => fixture((root, editJson) => {
  const originalPolicy = JSON.parse(readFileSync(path.join(root, 'release-policy.json'), 'utf8'));
  let tag;
  let key;
  editJson('src/db/migrations/meta/_journal.json', (value) => {
    const previous = value.entries.at(-1);
    const prefix = String(previous.idx + 1).padStart(4, '0');
    tag = `${prefix}_future`;
    key = `m${prefix}`;
    value.entries.push({ ...previous, idx: previous.idx + 1, tag, when: previous.when + 1 });
  });
  writeFileSync(path.join(root, 'src/db/migrations', `${tag}.sql`), 'CREATE TABLE future (id integer);');
  const bundle = path.join(root, 'src/db/migrations/migrations.js');
  writeFileSync(bundle, `import ${key} from './${tag}.sql';\n` + readFileSync(bundle, 'utf8').replace(/migrations:\s*\{([^}]*)\}/u,
    (_match, exports) => `migrations: { ${exports.trim()}, ${key} }`));
  assert.throws(() => checkRelease(root), /non protégée/u);
  assert.equal(lockMigrations(root), 1);
  assert.doesNotThrow(() => checkRelease(root));
  const nextPolicy = JSON.parse(readFileSync(path.join(root, 'release-policy.json'), 'utf8'));
  assert.deepEqual(nextPolicy.migrations.slice(0, originalPolicy.migrations.length), originalPolicy.migrations);
  assert.equal(lockMigrations(root), 0);
}));

test('le verrouillage refuse aussi de recalculer un ancien SQL altéré', () => fixture((root) => {
  const filename = path.join(root, 'src/db/migrations/0000_initial.sql');
  const policyFile = path.join(root, 'release-policy.json');
  const before = readFileSync(policyFile, 'utf8');
  writeFileSync(filename, readFileSync(filename, 'utf8') + '\nDROP TABLE transactions;');
  assert.throws(() => lockMigrations(root), /SQL protégé/u);
  assert.equal(readFileSync(policyFile, 'utf8'), before);
}));

const cert = 'ab'.repeat(32);
const previous = { package: 'fr.remid.depenseslocales', versionCode: 1, version: '0.0.1', debuggable: false, certificates: [cert] };
const candidate = { ...previous, versionCode: 2, version: require('../../app.json').expo.version };

test('accepte un APK plus récent avec la même identité et signature', () => assert.doesNotThrow(() => compareApks(previous, candidate)));
for (const [name, change, error] of [
  ['signature différente', { certificates: ['cd'.repeat(32)] }, /Clé de signature/u],
  ['certificat absent', { certificates: [] }, /Clé de signature/u],
  ['autre application', { package: 'fr.other' }, /Identifiant/u],
  ['version identique', { versionCode: 1 }, /strictement supérieur/u],
  ['retour en arrière', { versionCode: 0 }, /strictement supérieur/u],
  ['version utilisateur incorrecte', { version: '999.0.0' }, /version du nouvel APK/u],
  ['APK de débogage', { debuggable: true }, /débogage/u],
]) {
  test(`refuse l’APK : ${name}`, () => assert.throws(() => compareApks(previous, { ...candidate, ...change }), error));
}

test('lit les métadonnées Android et les certificats, y compris CRLF', () => {
  assert.deepEqual(parseBadging("package: name='fr.remid.depenseslocales' versionCode='12' versionName='0.1.0' platformBuildVersionName='16'\r\nsdkVersion:'24'\r\napplication-debuggable\r\n"), {
    package: 'fr.remid.depenseslocales', versionCode: 12, version: '0.1.0', minSdk: 24, debuggable: true,
  });
  assert.deepEqual(parseCertificates(`Signer #1 certificate SHA-256 digest: ${cert}\r\n`), [cert]);
  assert.throws(() => parseBadging(''), /illisibles/u);
  assert.throws(() => parseCertificates('Verified'), /introuvable/u);
});

test('lit minSdkVersion dans la sortie aapt2 des Build Tools 36', () => {
  assert.deepEqual(parseBadging("package: name='fr.remid.depenseslocales' versionCode='1' versionName='0.1.0' platformBuildVersionName='16' platformBuildVersionCode='36' compileSdkVersion='36' compileSdkVersionCodename='16'\r\nminSdkVersion:'24'\r\ntargetSdkVersion:'36'\r\n"), {
    package: 'fr.remid.depenseslocales', versionCode: 1, version: '0.1.0', minSdk: 24, debuggable: false,
  });
});
