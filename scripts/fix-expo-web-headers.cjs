const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

// In single-page mode, Expo answers '/' before Metro's enhanceMiddleware runs.
// The document needs the same isolation headers as SQLite's worker and bundles.
const expoRequire = createRequire(require.resolve('expo/package.json'));
const packagePath = expoRequire.resolve('@expo/cli/package.json');
const { version } = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
if (version !== '57.0.31') {
  console.log(`Expo CLI ${version}: SDK 57.0.31 web-header workaround skipped.`);
  process.exit(0);
}
const filename = path.join(path.dirname(packagePath), 'build/src/start/server/middleware/ManifestMiddleware.js');
const source = fs.readFileSync(filename, 'utf8');
const original = "async handleWebRequestAsync(req, res) {\n        res.setHeader('Content-Type', 'text/html');";
const corrected = "async handleWebRequestAsync(req, res) {\n        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');\n        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');\n        res.setHeader('Content-Type', 'text/html');";
if (source.includes(corrected)) {
  console.log('Expo web document isolation headers: already corrected.');
} else {
  if (source.split(original).length !== 2) throw new Error('Unexpected Expo web manifest source; review the SDK 57.0.31 workaround.');
  fs.writeFileSync(filename, source.replace(original, corrected));
  console.log('Expo web document isolation headers: corrected.');
}
