const { createHash } = require('node:crypto');
const { existsSync, readFileSync, readdirSync } = require('node:fs');
const path = require('node:path');

function sqlHash(source) {
  // Windows and Linux checkouts must produce the same baseline.
  return createHash('sha256').update(source.replace(/\r\n/g, '\n')).digest('hex');
}

function checkRelease(root = path.join(__dirname, '..'), { allowUnfrozen = false } = {}) {
  const read = (file) => readFileSync(path.join(root, file), 'utf8');
  const json = (file) => JSON.parse(read(file));
  const requireCondition = (condition, message) => { if (!condition) throw new Error(message); };
  const policy = json('release-policy.json');
  const app = json('app.json').expo;
  const pkg = json('package.json');
  const lock = json('package-lock.json');
  const eas = json('eas.json');
  requireCondition(policy.schemaVersion === 1, 'Format release-policy.json inconnu.');
  requireCondition(!['app.config.js', 'app.config.ts', 'app.config.cjs', 'app.config.mjs'].some((file) => existsSync(path.join(root, file))),
    'Configuration Expo dynamique détectée : adapter les contrôles avant de compiler.');
  requireCondition(app.android?.package === policy.androidPackage, 'Identifiant Android modifié : les installations existantes ne seraient plus mises à jour.');
  const databaseName = read('src/db/client.ts').match(/export const DATABASE_NAME\s*=\s*['"]([^'"]+)['"]/u)?.[1];
  requireCondition(databaseName === policy.databaseName, 'Nom de la base SQLite modifié : les données existantes ne seraient plus ouvertes.');
  requireCondition(/^\d+\.\d+\.\d+$/u.test(app.version) && pkg.version === app.version
    && lock.version === app.version && lock.packages?.['']?.version === app.version,
  'Aligner la version X.Y.Z dans app.json, package.json et package-lock.json.');
  requireCondition(app.updates?.enabled === false, 'Le parcours de mise à jour hors ligne exige updates.enabled=false.');
  requireCondition(eas.cli?.appVersionSource === 'remote' && eas.build?.preview?.autoIncrement === true,
    'Conserver le versionCode distant et son incrément automatique EAS.');
  requireCondition(eas.build?.preview?.android?.buildType === 'apk' && eas.build.preview.distribution === 'internal'
    && eas.build.preview.developmentClient !== true, 'Le profil preview doit produire un APK autonome de distribution interne.');
  requireCondition(pkg.scripts?.['prebuild:android'] === 'npm run release:check'
    && pkg.scripts?.['eas-build-post-install'] === 'npm run release:check',
  'Les contrôles doivent précéder la compilation locale et la compilation EAS.');

  const folder = 'src/db/migrations';
  const journal = json(`${folder}/meta/_journal.json`);
  requireCondition(journal.dialect === 'sqlite' && Array.isArray(journal.entries) && journal.entries.length > 0, 'Journal SQLite absent ou invalide.');
  const imports = [...read(`${folder}/migrations.js`).matchAll(/import\s+(m\d{4})\s+from\s+['"]\.\/([^'"]+\.sql)['"]/gu)];
  const exported = read(`${folder}/migrations.js`).match(/migrations:\s*\{([^}]*)\}/u)?.[1].split(',').map((value) => value.trim()).filter(Boolean) ?? [];
  requireCondition(imports.length === journal.entries.length && exported.length === journal.entries.length,
    'Chaque migration du journal doit avoir un import et un export explicites.');
  let previousTime = -1;
  for (const [index, entry] of journal.entries.entries()) {
    const key = `m${String(index).padStart(4, '0')}`;
    requireCondition(entry.idx === index && Number.isSafeInteger(entry.when) && entry.when > previousTime
      && new RegExp(`^${String(index).padStart(4, '0')}_[a-z0-9_]+$`, 'u').test(entry.tag)
      && entry.breakpoints === true, `Migration ${index} : ordre, date ou nom invalide.`);
    requireCondition(imports.filter((match) => match[1] === key && match[2] === `${entry.tag}.sql`).length === 1
      && exported.filter((value) => value === key).length === 1, `Migration ${entry.tag} absente du bundle de l’APK.`);
    previousTime = entry.when;
  }
  const files = readdirSync(path.join(root, folder)).filter((file) => file.endsWith('.sql')).sort();
  const expectedFiles = journal.entries.map((entry) => `${entry.tag}.sql`).sort();
  requireCondition(JSON.stringify(files) === JSON.stringify(expectedFiles), 'Fichier SQL non référencé ou manquant dans le journal.');
  requireCondition(Array.isArray(policy.migrations) && policy.migrations.length > 0, 'Référence des migrations protégées absente.');
  for (const [index, frozen] of policy.migrations.entries()) {
    const current = journal.entries[index];
    requireCondition(current && ['idx', 'version', 'when', 'tag', 'breakpoints'].every((key) => current[key] === frozen.entry[key]),
      `Historique protégé modifié à la migration ${index}. Ajouter une nouvelle migration.`);
    requireCondition(sqlHash(read(`${folder}/${current.tag}.sql`)) === frozen.sha256,
      `SQL protégé modifié : ${current.tag}. Ajouter une nouvelle migration.`);
  }
  requireCondition(allowUnfrozen || policy.migrations.length === journal.entries.length,
    'Nouvelle migration non protégée : relire le SQL, tester puis exécuter npm run release:lock-migrations.');
  return { version: app.version, androidPackage: app.android.package, databaseName, migrations: journal.entries.length };
}

if (require.main === module) {
  try {
    const result = checkRelease();
    console.log(`Configuration vérifiée : ${result.androidPackage}, version ${result.version}, ${result.migrations} migrations.`);
    console.log('La signature du fichier APK et la recette de mise à jour Android restent à vérifier séparément.');
  } catch (error) {
    console.error(`Préparation interrompue : ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { checkRelease, sqlHash };
