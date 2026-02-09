import { create } from "zustand";

interface SelectionTableState {
  selectedInstructors: string[];
  setSelectedInstructors: (names: string[]) => void;

  // ─── new slices ───
  selectedCollege: string | null;
  setSelectedCollege: (c: string | null) => void;

  selectedDepartment: { department: string; college: string } | null;
  setSelectedDepartment: (
    d: { department: string; college: string } | null,
  ) => void;
}

export const useSelectionTableStore = create<SelectionTableState>((set) => ({
  selectedInstructors: [],
  setSelectedInstructors: (names) => set({ selectedInstructors: names }),

  // init new slices
  selectedCollege: null,
  setSelectedCollege: (c) => set({ selectedCollege: c }),

  selectedDepartment: null,
  setSelectedDepartment: (d) => set({ selectedDepartment: d }),
}));
