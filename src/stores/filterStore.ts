// src\stores\filterStore.ts
import { create } from "zustand";
export interface FilterState {
  colleges: string[];
  departments: string[];
  courses: string[];
  university_elective: boolean;
  university_requirement: boolean;
  semester: string;
  pagination: {
    pageIndex: number;
    pageSize: number;
  };

  /* actions */
  setColleges: (v: string[]) => void;
  setDepartments: (v: string[]) => void;
  setCourses: (v: string[]) => void;
  setElective: (v: boolean | null) => void;
  setRequirement: (v: boolean | null) => void;
  setSemester: (v: string) => void; // NEW
  setPagination: (v: { pageIndex: number; pageSize: number }) => void;

  /*  ► make these required  */
  filteredNumber: number;
  setFilteredNumber: (v: number) => void;

  isFiltering: boolean; // optional, if you want to track filtering state
  setIsFiltering: (v: boolean) => void; // optional, if you want to track filtering state

  reset: () => void;
  softReset: () => void; // NEW (reset *except* semester)
}

export const useFilterStore = create<FilterState>()((set) => ({
  colleges: [],
  departments: [],
  courses: [],
  university_elective: false,
  university_requirement: false,
  filteredNumber: 0,
  isFiltering: false, 
  semester: "",
  pagination: { pageIndex: 0, pageSize: 50 },

  setColleges: (v) => set({ colleges: v }),
  setDepartments: (v) => set({ departments: v }),
  setCourses: (v) => set({ courses: v }),
  setElective: (v) => set({ university_elective: v ?? false }),
  setRequirement: (v) => set({ university_requirement: v ?? false }),
  setIsFiltering: (v) => set({ isFiltering: v }), // NEW
  setFilteredNumber: (v) => set({ filteredNumber: v }),
  setSemester: (v) => set({ semester: v }),
  setPagination: (v) => set({ pagination: v }),

  softReset: () =>
    set((s) => ({
      ...s,
      colleges: [],
      departments: [],
      courses: [],
      university_elective: false,
      university_requirement: false,
      filteredNumber: 0,
      isFiltering: false, // reset filtering state
      pagination: { pageIndex: 0, pageSize: 50 }, // reset pagination
      // keep s.semester
    })),

  reset: () =>
    set({
      colleges: [],
      departments: [],
      courses: [],
      university_elective: false,
      university_requirement: false,
      filteredNumber: 0,
      isFiltering: false, // reset filtering state
      pagination: { pageIndex: 0, pageSize: 50 },
    }),
}));
