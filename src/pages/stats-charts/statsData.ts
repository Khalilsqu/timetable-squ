import type { Theme } from "@mui/material/styles";
import type { SheetRow } from "@/src/lib/googleSheet";

export type StatsThemeTokens = {
  themeMode: "light" | "dark";
  axisTextColor: string;
  axisTickLabelColor: string;
  gridLineColor: string;
  titleColor: string;
};

export type StatsBaseData = {
  collegeKeys: string[];
  colleges: string[];
  displayCollegeByKey: Map<string, string>;

  semesterKeys: string[];
  displaySemesterByKey: Map<string, string>;

  coursesByCollegeBySem: Map<string, Map<string, Set<string>>>;
  enrollmentByCollegeBySem: Map<string, Map<string, number>>;

  displayDeptByCollegeByKey: Map<string, Map<string, string>>;
  uniqueCoursesByCollegeDeptSem: Map<string, Map<string, Map<string, Set<string>>>>; // college -> dept -> sem -> courses
  enrollmentByCollegeDeptSem: Map<string, Map<string, Map<string, number>>>; // college -> dept -> sem -> enrollment
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
  const uniqueCoursesByCollegeDeptSem = new Map<
    string,
    Map<string, Map<string, Set<string>>>
  >();

  const sectionEnrollmentByKey = new Map<
    string,
    {
      semesterKey: string;
      collegeKey: string;
      departmentKey: string;
      courseKey: string;
      enrollment: number;
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
      });
    } else if (enrollment > prev.enrollment) {
      prev.enrollment = enrollment;
    }
  }

  const semesterKeys = orderSemesterKeys(displaySemesterByKey, semestersList);

  const collegeKeys = [...displayCollegeByKey.keys()].sort((a, b) =>
    (displayCollegeByKey.get(a) ?? a).localeCompare(displayCollegeByKey.get(b) ?? b)
  );
  const colleges = collegeKeys.map((k) => displayCollegeByKey.get(k) ?? k);

  // Enrollment per department: section -> course -> department
  const courseTotals = new Map<string, number>(); // semester|college|dept|course -> total
  for (const s of sectionEnrollmentByKey.values()) {
    const courseId = [s.semesterKey, s.collegeKey, s.departmentKey, s.courseKey].join(
      SEP
    );
    courseTotals.set(courseId, (courseTotals.get(courseId) ?? 0) + s.enrollment);
  }

  const deptTotals = new Map<string, number>(); // semester|college|dept -> total
  for (const [courseId, total] of courseTotals) {
    const [semesterKey, collegeKey, departmentKey] = courseId.split(SEP);
    const deptId = [semesterKey, collegeKey, departmentKey].join(SEP);
    deptTotals.set(deptId, (deptTotals.get(deptId) ?? 0) + total);
  }

  const enrollmentByCollegeBySem = new Map<string, Map<string, number>>();
  const enrollmentByCollegeDeptSem = new Map<
    string,
    Map<string, Map<string, number>>
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

  return {
    collegeKeys,
    colleges,
    displayCollegeByKey,
    semesterKeys,
    displaySemesterByKey,
    coursesByCollegeBySem,
    enrollmentByCollegeBySem,
    displayDeptByCollegeByKey,
    uniqueCoursesByCollegeDeptSem,
    enrollmentByCollegeDeptSem,
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
