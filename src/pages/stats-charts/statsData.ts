import type { Theme } from "@mui/material/styles";
import type { SheetRow } from "@/src/lib/googleSheet";

export type StatsThemeTokens = {
  themeMode: "light" | "dark";
  axisTextColor: string;
  axisTickLabelColor: string;
  gridLineColor: string;
  titleColor: string;
};

export type LevelKey = "ug" | "pg";

export const LEVEL_KEYS: LevelKey[] = ["ug", "pg"];

export const LEVEL_LABELS: Record<LevelKey, string> = {
  ug: "UG",
  pg: "PG",
};

export type StatsBaseData = {
  collegeKeys: string[];
  colleges: string[];
  displayCollegeByKey: Map<string, string>;

  semesterKeys: string[];
  displaySemesterByKey: Map<string, string>;

  coursesByCollegeBySem: Map<string, Map<string, Set<string>>>;
  coursesByCollegeBySemLevel: Map<
    string,
    Map<string, Map<LevelKey, Set<string>>>
  >;
  enrollmentByCollegeBySem: Map<string, Map<string, number>>;
  enrollmentByCollegeBySemLevel: Map<
    string,
    Map<string, Map<LevelKey, number>>
  >;

  displayDeptByCollegeByKey: Map<string, Map<string, string>>;
  uniqueCoursesByCollegeDeptSem: Map<string, Map<string, Map<string, Set<string>>>>; // college -> dept -> sem -> courses
  uniqueCoursesByCollegeDeptSemLevel: Map<
    string,
    Map<string, Map<string, Map<LevelKey, Set<string>>>>
  >; // college -> dept -> sem -> level -> courses
  enrollmentByCollegeDeptSem: Map<string, Map<string, Map<string, number>>>; // college -> dept -> sem -> enrollment
  enrollmentByCollegeDeptSemLevel: Map<
    string,
    Map<string, Map<string, Map<LevelKey, number>>>
  >; // college -> dept -> sem -> level -> enrollment
};

export const normalizeKey = (v: unknown) =>
  String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

export const toNumber = (v: unknown): number => {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
};

export function normalizeLevel(v: unknown): LevelKey | null {
  const raw = String(v ?? "").trim().toLowerCase();
  if (!raw) return null;
  if (raw === "ug" || raw.startsWith("undergrad") || raw.includes("undergraduate")) {
    return "ug";
  }
  if (
    raw === "pg" ||
    raw.startsWith("postgrad") ||
    raw.includes("postgraduate") ||
    raw.includes("graduate") ||
    raw.includes("masters") ||
    raw.includes("master") ||
    raw.includes("phd") ||
    raw.includes("doctor")
  ) {
    return "pg";
  }
  return null;
}

export function calcMinWidth(
  categoryCount: number,
  base = 900,
  perCategory = 60
): number {
  return Math.max(base, categoryCount * perCategory);
}

export function getStatsThemeTokens(theme: Theme): StatsThemeTokens {
  return {
    themeMode: theme.palette.mode === "dark" ? "dark" : "light",
    axisTextColor: theme.palette.text.secondary,
    axisTickLabelColor: theme.palette.text.primary,
    gridLineColor: theme.palette.divider,
    titleColor: theme.palette.text.primary,
  };
}

function orderSemesterKeys(
  displaySemesterByKey: Map<string, string>,
  semestersList?: string[]
): string[] {
  const presentSemesterKeys = new Set(displaySemesterByKey.keys());
  const semesterKeys: string[] = [];
  const pushed = new Set<string>();

  for (const sem of semestersList ?? []) {
    const key = normalizeKey(sem);
    if (!presentSemesterKeys.has(key) || pushed.has(key)) continue;
    if (!displaySemesterByKey.has(key)) displaySemesterByKey.set(key, sem);
    semesterKeys.push(key);
    pushed.add(key);
  }

  for (const key of [...presentSemesterKeys].sort((a, b) =>
    (displaySemesterByKey.get(a) ?? a).localeCompare(
      displaySemesterByKey.get(b) ?? b
    )
  )) {
    if (pushed.has(key)) continue;
    semesterKeys.push(key);
    pushed.add(key);
  }

  return semesterKeys;
}

