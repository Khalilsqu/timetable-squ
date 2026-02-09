import { useQuery } from "@tanstack/react-query";
import { fetchSemesters } from "./semesters";
import { fetchSheetData, type SheetRow } from "./googleSheet";
import { fetchSemesterLastUpdate } from "./semesterLastUpdate";

interface ScheduleSource {
  key: string;
  envName: "VITE_GOOGLE_FALL2025" | "VITE_GOOGLE_SPRING2026";
  url?: string;
  defaultLabel: string;
}

const SCHEDULE_SOURCES: ScheduleSource[] = [
  {
    key: "fall2025",
    envName: "VITE_GOOGLE_FALL2025",
    url: import.meta.env.VITE_GOOGLE_FALL2025 as string | undefined,
    defaultLabel: "fall2025",
  },
  {
    key: "spring2026",
    envName: "VITE_GOOGLE_SPRING2026",
    url: import.meta.env.VITE_GOOGLE_SPRING2026 as string | undefined,
    defaultLabel: "spring2026",
  },
];

const normalizeSemester = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

const semesterMatchesSource = (
  semester: string,
  sourceKey: string,
): boolean => {
  const norm = normalizeSemester(semester);
  if (norm === sourceKey) return true;
  if (sourceKey === "fall2025")
    return norm.includes("fall") && norm.includes("2025");
  if (sourceKey === "spring2026") {
    return norm.includes("spring") && norm.includes("2026");
  }
  return false;
};

const resolveSourceForSemester = (
  semester: string,
): ScheduleSource | undefined =>
  SCHEDULE_SOURCES.find((source) =>
    semesterMatchesSource(semester, source.key),
  );

const withSemester = (rows: SheetRow[], semester: string): SheetRow[] =>
  rows.map((row) => ({ ...row, semester }));

const fetchRowsFromSource = async (
  source: ScheduleSource,
  semesterLabel: string,
): Promise<SheetRow[]> => {
  if (!source.url) throw new Error(`${source.envName} is not set`);
  const { rows } = await fetchSheetData(source.url);
  return withSemester(rows, semesterLabel);
};

const fetchAllRowsAcrossSemesters = async (): Promise<SheetRow[]> => {
  const configured = SCHEDULE_SOURCES.filter((s) => !!s.url);
  if (!configured.length) {
    throw new Error("No semester sheet URL is configured");
  }

  const semInfo = await fetchSemesters().catch(() => null);
  const rowsBySource = await Promise.all(
    configured.map((source) => {
      const displayLabel =
        semInfo?.list.find((sem) => semesterMatchesSource(sem, source.key)) ??
        source.defaultLabel;
      return fetchRowsFromSource(source, displayLabel);
    }),
  );

  return rowsBySource.flat();
};

/* 1 list + active semester ---------------------------------------- */
export const useSemesters = () =>
  useQuery({
    queryKey: ["semesters"],
    queryFn: fetchSemesters,
    staleTime: 30 * 60 * 1_000,
  });

/* 2 timetable rows ------------------------------------------------- */
export const useScheduleRows = (semester: string | null) =>
  useQuery({
    queryKey: ["scheduleRows", semester ?? "all"],
    queryFn: async () => {
      if (!semester) return fetchAllRowsAcrossSemesters();

      const source = resolveSourceForSemester(semester);
      if (!source) {
        throw new Error(
          `No schedule tab mapping found for semester '${semester}'`,
        );
      }

      return fetchRowsFromSource(source, semester);
    },
    staleTime: 30 * 60 * 1_000,
    refetchOnWindowFocus: false,
  });

/* 3 semester last update ------------------------------------------ */
export const useSemesterLastUpdate = (semester: string) =>
  useQuery({
    queryKey: ["semesterLastUpdate", semester],
    queryFn: () => fetchSemesterLastUpdate(semester),
    staleTime: 24 * 60 * 60 * 1_000,
    refetchOnWindowFocus: false,
    enabled: !!semester,
  });
