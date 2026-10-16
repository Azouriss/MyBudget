import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { TextDecoder, TextEncoder } from 'node:util';
import { ModuleKind, transpileModule } from 'typescript';

type Message = {
  id: number;
  result?: unknown;
  error?: null;
  lockBuffer: SharedArrayBuffer;
  resultBuffer: SharedArrayBuffer;
};
type Channel = {
  sendWorkerResult: (message: { id: number; result: unknown; error: null; syncTrait: Message }) => void;
  invokeWorkerSync: (worker: { postMessage: (message: Message) => void }, type: string, data: object) => unknown;
};

// Exercise the installed SDK's actual sender and receiver, without a browser or database.
function loadTypeScriptModule(filename: string): object {
  const module = { exports: {} };
  const { outputText } = transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ModuleKind.CommonJS },
  });
  runInNewContext(outputText, {
    module, exports: module.exports,
    require: (request: string) => loadTypeScriptModule(join(dirname(filename), `${request}.ts`)),
    __DEV__: false, TextEncoder, TextDecoder,
    Uint8Array, Uint32Array, Int32Array, SharedArrayBuffer, Atomics,
  }, { filename });
  return module.exports;
}

const packageRoot = dirname(require.resolve('expo-sqlite/package.json'));
const channel = loadTypeScriptModule(join(packageRoot, 'web/WorkerChannel.ts')) as Channel;

describe('réponses SQLite synchrones sur le web', () => {
  test.each([32, 255, 256, 1024, 4096])('conserve une réponse de %i caractères', (length) => {
    const result = [{ label: 'Santé et dépenses', note: 'é'.repeat(length) }];
    const worker = {
      postMessage(message: Message) {
        channel.sendWorkerResult({ id: message.id, result, error: null, syncTrait: message });
      },
    };
    expect(channel.invokeWorkerSync(worker, 'getAll', {})).toEqual(result);
  });
});
