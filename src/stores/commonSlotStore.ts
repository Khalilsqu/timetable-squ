import { create } from "zustand";

export type CommonSlotMode = "slot" | "hall";
export type CommonSlotView = "schedule" | "table";

interface CommonSlotState {
  mode: CommonSlotMode;
  start: string;
  end: string;
  days: string[];
  hall: string | null;
  view: CommonSlotView;
  setMode: (m: CommonSlotMode) => void;
  setStart: (v: string) => void;
  setEnd: (v: string) => void;
  setDays: (d: string[]) => void;
  setHall: (h: string | null) => void;
  setView: (v: CommonSlotView) => void;
  reset: () => void;
}

const INITIAL: Omit<
  CommonSlotState,
  | "setMode"
  | "setStart"
  | "setEnd"
  | "setDays"
  | "setHall"
  | "setView"
  | "reset"
> = {
  mode: "slot",
  start: "08:00",
  end: "10:00",
  days: [],
  hall: null,
  view: "schedule",
};

export const useCommonSlotStore = create<CommonSlotState>((set) => ({
  ...INITIAL,
  setMode: (mode) => set({ mode }),
  setStart: (start) => set({ start }),
  setEnd: (end) => set({ end }),
  setDays: (days) => set({ days }),
  setHall: (hall) => set({ hall }),
  setView: (view) => set({ view }),
  reset: () => set({ ...INITIAL }),
}));
