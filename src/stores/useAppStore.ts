import { create } from 'zustand';
import { currentMonth } from '../lib/dates';
import type { TransactionKind } from '../features/transactions/types';

type AppState = {
  month: string;
  filter: 'all' | TransactionKind;
  revision: number;
  notice: string | null;
  setMonth: (month: string) => void;
  setFilter: (filter: AppState['filter']) => void;
  invalidate: () => void;
  showNotice: (message: string) => void;
  clearNotice: () => void;
};

// Only view state lives here. Financial records are persisted exclusively in SQLite.
export const useAppStore = create<AppState>((set) => ({
  month: currentMonth(),
  filter: 'all',
  revision: 0,
  notice: null,
  setMonth: (month) => set({ month }),
  setFilter: (filter) => set({ filter }),
  invalidate: () => set((state) => ({ revision: state.revision + 1 })),
  showNotice: (notice) => set({ notice }),
  clearNotice: () => set({ notice: null }),
}));
