import { useEffect, useMemo } from "react";
import {
  Autocomplete,
  Box,
  Paper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useSearchParams } from "react-router";
import type { BarSeriesOption } from "echarts/charts";
import StatsEChart from "./StatsEChart";
import { colorForIndex, type StatsChartOption } from "./statsEcharts";
import { calcMinWidth, normalizeKey, type StatsThemeTokens } from "./statsData";
import MyCustomSpinner from "@/src/components/MyCustomSpinner";
import type { SheetRow } from "@/src/lib/googleSheet";

type LevelMode = "university" | "college" | "department";

type NestedHours = Map<string, Map<string, number>>;

type LevelBreakdown = {
  data: NestedHours;
  outerLabels: Map<string, string>;
  innerLabels: Map<string, string>;
};

type TeachingBreakdowns = {
  university: LevelBreakdown;
  college: LevelBreakdown;
  department: LevelBreakdown;
};

const DAY_ORDER: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  weds: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
};

const SEP = "\u001F";

type SessionInterval = {
  start: number;
  end: number;
  collegeKey: string;
  departmentKey: string;
  instructorKey: string;
  courseKey: string;
};

type SlotGroup = {
  day: string;
  start: number;
  end: number;
  collegeKey: string;
  departmentKey: string;
  instructorKey: string;
  courses: Map<string, string>;
};

const HOURS_LEVEL_PARAM = "hoursLevel";
const HOURS_SEMESTER_PARAM = "hoursSemester";
const HOURS_COLLEGE_PARAM = "hoursCollege";
const HOURS_DEPARTMENT_PARAM = "hoursDepartment";
const HOURS_EXCLUDED_SECTION_TYPE_PARAM = "hoursExcludeSectionType";

function asLevelMode(value: string | null): LevelMode | null {
  if (value === "university" || value === "college" || value === "department") {
    return value;
  }
  return null;
}

