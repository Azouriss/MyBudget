const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
if (process.env.MYBUDGET_ANDROID_DEV_SCRIPT) {
  const filename = path.join(root, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(filename, 'utf8'));
  pkg.scripts.android = process.env.MYBUDGET_ANDROID_DEV_SCRIPT;
  fs.writeFileSync(filename, JSON.stringify(pkg, null, 2) + '\n');
}
const credentialsPath = path.join(root, 'credentials.json');
const signingDirectory = path.join(root, 'signing');
fs.mkdirSync(signingDirectory, { recursive: true });
if (!fs.existsSync(credentialsPath)) {
  const keystorePath = 'signing/mon-budget-release.jks';
  const output = path.join(root, 'dist');
  const hasPreviousApk = fs.existsSync(output) && fs.readdirSync(output).some((name) => name.endsWith('.apk'));
  if (fs.existsSync(path.join(root, keystorePath)) || hasPreviousApk) throw new Error('Clé ou APK existant sans credentials.json : restaurer les paramètres de signature avant de compiler.');
  const password = crypto.randomBytes(32).toString('hex');
  const keytool = path.join(process.env.JAVA_HOME || '', 'bin', 'keytool.exe');
  if (!fs.existsSync(keytool)) throw new Error('JAVA_HOME doit désigner un JDK Windows valide.');
  const result = spawnSync(keytool, ['-genkeypair', '-noprompt', '-storetype', 'JKS', '-keystore', path.join(root, keystorePath),
    '-alias', 'mon-budget', '-keyalg', 'RSA', '-keysize', '4096', '-validity', '10000', '-dname', 'CN=Mon Budget, OU=Application locale, O=Mon Budget, C=FR',
    '-storepass:env', 'MYBUDGET_KEYTOOL_PASSWORD', '-keypass:env', 'MYBUDGET_KEYTOOL_PASSWORD'],
  { env: { ...process.env, MYBUDGET_KEYTOOL_PASSWORD: password }, stdio: 'inherit' });
  if (result.status !== 0) throw new Error('Génération de la clé interrompue.');
  fs.writeFileSync(credentialsPath, JSON.stringify({ android: { keystore: { keystorePath, keystorePassword: password,
    keyAlias: 'mon-budget', keyPassword: password } } }, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  console.log('Clé locale créée. Conserver signing/mon-budget-release.jks et credentials.json pour les mises à jour.');
}
const signing = JSON.parse(fs.readFileSync(credentialsPath, 'utf8')).android?.keystore;
if (!signing || !signing.keystorePassword || !signing.keyPassword || !signing.keyAlias || !fs.existsSync(path.resolve(root, signing.keystorePath))) {
  throw new Error('Clé de signature locale indisponible. Aucun remplacement automatique.');
}
// Preserve font redistribution notices in the APK without adding a settings button.
const notices = path.join(root, 'android/app/src/main/assets/licenses');
fs.mkdirSync(notices, { recursive: true });
fs.copyFileSync(path.join(root, 'assets/fonts/LICENSE.txt'), path.join(notices, 'Inter-OFL.txt'));
fs.copyFileSync(path.join(root, 'assets/fonts/PlayfairDisplay-LICENSE.txt'), path.join(notices, 'PlayfairDisplay-OFL.txt'));
const gradlePath = path.join(root, 'android/app/build.gradle');
let gradle = fs.readFileSync(gradlePath, 'utf8');
const start = '// BEGIN MYBUDGET LOCAL RELEASE';
if (gradle.includes(start)) gradle = gradle.slice(0, gradle.indexOf(start)).trimEnd() + '\n';
gradle += `
${start}
// Passwords are provided only through the build process environment.
android {
    signingConfigs {
        localRelease {
            storeFile file(System.getenv('MYBUDGET_KEYSTORE_PATH'))
            storePassword System.getenv('MYBUDGET_KEYSTORE_PASSWORD')
            keyAlias System.getenv('MYBUDGET_KEY_ALIAS')
            keyPassword System.getenv('MYBUDGET_KEY_PASSWORD')
        }
    }
    buildTypes.release.signingConfig = signingConfigs.localRelease
    defaultConfig.versionCode = Integer.parseInt(findProperty('myBudgetVersionCode') ?: '1')
    externalNativeBuild {
        cmake {
            buildStagingDirectory new File(System.getenv('GRADLE_USER_HOME'), 'cxx-app')
        }
    }
}
// Keep SDKs, dependency caches and previous APKs out of the JS input scan.
tasks.withType(com.facebook.react.tasks.BundleHermesCTask).configureEach {
    sources.exclude('.expo/**', 'dist/**', 'signing/**')
}
// END MYBUDGET LOCAL RELEASE
`;
fs.writeFileSync(gradlePath, gradle);
console.log('Signature release locale configurée ; aucun mot de passe dans les sources Gradle.');
