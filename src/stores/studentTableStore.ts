// src\stores\studentTableStore.ts
import { create } from "zustand";

export type Slot = { day: string; start: string; end: string; hall: string };
export type ExamSlot = { date: string; start: string; end: string };
export type SectionOpt = {
  id: string;
  label: string;
  slots: Slot[];
  exam?: ExamSlot;
};

interface TimetableState {
  chosen: SectionOpt[];
  pick: (sec: SectionOpt) => void;
  remove: (id: string) => void;
  clear: () => void;
  allowConflicts: boolean;
  toggleAllowConflicts: () => void;
}

export const useTimetableStore = create<TimetableState>((set) => ({
  chosen: [],
  pick: (sec) => set((s) => ({ chosen: [...s.chosen, sec] })),
  remove: (id) => set((s) => ({ chosen: s.chosen.filter((c) => c.id !== id) })),
  clear: () => set({ chosen: [] }),
  allowConflicts: false,
  toggleAllowConflicts: () =>
    set((s) => ({ allowConflicts: !s.allowConflicts })),
}));
