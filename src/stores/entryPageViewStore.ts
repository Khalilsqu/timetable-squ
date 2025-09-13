import { create } from "zustand";

export type EntryView = "table" | "schedule";

interface EntryPageViewState {
  view: EntryView;
  toggleView: () => void;
  setView: (v: EntryView) => void;
}

export const useEntryPageViewStore = create<EntryPageViewState>((set, get) => ({
  view: "table",
  toggleView: () =>
    set({ view: get().view === "table" ? "schedule" : "table" }),
  setView: (view) => set({ view }),
}));
