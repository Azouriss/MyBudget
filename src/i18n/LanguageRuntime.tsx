import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useLanguage } from './useLanguage';
import { useDatabase } from '../db/DatabaseProvider';
import { useAppStore } from '../stores/useAppStore';
import { createProfileRepository } from '../features/profile/repository';
import { setLanguage } from './locale';

export function LanguageRuntime() {
  const language = useLanguage();
  const db = useDatabase();
  const revision = useAppStore((state) => state.revision);
  useEffect(() => {
    try { setLanguage(createProfileRepository(db).get().language); }
    catch { /* A failed read must not overwrite the last known language. */ }
  }, [db, revision]);
  useEffect(() => {
    if (Platform.OS === 'web') document.documentElement.lang = language;
  }, [language]);
  return null;
}
