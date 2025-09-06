// src/stores/departmentFilterStore.ts
import { create } from "zustand";

interface DepartmentFilterState {
  instructors: string[]; // selected instructor names
  courses: string[]; // selected course codes
  drawerOpen: boolean;

  // actions
  setInstructors: (v: string[]) => void;
  setCourses: (v: string[]) => void;
  reset: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
}

export const useDepartmentFilterStore = create<DepartmentFilterState>()(
  (set) => ({
    instructors: [],
    courses: [],
    drawerOpen: false,
    setInstructors: (v) => set({ instructors: v }),
    setCourses: (v) => set({ courses: v }),
    openDrawer: () => set({ drawerOpen: true }),
    closeDrawer: () => set({ drawerOpen: false }),
    toggleDrawer: () => set((s) => ({ drawerOpen: !s.drawerOpen })),
    reset: () =>
      set({
        instructors: [],
        courses: [],
        drawerOpen: false,
      }),
  })
);
