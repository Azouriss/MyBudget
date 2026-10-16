import { Directory, File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { MAX_FILE_BYTES } from '../csv/parser';

export async function readUserFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
  if (result.canceled) return null;
  const asset = result.assets[0]!;
  const file = new File(asset.uri);
  try {
    if ((asset.size ?? file.size) > MAX_FILE_BYTES) throw new Error('Fichier trop volumineux (8 Mo maximum).');
    const text = await file.text();
    if (text.length > MAX_FILE_BYTES) throw new Error('Fichier trop volumineux.');
    return text;
  } finally {
    // A provider may return its original URI even when a cache copy was requested.
    if (file.uri.startsWith(Paths.cache.uri.endsWith('/') ? Paths.cache.uri : Paths.cache.uri + '/')) {
      try { file.delete(); } catch { /* Only the picker-created cache copy. */ }
    }
  }
}

export async function writeUserFile(name: string, content: string, mime: string) {
  const directory = await Directory.pickDirectoryAsync();
  const file = directory.createFile(name, mime);
  try { file.write(content); }
  catch { try { file.delete(); } catch { /* Incomplete newly created export only. */ } throw new Error('Le fichier n’a pas pu être enregistré.'); }
}
