import { useStore } from 'zustand';
import { localeStore } from './locale';

// Subscribe each UI component so a saved language change updates visible text.
export function useLanguage() {
  return useStore(localeStore, (state) => state.language);
}
