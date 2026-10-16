const { createHash } = require('node:crypto');
const { createReadStream, existsSync, readdirSync, statSync } = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const policy = require('../release-policy.json');
const { expo } = require('../app.json');

function parseBadging(output) {
  const match = output.match(/^package: name='([^']+)' versionCode='(\d+)' versionName='([^']*)'/mu);
  const minSdk = output.match(/^(?:minSdkVersion|sdkVersion):'(\d+)'/mu)?.[1];
  if (!match || !minSdk || !Number.isSafeInteger(Number(match[2]))) throw new Error('Métadonnées APK illisibles.');
  return { package: match[1], versionCode: Number(match[2]), version: match[3], minSdk: Number(minSdk), debuggable: /^application-debuggable(?:\r?$|:)/mu.test(output) };
}

function parseCertificates(output) {
  const certificates = [...output.matchAll(/^Signer #\d+ certificate SHA-256 digest: ([a-f\d]{64})\r?$/gimu)]
    .map((match) => match[1].toLowerCase()).sort();
  if (!certificates.length) throw new Error('Empreinte SHA-256 du certificat de signature introuvable.');
  return certificates;
}

function compareApks(previous, candidate, expectedPackage = policy.androidPackage, expectedVersion = expo.version) {
  if (previous.package !== expectedPackage || candidate.package !== expectedPackage) throw new Error('Identifiant Android incompatible.');
  if (previous.debuggable || candidate.debuggable) throw new Error('Utiliser deux APK de distribution, sans mode débogage.');
  if (candidate.versionCode <= previous.versionCode) throw new Error('Le nouvel APK doit avoir un versionCode strictement supérieur.');
  if (candidate.version !== expectedVersion) throw new Error('La version du nouvel APK ne correspond pas au projet.');
  if (!previous.certificates?.length || !candidate.certificates?.length
    || JSON.stringify([...previous.certificates].sort()) !== JSON.stringify([...candidate.certificates].sort())) {
    throw new Error('Clé de signature différente : interrompre la mise à jour, sans désinstaller.');
  }
}

function buildTools(explicit) {
  if (explicit) return path.resolve(explicit);
  const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT
    || (process.platform === 'win32' && process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk'));
  if (!sdk || !existsSync(path.join(sdk, 'build-tools'))) throw new Error('SDK Android introuvable. Fournir --build-tools avec le dossier des Build Tools installés.');
  const versions = readdirSync(path.join(sdk, 'build-tools'))
    .filter((name) => /^\d+\.\d+\.\d+$/u.test(name) && statSync(path.join(sdk, 'build-tools', name)).isDirectory())
    .sort((a, b) => b.localeCompare(a, 'en', { numeric: true }));
  if (!versions.length) throw new Error('Installer les Android SDK Build Tools avant de vérifier les APK.');
  return path.join(sdk, 'build-tools', versions[0]);
}

function run(command, args) {
  try {
    return execFileSync(command, args, { encoding: 'utf8', timeout: 30_000, maxBuffer: 1024 * 1024, windowsHide: true });
  } catch {
    throw new Error(`Échec de ${path.basename(command)} : vérifier Java, les Build Tools et la validité de l’APK. Aucune installation effectuée.`);
  }
}

async function digest(filename) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filename)) hash.update(chunk);
  return hash.digest('hex');
}

async function inspect(filename, tools) {
  const apk = path.resolve(filename);
  if (!statSync(apk).isFile()) throw new Error('Un fichier APK est attendu.');
  const aapt = path.join(tools, process.platform === 'win32' ? 'aapt2.exe' : 'aapt2');
  const jar = path.join(tools, 'lib', 'apksigner.jar');
  if (!existsSync(aapt) || !existsSync(jar)) throw new Error('Dossier Build Tools incomplet : aapt2 et lib/apksigner.jar requis.');
  const java = process.env.JAVA_HOME
    ? path.join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java') : 'java';
  const metadata = parseBadging(run(aapt, ['dump', 'badging', apk]));
  // apksigner must return success before any certificate output is accepted.
  const certificates = parseCertificates(run(java, ['-jar', jar, 'verify', '--print-certs', apk]));
  return { file: apk, ...metadata, certificates, sha256: await digest(apk) };
}

async function main(args) {
  const files = [];
  let explicitTools;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--build-tools' && args[index + 1]) explicitTools = args[++index];
    else if (arg.startsWith('--')) throw new Error(`Option inconnue : ${arg}`);
    else files.push(arg);
  }
  if (files.length !== 2) throw new Error('Usage : npm run release:verify-apk -- ancien.apk nouveau.apk [--build-tools dossier]');
  const tools = buildTools(explicitTools);
  const previous = await inspect(files[0], tools);
  const candidate = await inspect(files[1], tools);
  compareApks(previous, candidate);
  console.log(JSON.stringify({
    status: 'apk-update-compatible', previous, candidate,
    remaining: 'Tester sur Android la mise à jour, la conservation des données et le fonctionnement hors ligne. Vérifier la compatibilité du minSdk avec le téléphone.',
  }, null, 2));
}

if (require.main === module) main(process.argv.slice(2)).catch((error) => {
  console.error(`Vérification interrompue : ${error.message}`);
  process.exitCode = 1;
});

module.exports = { parseBadging, parseCertificates, compareApks };
