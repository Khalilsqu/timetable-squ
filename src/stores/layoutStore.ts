// src\stores\layoutStore.ts
import { create } from "zustand";

type LayoutStore = {
  isCollapsed: boolean;
  setIsCollapsed: (isCollapsed: boolean) => void;
  isBreakPoint: boolean;
  setIsBreakPoint: (isBreakPoint: boolean) => void;
  isDarkTheme: boolean;
  setIsDarkTheme: (isDarkTheme: boolean) => void;
  showExams: boolean;
  setShowExams: (show: boolean) => void;
};

export const useLayoutStore = create<LayoutStore>((set) => ({
  isCollapsed: false,
  setIsCollapsed: (isCollapsed) => set({ isCollapsed }),
  isBreakPoint: false,
  setIsBreakPoint: (isBreakPoint) => set({ isBreakPoint }),
  isDarkTheme: false,
  setIsDarkTheme: (isDarkTheme) => set({ isDarkTheme }),
  // persistent toggle between course sessions and exams
  showExams: false,
  setShowExams: (show) => set({ showExams: show }),
}));
