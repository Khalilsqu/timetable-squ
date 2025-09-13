// src\stores\filterStore.ts
import { create } from "zustand";

export interface FilterState {
  colleges: string[];
  departments: string[];
  courses: string[];
  university_elective: boolean;
  university_requirement: boolean;
  semester: string;
  credit_hours_min: number;
  credit_hours_max: number;
  pagination: { pageIndex: number; pageSize: number };
  level: string;
  course_languages: string[];

  setColleges: (v: string[]) => void;
  setDepartments: (v: string[]) => void;
  setCourses: (v: string[]) => void;
  setElective: (v: boolean) => void; // changed
  setRequirement: (v: boolean) => void; // changed
  setSemester: (v: string) => void;
  setCreditHoursMin: (v: number) => void;
  setCreditHoursMax: (v: number) => void;
  setPagination: (v: { pageIndex: number; pageSize: number }) => void;
  setLevel: (v: string) => void;
  setCourseLanguages: (v: string[]) => void;

  filteredNumber: number;
  setFilteredNumber: (v: number) => void;

  isFiltering: boolean;
  setIsFiltering: (v: boolean) => void;

  reset: () => void;
  softReset: () => void;
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
  credit_hours_min: 0,
  credit_hours_max: 30,
  pagination: { pageIndex: 0, pageSize: 50 },

  // NEW defaults
  level: "",
  course_languages: [],

  setColleges: (v) => set({ colleges: v }),
  setDepartments: (v) => set({ departments: v }),
  setCourses: (v) => set({ courses: v }),
  setElective: (v: boolean) => set({ university_elective: v }), // changed
  setRequirement: (v: boolean) => set({ university_requirement: v }), // changed
  setIsFiltering: (v) => set({ isFiltering: v }),
  setFilteredNumber: (v) => set({ filteredNumber: v }),
  setSemester: (v) => set({ semester: v }),
  setCreditHoursMin: (v: number) => set({ credit_hours_min: v }),
  setCreditHoursMax: (v: number) => set({ credit_hours_max: v }),
  setPagination: (v) => set({ pagination: v }),

  // NEW setters
  setLevel: (v) => set({ level: v }),
  setCourseLanguages: (v) => set({ course_languages: v }),

  softReset: () =>
    set((s) => ({
      ...s,
      colleges: [],
      departments: [],
      courses: [],
      university_elective: false,
      university_requirement: false,
      credit_hours_min: 0,
      credit_hours_max: 30,
      filteredNumber: 0,
      isFiltering: false,
      pagination: { pageIndex: 0, pageSize: 50 },
      // NEW clear
      level: "",
      course_languages: [],
      // keep s.semester
    })),

  reset: () =>
    set({
      colleges: [],
      departments: [],
      courses: [],
      university_elective: false,
      university_requirement: false,
      credit_hours_min: 0,
      credit_hours_max: 30,
      filteredNumber: 0,
      isFiltering: false,
      pagination: { pageIndex: 0, pageSize: 50 },
      semester: "",
      // NEW clear
      level: "",
      course_languages: [],
    }),
}));
