import { MAX_FILE_BYTES } from '../csv/parser';

export function readUserFile(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.csv,.json,text/csv,application/json,text/plain';
    input.oncancel = () => resolve(null);
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      if (file.size > MAX_FILE_BYTES) { reject(new Error('Fichier trop volumineux (8 Mo maximum).')); return; }
      file.text().then(resolve, reject);
    };
    input.click();
  });
}
export async function writeUserFile(name: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