function sortedUnique(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function sameStringArray(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function addNested(
  target: NestedHours,
  outerKey: string,
  innerKey: string,
  hours: number,
) {
  if (hours <= 0) return;
  let inner = target.get(outerKey);
  if (!inner) {
    inner = new Map();
    target.set(outerKey, inner);
  }
  inner.set(innerKey, (inner.get(innerKey) ?? 0) + hours);
}

function toMinutes(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;
  const match = text.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function canonicalDay(raw: string): string | null {
  const key = raw.trim().toLowerCase();
  const ord = DAY_ORDER[key];
  if (ord === undefined) return null;
  return ["sun", "mon", "tue", "wed", "thu"][ord] ?? null;
}

function extractCanonicalDays(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  const parts = raw.split(/[^A-Za-z]+/).filter(Boolean);
  const seen = new Set<string>();
  const days: string[] = [];
  for (const part of parts) {
    const day = canonicalDay(part);
    if (!day || seen.has(day)) continue;
    seen.add(day);
    days.push(day);
  }
  return days;
}

function buildLevelBreakdown(rows: SheetRow[]): TeachingBreakdowns {
  const universityData: NestedHours = new Map();
  const collegeData: NestedHours = new Map();
  const departmentData: NestedHours = new Map();

  const universityOuterLabels = new Map<string, string>();
  const universityInnerLabels = new Map<string, string>();
  const collegeOuterLabels = new Map<string, string>();
  const collegeInnerLabels = new Map<string, string>();
  const departmentOuterLabels = new Map<string, string>();
  const departmentInnerLabels = new Map<string, string>();

  const byInstructorDay = new Map<string, SessionInterval[]>();
  const slotGroups = new Map<string, SlotGroup>();

  for (const row of rows) {
    const collegeLabel = String(row.college ?? "").trim();
    const departmentLabel = String(row.department ?? "").trim();
    const instructorLabel = String(row.instructor ?? "").trim();
    const courseLabel =
      String(row.course_code ?? "").trim() ||
      String(row.course_name ?? "").trim();
    if (!collegeLabel || !departmentLabel || !instructorLabel || !courseLabel) {
      continue;
    }

    const start = toMinutes(row.start_time);
    const end = toMinutes(row.end_time);
    if (start == null || end == null || end <= start) continue;

    const collegeKey = normalizeKey(collegeLabel);
    const departmentKey = normalizeKey(departmentLabel);
    const instructorKey = normalizeKey(instructorLabel);
    const courseKey = normalizeKey(courseLabel);
    if (!collegeKey || !departmentKey || !instructorKey || !courseKey) continue;

    if (!universityOuterLabels.has(collegeKey)) {
      universityOuterLabels.set(collegeKey, collegeLabel);
    }
    if (!universityInnerLabels.has(departmentKey)) {
      universityInnerLabels.set(departmentKey, departmentLabel);
    }
    if (!collegeOuterLabels.has(departmentKey)) {
      collegeOuterLabels.set(departmentKey, departmentLabel);
    }
    if (!collegeInnerLabels.has(instructorKey)) {
      collegeInnerLabels.set(instructorKey, instructorLabel);
    }
    if (!departmentOuterLabels.has(instructorKey)) {
      departmentOuterLabels.set(instructorKey, instructorLabel);
    }
    if (!departmentInnerLabels.has(courseKey)) {
      departmentInnerLabels.set(courseKey, courseLabel);
    }

    const days = extractCanonicalDays(row.day);
    if (!days.length) continue;

    for (const day of days) {
      // Merge rows that represent the same instructor time slot (common with cross-listed courses)
      const slotKey = [
        instructorKey,
        day,
        String(start),
        String(end),
        collegeKey,
        departmentKey,
      ].join(SEP);
      const existing = slotGroups.get(slotKey);
      if (existing) {
        existing.courses.set(courseKey, courseLabel);
      } else {
        slotGroups.set(slotKey, {
          day,
          start,
          end,
          collegeKey,
          departmentKey,
          instructorKey,
          courses: new Map([[courseKey, courseLabel]]),
        });
      }
    }
  }

  for (const slot of slotGroups.values()) {
    const courseKeys = [...slot.courses.keys()].sort((a, b) => a.localeCompare(b));
    const mergedCourseKey = courseKeys.join("||");
    const mergedCourseLabel = courseKeys
      .map((key) => slot.courses.get(key) ?? key)
      .join(" / ");

    if (!departmentInnerLabels.has(mergedCourseKey)) {
      departmentInnerLabels.set(mergedCourseKey, mergedCourseLabel);
    }

    const bucketKey = `${slot.instructorKey}${SEP}${slot.day}`;
    const sessions = byInstructorDay.get(bucketKey) ?? [];
    sessions.push({
      start: slot.start,
      end: slot.end,
      collegeKey: slot.collegeKey,
      departmentKey: slot.departmentKey,
      instructorKey: slot.instructorKey,
      courseKey: mergedCourseKey,
    });
    byInstructorDay.set(bucketKey, sessions);
  }

  for (const sessions of byInstructorDay.values()) {
    if (!sessions.length) continue;

    const boundaries = new Set<number>();
    for (const s of sessions) {
      boundaries.add(s.start);
      boundaries.add(s.end);
    }
    const points = [...boundaries].sort((a, b) => a - b);
    if (points.length < 2) continue;

    for (let i = 0; i < points.length - 1; i += 1) {
      const segStart = points[i];
      const segEnd = points[i + 1];
      const segmentMinutes = segEnd - segStart;
      if (segmentMinutes <= 0) continue;

      const active = sessions.filter(
        (s) => s.start < segEnd && s.end > segStart,
      );
      if (!active.length) continue;

      const segmentHours = segmentMinutes / 60;

      const universityPairs = new Set<string>();
      const collegePairs = new Set<string>();
      const departmentPairs = new Set<string>();

      for (const s of active) {
        universityPairs.add(`${s.collegeKey}${SEP}${s.departmentKey}`);
        collegePairs.add(`${s.departmentKey}${SEP}${s.instructorKey}`);
        departmentPairs.add(`${s.instructorKey}${SEP}${s.courseKey}`);
      }

      if (universityPairs.size) {
        const share = segmentHours / universityPairs.size;
        for (const pair of universityPairs) {
          const [outerKey, innerKey] = pair.split(SEP);
          addNested(universityData, outerKey, innerKey, share);
        }
      }

      if (collegePairs.size) {
        const share = segmentHours / collegePairs.size;
        for (const pair of collegePairs) {
          const [outerKey, innerKey] = pair.split(SEP);
          addNested(collegeData, outerKey, innerKey, share);
        }
      }

      if (departmentPairs.size) {
        const share = segmentHours / departmentPairs.size;
        for (const pair of departmentPairs) {
          const [outerKey, innerKey] = pair.split(SEP);
          addNested(departmentData, outerKey, innerKey, share);
        }
      }
    }
  }

  return {
    university: {
      data: universityData,
      outerLabels: universityOuterLabels,
      innerLabels: universityInnerLabels,
    },
    college: {
      data: collegeData,
      outerLabels: collegeOuterLabels,
      innerLabels: collegeInnerLabels,
    },
    department: {
      data: departmentData,
      outerLabels: departmentOuterLabels,
      innerLabels: departmentInnerLabels,
    },
  };
}

function sortOuterKeysByTotal(data: NestedHours): string[] {
  const totals = new Map<string, number>();
  for (const [outerKey, inner] of data) {
    const total = [...inner.values()].reduce((acc, v) => acc + v, 0);
    totals.set(outerKey, total);
  }
  return [...data.keys()].sort(
    (a, b) => (totals.get(b) ?? 0) - (totals.get(a) ?? 0),
  );
}

function sortInnerKeysByTotal(data: NestedHours): string[] {
  const totals = new Map<string, number>();
  for (const inner of data.values()) {
    for (const [innerKey, value] of inner) {
      totals.set(innerKey, (totals.get(innerKey) ?? 0) + value);
    }
  }
  return [...totals.keys()].sort(
    (a, b) => (totals.get(b) ?? 0) - (totals.get(a) ?? 0),
  );
}

function buildTitle(level: LevelMode, semester: string): string {
  const suffix = semester ? ` - ${semester}` : "";
  if (level === "university") {
    return `Teaching hours by college (stacked by department)${suffix}`;
  }
  if (level === "college") {
    return `Teaching hours by department (stacked by faculty)${suffix}`;
  }
  return `Teaching hours by faculty (stacked by course)${suffix}`;
}

function formatOptions(
  map: Map<string, string>,
): Array<{ key: string; label: string }> {
  return [...map.entries()]
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function formatHoursMinutes(value: number): string {
  if (!Number.isFinite(value)) return "0:00";
  const totalMinutes = Math.max(0, Math.round(value * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

export default function StatsInstructorTeachingHoursChart({
  rows,
  semesters,
  activeSemester,
  theme,
  isLoading,
  error,
}: {
  rows: SheetRow[] | undefined;
  semesters: string[];
  activeSemester: string;
  theme: StatsThemeTokens;
  isLoading: boolean;
  error: unknown;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const levelParam = asLevelMode(searchParams.get(HOURS_LEVEL_PARAM));
  const level = levelParam ?? "university";
  const semesterParam = searchParams.get(HOURS_SEMESTER_PARAM) ?? "";
  const collegeParam = searchParams.get(HOURS_COLLEGE_PARAM) ?? "";
  const departmentParam = searchParams.get(HOURS_DEPARTMENT_PARAM) ?? "";
  const excludedSectionTypeParams = searchParams
    .getAll(HOURS_EXCLUDED_SECTION_TYPE_PARAM)
    .map((value) => value.trim())
    .filter(Boolean);

  const semesterOptions = useMemo(() => {
    const fromRows = new Set<string>();
    for (const row of rows ?? []) {
      const sem = String(row.semester ?? "").trim();
      if (sem) fromRows.add(sem);
    }

    const orderedFromSemesters = semesters.filter((s) => fromRows.has(s));
    const remaining = [...fromRows]
      .filter((s) => !orderedFromSemesters.includes(s))
      .sort((a, b) => a.localeCompare(b));
    return [...orderedFromSemesters, ...remaining];
  }, [rows, semesters]);

  const selectedSemester = useMemo(() => {
    if (semesterParam && semesterOptions.includes(semesterParam)) {
      return semesterParam;
    }
    if (activeSemester && semesterOptions.includes(activeSemester)) {
      return activeSemester;
    }
    return semesterOptions[0] ?? "";
  }, [activeSemester, semesterOptions, semesterParam]);

  const semesterRows = useMemo(() => {
    if (!rows?.length || !selectedSemester) return [] as SheetRow[];
    const semesterKey = normalizeKey(selectedSemester);
    return rows.filter(
      (row) => normalizeKey(String(row.semester ?? "")) === semesterKey,
    );
  }, [rows, selectedSemester]);

  const collegeOptions = useMemo(() => {
    const labelByKey = new Map<string, string>();
    for (const row of semesterRows) {
      const label = String(row.college ?? "").trim();
      const key = normalizeKey(label);
      if (!key || !label) continue;
      if (!labelByKey.has(key)) labelByKey.set(key, label);
    }
    return formatOptions(labelByKey);
  }, [semesterRows]);

  const selectedCollegeKey = useMemo(() => {
    if (collegeParam && collegeOptions.some((o) => o.key === collegeParam)) {
      return collegeParam;
    }
    return collegeOptions[0]?.key ?? "";
  }, [collegeOptions, collegeParam]);

  const selectedCollegeLabel = useMemo(
    () =>
      collegeOptions.find((option) => option.key === selectedCollegeKey)
        ?.label ?? "",
    [collegeOptions, selectedCollegeKey],
  );

  const departmentOptions = useMemo(() => {
    const labelByKey = new Map<string, string>();
    for (const row of semesterRows) {
      if (normalizeKey(String(row.college ?? "")) !== selectedCollegeKey)
        continue;
      const label = String(row.department ?? "").trim();
      const key = normalizeKey(label);
      if (!key || !label) continue;
      if (!labelByKey.has(key)) labelByKey.set(key, label);
    }
    return formatOptions(labelByKey);
  }, [semesterRows, selectedCollegeKey]);

  const selectedDepartmentKey = useMemo(() => {
    if (
      departmentParam &&
      departmentOptions.some((o) => o.key === departmentParam)
    ) {
      return departmentParam;
    }
    return departmentOptions[0]?.key ?? "";
  }, [departmentOptions, departmentParam]);

  const selectedDepartmentLabel = useMemo(
    () =>
      departmentOptions.find((option) => option.key === selectedDepartmentKey)
        ?.label ?? "",
    [departmentOptions, selectedDepartmentKey],
  );

  const scopedRows = useMemo(() => {
    if (!semesterRows.length) return [] as SheetRow[];
    if (level === "university") return semesterRows;
    if (!selectedCollegeKey) return [] as SheetRow[];

    const collegeRows = semesterRows.filter(
      (row) => normalizeKey(String(row.college ?? "")) === selectedCollegeKey,
    );
    if (level === "college") return collegeRows;

    if (!selectedDepartmentKey) return [] as SheetRow[];
    return collegeRows.filter(
      (row) =>
        normalizeKey(String(row.department ?? "")) === selectedDepartmentKey,
    );
  }, [level, semesterRows, selectedCollegeKey, selectedDepartmentKey]);

  const sectionTypeOptions = useMemo(() => {
    const values = new Set<string>();
    for (const row of scopedRows) {
      const sectionType = String(row.section_type ?? "").trim();
      if (sectionType) values.add(sectionType);
    }
    return [...values].sort((a, b) => a.localeCompare(b));
  }, [scopedRows]);

  const effectiveExcludedSectionTypes = useMemo(
    () =>
      excludedSectionTypeParams.filter((sectionType) =>
        sectionTypeOptions.includes(sectionType),
      ),
    [excludedSectionTypeParams, sectionTypeOptions],
  );
  const normalizedExcludedSectionTypes = useMemo(
    () => sortedUnique(effectiveExcludedSectionTypes),
    [effectiveExcludedSectionTypes],
  );

  const filteredRows = useMemo(() => {
    if (!effectiveExcludedSectionTypes.length) return scopedRows;
    const excludedSet = new Set(
      effectiveExcludedSectionTypes.map((sectionType) =>
        normalizeKey(sectionType),
      ),
    );
    return scopedRows.filter((row) => {
      const sectionType = normalizeKey(String(row.section_type ?? ""));
      return !excludedSet.has(sectionType);
    });
  }, [effectiveExcludedSectionTypes, scopedRows]);

  const effectiveCollegeKey =
    level === "university" ? "" : selectedCollegeKey || "";
  const effectiveDepartmentKey =
    level === "department" ? selectedDepartmentKey || "" : "";

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    let changed = false;

    const setOrDelete = (key: string, value: string) => {
      const current = next.get(key) ?? "";
      if (value) {
        if (current !== value) {
          next.set(key, value);
          changed = true;
        }
        return;
      }
      if (next.has(key)) {
        next.delete(key);
        changed = true;
      }
    };

    setOrDelete(HOURS_LEVEL_PARAM, level);
    setOrDelete(HOURS_SEMESTER_PARAM, selectedSemester);
    setOrDelete(HOURS_COLLEGE_PARAM, effectiveCollegeKey);
    setOrDelete(HOURS_DEPARTMENT_PARAM, effectiveDepartmentKey);

    const existingExcluded = sortedUnique(
      next
        .getAll(HOURS_EXCLUDED_SECTION_TYPE_PARAM)
        .map((value) => value.trim())
        .filter(Boolean),
    );
    if (!sameStringArray(existingExcluded, normalizedExcludedSectionTypes)) {
      next.delete(HOURS_EXCLUDED_SECTION_TYPE_PARAM);
      for (const value of normalizedExcludedSectionTypes) {
        next.append(HOURS_EXCLUDED_SECTION_TYPE_PARAM, value);
      }
      changed = true;
    }

    if (changed) {
      setSearchParams(next, { replace: true });
    }
  }, [
    searchParams,
    setSearchParams,
    level,
    selectedSemester,
    effectiveCollegeKey,
    effectiveDepartmentKey,
    normalizedExcludedSectionTypes,
  ]);

  const { option, minWidth } = useMemo(() => {
    if (!filteredRows.length || !selectedSemester) {
      return { option: null as StatsChartOption | null, minWidth: 900 };
    }

    const breakdowns = buildLevelBreakdown(filteredRows);
    const breakdown = breakdowns[level];
    const outerKeys = sortOuterKeysByTotal(breakdown.data);
    if (!outerKeys.length) {
      return { option: null as StatsChartOption | null, minWidth: 900 };
    }
    const innerKeys = sortInnerKeysByTotal(breakdown.data);

    const outerLabels = outerKeys.map(
      (key) => breakdown.outerLabels.get(key) ?? key,
    );
    const totalsByOuter = outerKeys.map((outerKey) =>
      [...(breakdown.data.get(outerKey)?.values() ?? [])].reduce(
        (acc, value) => acc + value,
        0,
      ),
    );

    const series: BarSeriesOption[] = innerKeys.map((innerKey, index) => ({
      name: breakdown.innerLabels.get(innerKey) ?? innerKey,
      type: "bar",
      stack: "hours",
      emphasis: { focus: "series" },
      itemStyle: { color: colorForIndex(index) },
      data: outerKeys.map((outerKey) => {
        const v = breakdown.data.get(outerKey)?.get(innerKey) ?? 0;
        return Number(v.toFixed(2));
      }),
    }));

    const useDataZoom = level !== "department" && outerLabels.length > 10;
    const minWidth = calcMinWidth(outerLabels.length, 900, 58);
    const xAxisFontSize =
      level === "department" ? 8 : level === "college" ? 9 : 11;
    const outerDimension =
      level === "university"
        ? "College"
        : level === "college"
          ? "Department"
          : "Faculty";
    const innerDimension =
      level === "university"
        ? "Department"
        : level === "college"
          ? "Faculty"
          : "Course";

    const option: StatsChartOption = {
      backgroundColor: "transparent",
      darkMode: theme.themeMode === "dark",
      title: {
        text: buildTitle(level, selectedSemester)
          .replace(
            "Teaching hours by department (stacked by faculty)",
            selectedCollegeLabel
              ? `Teaching hours by department (stacked by faculty) - ${selectedCollegeLabel}`
              : "Teaching hours by department (stacked by faculty)",
          )
          .replace(
            "Teaching hours by faculty (stacked by course)",
            selectedDepartmentLabel
              ? `Teaching hours by faculty (stacked by course) - ${selectedDepartmentLabel}`
              : "Teaching hours by faculty (stacked by course)",
          ),
        left: "center",
        top: 0,
        textStyle: { fontSize: 14, fontWeight: 700, color: theme.titleColor },
      },
      toolbox: {
        show: true,
        right: 8,
        top: 0,
        feature: {
          saveAsImage: {
            show: true,
            name: `teaching-hours-${level}-${selectedSemester}`,
          },
        },
        iconStyle: { borderColor: theme.axisTextColor },
        emphasis: { iconStyle: { borderColor: theme.titleColor } },
      },
      tooltip: {
        trigger: "item",
        formatter: (raw) => {
          const itemRaw = Array.isArray(raw) ? raw[0] : raw;
          const item =
            itemRaw && typeof itemRaw === "object"
              ? (itemRaw as unknown as Record<string, unknown>)
              : {};
          const value = Number(item.value);
          const idx = Number(item.dataIndex ?? -1);
          const outer = outerLabels[idx] ?? String(item.name ?? "");
          const inner = String(item.seriesName ?? "");
          const total = totalsByOuter[idx] ?? NaN;

          const valueText = Number.isFinite(value)
            ? formatHoursMinutes(value)
            : String(item.value ?? "");
          const totalText = Number.isFinite(total)
            ? formatHoursMinutes(total)
            : "N/A";

          return [
            `${outerDimension}: ${outer}`,
            `${innerDimension}: ${inner}`,
            `Hours: ${valueText}`,
            `Total ${outerDimension.toLowerCase()} hours: ${totalText}`,
          ].join("<br/>");
        },
        valueFormatter: (value) => {
          const n = Number(value);
          if (!Number.isFinite(n)) return String(value ?? "");
          return formatHoursMinutes(n);
        },
      },
      grid: {
        left: 24,
        right: 16,
        top: 52,
        bottom: useDataZoom ? 52 : 20,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: outerLabels,
        axisLine: { lineStyle: { color: theme.gridLineColor } },
        axisLabel: {
          rotate: 90,
          align: "right",
          verticalAlign: "middle",
          margin: 3,
          hideOverlap: true,
          color: theme.axisTextColor,
          fontSize: xAxisFontSize,
          formatter: (value: string) => value.split(" ").join("\n"),
        },
      },
      yAxis: {
        type: "value",
        name: "Hours",
        nameLocation: "end",
        axisLine: { lineStyle: { color: theme.gridLineColor } },
        axisTick: { lineStyle: { color: theme.gridLineColor } },
        splitLine: { lineStyle: { color: theme.gridLineColor } },
        axisLabel: {
          color: theme.axisTickLabelColor,
          formatter: (value: number) => formatHoursMinutes(value),
        },
      },
      dataZoom: useDataZoom
        ? [
            { type: "inside", xAxisIndex: 0 },
            { type: "slider", xAxisIndex: 0, height: 14, bottom: 8 },
          ]
        : [],
      series,
    };

    return { option, minWidth };
  }, [
    filteredRows,
    selectedSemester,
    level,
    theme,
    selectedCollegeLabel,
    selectedDepartmentLabel,
  ]);

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 1, sm: 2 },
        borderRadius: 3,
      }}
    >
      <Typography variant="h6" align="center" sx={{ mb: 1 }}>
        Teaching Load
      </Typography>
      <Box
        display="flex"
        flexWrap="wrap"
        alignItems="center"
        gap={1.5}
        sx={{ mb: 1 }}
      >
        <ToggleButtonGroup
          size="small"
          exclusive
          value={level}
          onChange={(_, value: LevelMode | null) => {
            if (!value) return;
            const next = new URLSearchParams(searchParams);
            next.set(HOURS_LEVEL_PARAM, value);
            if (value === "university") {
              next.delete(HOURS_COLLEGE_PARAM);
              next.delete(HOURS_DEPARTMENT_PARAM);
            } else if (value === "college") {
              next.delete(HOURS_DEPARTMENT_PARAM);
            }
            setSearchParams(next, { replace: true });
          }}
        >
          <ToggleButton value="university">University</ToggleButton>
          <ToggleButton value="college">College</ToggleButton>
          <ToggleButton value="department">Department</ToggleButton>
        </ToggleButtonGroup>

        {(level === "college" || level === "department") && (
          <Autocomplete
            size="small"
            options={collegeOptions}
            value={
              collegeOptions.find(
                (option) => option.key === selectedCollegeKey,
              ) ?? null
            }
            getOptionLabel={(option) => option.label}
            onChange={(_, value) => {
              const next = new URLSearchParams(searchParams);
              if (value?.key) next.set(HOURS_COLLEGE_PARAM, value.key);
              else next.delete(HOURS_COLLEGE_PARAM);
              next.delete(HOURS_DEPARTMENT_PARAM);
              setSearchParams(next, { replace: true });
            }}
            renderInput={(params) => <TextField {...params} label="College" />}
            sx={{ minWidth: 240 }}
          />
        )}

        {level === "department" && (
          <Autocomplete
            size="small"
            options={departmentOptions}
            value={
              departmentOptions.find(
                (option) => option.key === selectedDepartmentKey,
              ) ?? null
            }
            getOptionLabel={(option) => option.label}
            onChange={(_, value) => {
              const next = new URLSearchParams(searchParams);
              if (value?.key) next.set(HOURS_DEPARTMENT_PARAM, value.key);
              else next.delete(HOURS_DEPARTMENT_PARAM);
              setSearchParams(next, { replace: true });
            }}
            renderInput={(params) => (
              <TextField {...params} label="Department" />
            )}
            sx={{ minWidth: 260 }}
          />
        )}

        <Autocomplete
          size="small"
          options={semesterOptions}
          value={selectedSemester || null}
          onChange={(_, value) => {
            const next = new URLSearchParams(searchParams);
            if (value) next.set(HOURS_SEMESTER_PARAM, value);
            else next.delete(HOURS_SEMESTER_PARAM);
            setSearchParams(next, { replace: true });
          }}
          renderInput={(params) => <TextField {...params} label="Semester" />}
          sx={{ ml: "auto", minWidth: 220 }}
        />
      </Box>
      <Box display="flex" justifyContent="flex-start" sx={{ mb: 1 }}>
        <Autocomplete
          multiple
          size="small"
          options={sectionTypeOptions}
          value={effectiveExcludedSectionTypes}
          onChange={(_, value) => {
            const next = new URLSearchParams(searchParams);
            next.delete(HOURS_EXCLUDED_SECTION_TYPE_PARAM);
            for (const sectionType of sortedUnique(value)) {
              next.append(HOURS_EXCLUDED_SECTION_TYPE_PARAM, sectionType);
            }
            setSearchParams(next, { replace: true });
          }}
          renderInput={(params) => (
            <TextField {...params} label="Exclude section type" />
          )}
          sx={{ minWidth: 300, maxWidth: 520, width: "100%" }}
        />
      </Box>

      {isLoading && <MyCustomSpinner label="Calculating statistics..." />}
      {!isLoading && error != null && (
        <Typography variant="body2" color="error">
          Failed to load data: {String(error)}
        </Typography>
      )}
      {!isLoading && !error && !option && (
        <Typography variant="body2" color="text.secondary">
          No teaching hours data available for the selected semester.
        </Typography>
      )}

      {option && (
        <StatsEChart
          option={option}
          minWidth={minWidth}
          themeMode={theme.themeMode}
        />
      )}
    </Paper>
  );
}
