const fs = require('node:fs');
const path = require('node:path');

// SDK 57.0.4 writes a four-byte response length through a one-byte view.
// SQLite responses above 255 bytes are then truncated by the web client.
const packagePath = require.resolve('expo-sqlite/package.json');
const { version } = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
if (version !== '57.0.4') {
  console.log(`expo-sqlite ${version}: SDK 57.0.4 web workaround skipped.`);
  process.exit(0);
}

const channelPath = path.join(path.dirname(packagePath), 'web', 'WorkerChannel.ts');
const source = fs.readFileSync(channelPath, 'utf8');
const original = 'resultArray.set(new Uint32Array([length]), 0);';
const corrected = 'new Uint32Array(resultBuffer, 0, 1)[0] = length;';

if (source.includes(corrected)) {
  console.log('expo-sqlite web response length: already corrected.');
} else {
  if (source.split(original).length !== 2) {
    throw new Error('Unexpected expo-sqlite web channel source; review the SDK 57.0.4 workaround.');
  }
  fs.writeFileSync(channelPath, source.replace(original, corrected));
  console.log('expo-sqlite web response length: corrected.');
}
