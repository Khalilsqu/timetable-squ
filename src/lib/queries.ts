// src/lib/queries.ts ---------------------------------------------------
import { useQuery } from "@tanstack/react-query";
import { fetchSemesters } from "./semesters";
import { fetchSheetData, type SheetRow } from "./googleSheet";
import { fetchSemesterLastUpdate } from "./semesterLastUpdate";

/* 1️⃣  list + active semester ---------------------------------------- */
export const useSemesters = () =>
  useQuery({
    queryKey: ["semesters"],
    queryFn: fetchSemesters,
    staleTime: 30 * 60 * 1_000, // 30 min
  });

/* 2️⃣  timetable rows ------------------------------------------------- */
export const useScheduleRows = (semester: string | null) =>
  useQuery({
    queryKey: ["scheduleRows", semester ?? "all"], // 👈 ONE canonical key
    queryFn: async () => {
      const { rows } = await fetchSheetData(); // fetch once
      if (!semester) return rows; // no filter needed
      return rows.filter(
        (r) => String(r.semester ?? "").toLowerCase() === semester.toLowerCase()
      ) as SheetRow[];
    },
    staleTime: 30 * 60 * 1_000, // keep for 30 min
    refetchOnWindowFocus: false,
  });

/* 3️⃣  semester last update ------------------------------------------ */
export const useSemesterLastUpdate = (semester: string /* may be "" */) =>
  useQuery({
    queryKey: ["semesterLastUpdate", semester], // include semester
    queryFn: () => fetchSemesterLastUpdate(semester),
    staleTime: 24 * 60 * 60 * 1_000,
    refetchOnWindowFocus: false,
    enabled: !!semester, // don’t run until we know it
  });