export function buildStatsBase(
  rows: SheetRow[] | undefined,
  semestersList?: string[]
): StatsBaseData | null {
  if (!rows?.length) return null;

  const displayCollegeByKey = new Map<string, string>();
  const displaySemesterByKey = new Map<string, string>();
  const displayDeptByCollegeByKey = new Map<string, Map<string, string>>();

  const coursesByCollegeBySem = new Map<string, Map<string, Set<string>>>();
  const coursesByCollegeBySemLevel = new Map<
    string,
    Map<string, Map<LevelKey, Set<string>>>
  >();
  const uniqueCoursesByCollegeDeptSem = new Map<
    string,
    Map<string, Map<string, Set<string>>>
  >();
  const uniqueCoursesByCollegeDeptSemLevel = new Map<
    string,
    Map<string, Map<string, Map<LevelKey, Set<string>>>>
  >();

  const sectionEnrollmentByKey = new Map<
    string,
    {
      semesterKey: string;
      collegeKey: string;
      departmentKey: string;
      courseKey: string;
      enrollment: number;
      levelKey: LevelKey | null;
    }
  >();

  const SEP = "\u001F";

  for (const row of rows) {
    const collegeRaw = String(row.college ?? "").trim();
    const departmentRaw = String(row.department ?? "").trim();
    const semesterRaw = String(row.semester ?? "").trim();
    const courseRaw = String(row.course_code ?? "").trim();
    if (!collegeRaw || !departmentRaw || !semesterRaw || !courseRaw) continue;

    const collegeKey = normalizeKey(collegeRaw);
    const departmentKey = normalizeKey(departmentRaw);
    const semesterKey = normalizeKey(semesterRaw);
    const courseKey = normalizeKey(courseRaw);
    const levelKey = normalizeLevel(row.level);

    if (!displayCollegeByKey.has(collegeKey)) {
      displayCollegeByKey.set(collegeKey, collegeRaw);
    }
    if (!displaySemesterByKey.has(semesterKey)) {
      displaySemesterByKey.set(semesterKey, semesterRaw);
    }

    let displayDeptByKey = displayDeptByCollegeByKey.get(collegeKey);
    if (!displayDeptByKey) {
      displayDeptByKey = new Map();
      displayDeptByCollegeByKey.set(collegeKey, displayDeptByKey);
    }
    if (!displayDeptByKey.has(departmentKey)) {
      displayDeptByKey.set(departmentKey, departmentRaw);
    }

    // Unique courses per college per semester
    let bySemCollege = coursesByCollegeBySem.get(collegeKey);
    if (!bySemCollege) {
      bySemCollege = new Map();
      coursesByCollegeBySem.set(collegeKey, bySemCollege);
    }
    let collegeCourseSet = bySemCollege.get(semesterKey);
    if (!collegeCourseSet) {
      collegeCourseSet = new Set();
      bySemCollege.set(semesterKey, collegeCourseSet);
    }
    collegeCourseSet.add(courseKey);
    if (levelKey) {
      let bySemCollegeLevel = coursesByCollegeBySemLevel.get(collegeKey);
      if (!bySemCollegeLevel) {
        bySemCollegeLevel = new Map();
        coursesByCollegeBySemLevel.set(collegeKey, bySemCollegeLevel);
      }
      let byLevel = bySemCollegeLevel.get(semesterKey);
      if (!byLevel) {
        byLevel = new Map();
        bySemCollegeLevel.set(semesterKey, byLevel);
      }
      let collegeCourseLevelSet = byLevel.get(levelKey);
      if (!collegeCourseLevelSet) {
        collegeCourseLevelSet = new Set();
        byLevel.set(levelKey, collegeCourseLevelSet);
      }
      collegeCourseLevelSet.add(courseKey);
    }

    // Unique courses per department per semester within a college
    let byDept = uniqueCoursesByCollegeDeptSem.get(collegeKey);
    if (!byDept) {
      byDept = new Map();
      uniqueCoursesByCollegeDeptSem.set(collegeKey, byDept);
    }
    let bySemDept = byDept.get(departmentKey);
    if (!bySemDept) {
      bySemDept = new Map();
      byDept.set(departmentKey, bySemDept);
    }
    let deptCourseSet = bySemDept.get(semesterKey);
    if (!deptCourseSet) {
      deptCourseSet = new Set();
      bySemDept.set(semesterKey, deptCourseSet);
    }
    deptCourseSet.add(courseKey);
    if (levelKey) {
      let byDeptLevel = uniqueCoursesByCollegeDeptSemLevel.get(collegeKey);
      if (!byDeptLevel) {
        byDeptLevel = new Map();
        uniqueCoursesByCollegeDeptSemLevel.set(collegeKey, byDeptLevel);
      }
      let bySemDeptLevel = byDeptLevel.get(departmentKey);
      if (!bySemDeptLevel) {
        bySemDeptLevel = new Map();
        byDeptLevel.set(departmentKey, bySemDeptLevel);
      }
      let byLevel = bySemDeptLevel.get(semesterKey);
      if (!byLevel) {
        byLevel = new Map();
        bySemDeptLevel.set(semesterKey, byLevel);
      }
      let deptCourseLevelSet = byLevel.get(levelKey);
      if (!deptCourseLevelSet) {
        deptCourseLevelSet = new Set();
        byLevel.set(levelKey, deptCourseLevelSet);
      }
      deptCourseLevelSet.add(courseKey);
    }

    // Enrollment: dedupe sessions within the same section (take max enrollment seen)
    const sectionRaw = String(row.section ?? "").trim();
    const enrollment = toNumber(row.students_in_section);
    if (!sectionRaw || enrollment <= 0) continue;

    const sectionKey = normalizeKey(sectionRaw);
    const sectionId = [
      semesterKey,
      collegeKey,
      departmentKey,
      courseKey,
      sectionKey,
    ].join(SEP);

    const prev = sectionEnrollmentByKey.get(sectionId);
    if (!prev) {
      sectionEnrollmentByKey.set(sectionId, {
        semesterKey,
        collegeKey,
        departmentKey,
        courseKey,
        enrollment,
        levelKey,
      });
    } else {
      if (enrollment > prev.enrollment) prev.enrollment = enrollment;
      if (!prev.levelKey && levelKey) prev.levelKey = levelKey;
    }
  }

  const semesterKeys = orderSemesterKeys(displaySemesterByKey, semestersList);

  const collegeKeys = [...displayCollegeByKey.keys()].sort((a, b) =>
    (displayCollegeByKey.get(a) ?? a).localeCompare(displayCollegeByKey.get(b) ?? b)
  );
  const colleges = collegeKeys.map((k) => displayCollegeByKey.get(k) ?? k);

  // Enrollment per department: section -> course -> department
  const courseTotals = new Map<string, number>(); // semester|college|dept|course -> total
  const courseTotalsByLevel = new Map<string, number>(); // semester|college|dept|course|level -> total
  for (const s of sectionEnrollmentByKey.values()) {
    const courseId = [s.semesterKey, s.collegeKey, s.departmentKey, s.courseKey].join(
      SEP
    );
    courseTotals.set(courseId, (courseTotals.get(courseId) ?? 0) + s.enrollment);
    if (s.levelKey) {
      const courseLevelId = [
        s.semesterKey,
        s.collegeKey,
        s.departmentKey,
        s.courseKey,
        s.levelKey,
      ].join(SEP);
      courseTotalsByLevel.set(
        courseLevelId,
        (courseTotalsByLevel.get(courseLevelId) ?? 0) + s.enrollment
      );
    }
  }

  const deptTotals = new Map<string, number>(); // semester|college|dept -> total
  for (const [courseId, total] of courseTotals) {
    const [semesterKey, collegeKey, departmentKey] = courseId.split(SEP);
    const deptId = [semesterKey, collegeKey, departmentKey].join(SEP);
    deptTotals.set(deptId, (deptTotals.get(deptId) ?? 0) + total);
  }

  const deptTotalsByLevel = new Map<string, number>(); // semester|college|dept|level -> total
  for (const [courseLevelId, total] of courseTotalsByLevel) {
    const [semesterKey, collegeKey, departmentKey, , levelKey] =
      courseLevelId.split(SEP);
    const deptId = [semesterKey, collegeKey, departmentKey, levelKey].join(SEP);
    deptTotalsByLevel.set(deptId, (deptTotalsByLevel.get(deptId) ?? 0) + total);
  }

  const enrollmentByCollegeBySem = new Map<string, Map<string, number>>();
  const enrollmentByCollegeBySemLevel = new Map<
    string,
    Map<string, Map<LevelKey, number>>
  >();
  const enrollmentByCollegeDeptSem = new Map<
    string,
    Map<string, Map<string, number>>
  >();
  const enrollmentByCollegeDeptSemLevel = new Map<
    string,
    Map<string, Map<string, Map<LevelKey, number>>>
  >();

  for (const [deptId, total] of deptTotals) {
    const [semesterKey, collegeKey, departmentKey] = deptId.split(SEP);

    // college totals
    let bySemCollege = enrollmentByCollegeBySem.get(collegeKey);
    if (!bySemCollege) {
      bySemCollege = new Map();
      enrollmentByCollegeBySem.set(collegeKey, bySemCollege);
    }
    bySemCollege.set(semesterKey, (bySemCollege.get(semesterKey) ?? 0) + total);

    // dept totals
    let byDept = enrollmentByCollegeDeptSem.get(collegeKey);
    if (!byDept) {
      byDept = new Map();
      enrollmentByCollegeDeptSem.set(collegeKey, byDept);
    }
    let bySemDept = byDept.get(departmentKey);
    if (!bySemDept) {
      bySemDept = new Map();
      byDept.set(departmentKey, bySemDept);
    }
    bySemDept.set(semesterKey, (bySemDept.get(semesterKey) ?? 0) + total);
  }

  for (const [deptLevelId, total] of deptTotalsByLevel) {
    const [semesterKey, collegeKey, departmentKey, levelKeyRaw] =
      deptLevelId.split(SEP);
    const levelKey = levelKeyRaw as LevelKey;

    let bySemCollege = enrollmentByCollegeBySemLevel.get(collegeKey);
    if (!bySemCollege) {
      bySemCollege = new Map();
      enrollmentByCollegeBySemLevel.set(collegeKey, bySemCollege);
    }
    let byLevelCollege = bySemCollege.get(semesterKey);
    if (!byLevelCollege) {
      byLevelCollege = new Map();
      bySemCollege.set(semesterKey, byLevelCollege);
    }
    byLevelCollege.set(levelKey, (byLevelCollege.get(levelKey) ?? 0) + total);

    let byDept = enrollmentByCollegeDeptSemLevel.get(collegeKey);
    if (!byDept) {
      byDept = new Map();
      enrollmentByCollegeDeptSemLevel.set(collegeKey, byDept);
    }
    let bySemDept = byDept.get(departmentKey);
    if (!bySemDept) {
      bySemDept = new Map();
      byDept.set(departmentKey, bySemDept);
    }
    let byLevelDept = bySemDept.get(semesterKey);
    if (!byLevelDept) {
      byLevelDept = new Map();
      bySemDept.set(semesterKey, byLevelDept);
    }
    byLevelDept.set(levelKey, (byLevelDept.get(levelKey) ?? 0) + total);
  }

  return {
    collegeKeys,
    colleges,
    displayCollegeByKey,
    semesterKeys,
    displaySemesterByKey,
    coursesByCollegeBySem,
    coursesByCollegeBySemLevel,
    enrollmentByCollegeBySem,
    enrollmentByCollegeBySemLevel,
    displayDeptByCollegeByKey,
    uniqueCoursesByCollegeDeptSem,
    uniqueCoursesByCollegeDeptSemLevel,
    enrollmentByCollegeDeptSem,
    enrollmentByCollegeDeptSemLevel,
  };
}

export function getCollegeOptions(base: StatsBaseData | null): Array<{
  key: string;
  label: string;
}> {
  if (!base) return [];
  return base.collegeKeys.map((key) => ({
    key,
    label: base.displayCollegeByKey.get(key) ?? key,
  }));
}
