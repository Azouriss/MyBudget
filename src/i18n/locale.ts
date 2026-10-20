import { createStore } from 'zustand/vanilla';
import en from './en.json';

export type Language = 'fr' | 'en';
export const localeStore = createStore<{ language: Language }>(() => ({ language: 'fr' }));
export const setLanguage = (language: Language) => localeStore.setState({ language });
export const getLocale = () => localeStore.getState().language === 'en' ? 'en-GB' : 'fr-FR';

const english: Readonly<Record<string, string>> = en;
type Value = string | number;

// Only UI messages and bundled category names are translated. User-entered
// labels, names, civil dates, stored IDs and financial records stay untouched.
export function translate(message: string, language: Language, values: readonly Value[] = []): string {
  const leading = message.match(/^\s*/u)![0];
  const trailing = message.match(/\s*$/u)![0];
  const key = message.trim();
  if (!key) return message;
  const text = language === 'en' ? (english[key] ?? key) : key;
  return leading + text.replace(/\{(\d+)\}/gu, (token, index: string) => String(values[Number(index)] ?? token)) + trailing;
}

export function t(message: string | undefined | null, values?: readonly Value[]): string {
  return translate(message ?? '', localeStore.getState().language, values);
}
