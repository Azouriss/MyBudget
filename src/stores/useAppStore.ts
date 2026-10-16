import { create } from 'zustand';
import { currentMonth } from '../lib/dates';
import type { TransactionKind } from '../features/transactions/types';

type AppState = {
  month: string;
  filter: 'all' | TransactionKind;
  revision: number;
  notice: string | null;
  noticeId: number;
  setMonth: (month: string) => void;
  setFilter: (filter: AppState['filter']) => void;
  invalidate: () => void;
  showNotice: (message: string) => void;
  clearNotice: (expectedId?: number) => void;
};

// Only view state lives here. Financial records are persisted exclusively in SQLite.
export const useAppStore = create<AppState>((set) => ({
  month: currentMonth(),
  filter: 'all',
  revision: 0,
  notice: null,
  noticeId: 0,
  setMonth: (month) => set({ month }),
  setFilter: (filter) => set({ filter }),
  invalidate: () => set((state) => ({ revision: state.revision + 1 })),
  showNotice: (notice) => set((state) => ({ notice, noticeId: state.noticeId + 1 })),
  clearNotice: (expectedId) => set((state) => expectedId === undefined || expectedId === state.noticeId
    ? { notice: null } : state),
}));
