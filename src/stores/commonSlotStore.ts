import { create } from "zustand";

export type CommonSlotMode = "slot" | "hall";
export type CommonSlotView = "schedule" | "table";
export type TimeFilterMode = "overlap" | "within";

interface CommonSlotState {
  mode: CommonSlotMode;
  start: string;
  end: string;
  days: string[];
  hall: string | null;
  view: CommonSlotView;
  timeMode: TimeFilterMode; // NEW
  setMode: (m: CommonSlotMode) => void;
  setStart: (v: string) => void;
  setEnd: (v: string) => void;
  setDays: (d: string[]) => void;
  setHall: (h: string | null) => void;
  setView: (v: CommonSlotView) => void;
  setTimeMode: (m: TimeFilterMode) => void; // NEW
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
  | "setTimeMode"
  | "reset"
> = {
  mode: "slot",
  start: "08:00",
  end: "10:00",
  days: [],
  hall: null,
  view: "schedule",
  timeMode: "within", // changed default from "overlap" to "within"
};

export const useCommonSlotStore = create<CommonSlotState>((set) => ({
  ...INITIAL,
  setMode: (mode) => set({ mode }),
  setStart: (start) => set({ start }),
  setEnd: (end) => set({ end }),
  setDays: (days) => set({ days }),
  setHall: (hall) => set({ hall }),
  setView: (view) => set({ view }),
  setTimeMode: (timeMode) => set({ timeMode }),
  reset: () => set({ ...INITIAL }),
}));
