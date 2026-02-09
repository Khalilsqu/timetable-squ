import { useMemo } from "react";
import { Autocomplete, Box, Paper, TextField, Typography } from "@mui/material";
import { useSearchParams } from "react-router";
import type { SunburstSeriesOption } from "echarts/charts";
import type { CallbackDataParams } from "echarts/types/dist/shared";
import StatsEChart from "./StatsEChart";
import { type StatsChartOption } from "./statsEcharts";
import { normalizeKey, type StatsThemeTokens } from "./statsData";
import MyCustomSpinner from "@/src/components/MyCustomSpinner";
import type { SheetRow } from "@/src/lib/googleSheet";

type SunburstNode = {
  id: string;
  name: string;
  value: number;
  children?: SunburstNode[];
  itemStyle?: {
    color?: string;
  };
};

type FacultyTreeData = {
  root: SunburstNode;
  totalFaculty: number;
};

const HOURS_SEMESTER_PARAM = "hoursSemester";
const SERIES_ID = "faculty-sunburst";

const COLLEGE_PALETTE = [
  "#FFAE57",
  "#FF7853",
  "#EA5151",
  "#CC3F57",
  "#9A2555",
  "#2A9D8F",
  "#3A86FF",
  "#8E44AD",
  "#F4A261",
  "#2EC4B6",
];

function formatFacultyLabel(value: number): string {
  return value === 1 ? "1 faculty" : `${value} faculty`;
}

function clampLabel(text: string, max = 16): string {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 3))}...`;
}

function tintColor(hex: string, ratio: number): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return hex;

  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) {
    return hex;
  }

  const mix = (channel: number) =>
    Math.max(0, Math.min(255, Math.round(channel + (255 - channel) * ratio)));
  const toHex = (v: number) => v.toString(16).padStart(2, "0");
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

function buildFacultyTree(rows: SheetRow[] | undefined): FacultyTreeData | null {
  if (!rows?.length) return null;

  const facultyByCollege = new Map<string, Set<string>>();
  const facultyByDeptByCollege = new Map<string, Map<string, Set<string>>>();

  const collegeDisplayByKey = new Map<string, string>();
  const deptDisplayByCollegeKey = new Map<string, Map<string, string>>();

  const universityFacultyKeys = new Set<string>();

  for (const row of rows) {
    const collegeLabel = String(row.college ?? "").trim();
    const departmentLabel = String(row.department ?? "").trim();
    const instructorCodeLabel = String(row.instructor_code ?? "").trim();
    const instructorLabel = String(row.instructor ?? "").trim();

    if (!collegeLabel || !departmentLabel || !instructorLabel) continue;

    const collegeKey = normalizeKey(collegeLabel);
    const departmentKey = normalizeKey(departmentLabel);
    const instructorCodeKey = normalizeKey(instructorCodeLabel);
    const instructorNameKey = normalizeKey(instructorLabel);
    if (!collegeKey || !departmentKey || !instructorNameKey) continue;

    if (!collegeDisplayByKey.has(collegeKey)) {
      collegeDisplayByKey.set(collegeKey, collegeLabel);
    }

    let deptDisplayByKey = deptDisplayByCollegeKey.get(collegeKey);
    if (!deptDisplayByKey) {
      deptDisplayByKey = new Map();
      deptDisplayByCollegeKey.set(collegeKey, deptDisplayByKey);
    }
    if (!deptDisplayByKey.has(departmentKey)) {
      deptDisplayByKey.set(departmentKey, departmentLabel);
    }

    const facultyKey = instructorCodeKey || instructorNameKey;
    universityFacultyKeys.add(facultyKey);

    let collegeFaculty = facultyByCollege.get(collegeKey);
    if (!collegeFaculty) {
      collegeFaculty = new Set();
      facultyByCollege.set(collegeKey, collegeFaculty);
    }
    collegeFaculty.add(facultyKey);

    let byDept = facultyByDeptByCollege.get(collegeKey);
    if (!byDept) {
      byDept = new Map();
      facultyByDeptByCollege.set(collegeKey, byDept);
    }
    let departmentFaculty = byDept.get(departmentKey);
    if (!departmentFaculty) {
      departmentFaculty = new Set();
      byDept.set(departmentKey, departmentFaculty);
    }
    departmentFaculty.add(facultyKey);
  }

  if (universityFacultyKeys.size === 0) return null;

  const collegeKeys = [...collegeDisplayByKey.keys()].sort((a, b) => {
    const aCount = facultyByCollege.get(a)?.size ?? 0;
    const bCount = facultyByCollege.get(b)?.size ?? 0;
    if (bCount !== aCount) return bCount - aCount;
    return (collegeDisplayByKey.get(a) ?? a).localeCompare(
      collegeDisplayByKey.get(b) ?? b,
    );
  });

  const collegeNodesWithNull: Array<SunburstNode | null> = collegeKeys.map(
    (collegeKey, collegeIndex) => {
      const collegeFacultyCount = facultyByCollege.get(collegeKey)?.size ?? 0;
      if (collegeFacultyCount <= 0) return null;

      const collegeColor = COLLEGE_PALETTE[collegeIndex % COLLEGE_PALETTE.length];
      const departmentDisplay =
        deptDisplayByCollegeKey.get(collegeKey) ?? new Map<string, string>();

      const departmentKeys = [...departmentDisplay.keys()].sort((a, b) => {
        const aCount =
          facultyByDeptByCollege.get(collegeKey)?.get(a)?.size ?? 0;
        const bCount =
          facultyByDeptByCollege.get(collegeKey)?.get(b)?.size ?? 0;
        if (bCount !== aCount) return bCount - aCount;
        return (departmentDisplay.get(a) ?? a).localeCompare(
          departmentDisplay.get(b) ?? b,
        );
      });

      const departmentNodesWithNull: Array<SunburstNode | null> =
        departmentKeys.map((departmentKey, departmentIndex) => {
          const departmentFacultyCount =
            facultyByDeptByCollege.get(collegeKey)?.get(departmentKey)?.size ?? 0;
          if (departmentFacultyCount <= 0) return null;

          const departmentName = departmentDisplay.get(departmentKey) ?? departmentKey;
          const departmentColor = tintColor(
            collegeColor,
            0.16 + (departmentIndex % 6) * 0.09,
          );

          return {
            id: `dept:${collegeKey}:${departmentKey}`,
            name: departmentName,
            value: departmentFacultyCount,
            itemStyle: {
              color: departmentColor,
            },
            children: [
              {
                id: `dept-label:${collegeKey}:${departmentKey}`,
                name: departmentName,
                value: departmentFacultyCount,
                itemStyle: {
                  color: "transparent",
                },
              },
            ],
          };
        });

      const departmentNodes = departmentNodesWithNull.filter(
        (node): node is SunburstNode => node !== null,
      );

      return {
        id: `college:${collegeKey}`,
        name: collegeDisplayByKey.get(collegeKey) ?? collegeKey,
        value: collegeFacultyCount,
        children: departmentNodes,
        itemStyle: { color: collegeColor },
      };
    },
  );

  const collegeNodes = collegeNodesWithNull.filter(
    (node): node is SunburstNode => node !== null,
  );

  if (!collegeNodes.length) return null;

  return {
    root: {
      id: "university",
      name: "University",
      value: universityFacultyKeys.size,
      children: collegeNodes,
    },
    totalFaculty: universityFacultyKeys.size,
  };
}

export default function StatsFacultySunburstChart({
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
  const semesterParam = searchParams.get(HOURS_SEMESTER_PARAM) ?? "";

  const semesterOptions = useMemo(() => {
    const fromRows = new Set<string>();
    for (const row of rows ?? []) {
      const sem = String(row.semester ?? "").trim();
      if (sem) fromRows.add(sem);
    }

    const orderedFromSemesters = semesters.filter((sem) => fromRows.has(sem));
    const remaining = [...fromRows]
      .filter((sem) => !orderedFromSemesters.includes(sem))
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
  }, [semesterParam, semesterOptions, activeSemester]);

  const semesterRows = useMemo(() => {
    if (!rows?.length || !selectedSemester) return [] as SheetRow[];
    const selectedSemesterKey = normalizeKey(selectedSemester);
    return rows.filter(
      (row) => normalizeKey(String(row.semester ?? "")) === selectedSemesterKey,
    );
  }, [rows, selectedSemester]);

  const option = useMemo(() => {
    const tree = buildFacultyTree(semesterRows);
    if (!tree) return null as StatsChartOption | null;

    const tooltipFormatter = (raw: unknown) => {
      const item = raw as CallbackDataParams & {
        treePathInfo?: Array<{ name?: string }>;
      };
      const pathParts = (item.treePathInfo ?? [])
        .map((part) => String(part.name ?? ""))
        .filter(Boolean);
      const path = pathParts.length
        ? pathParts.join(" / ")
        : String(item.name ?? "");
      const value = Number(item.value);
      const count = Number.isFinite(value) ? value : 0;
      return [path, formatFacultyLabel(count)].join("<br/>");
    };

    const labelFormatter = (raw: unknown) => {
      const item = raw as CallbackDataParams & {
        treePathInfo?: Array<{ name?: string }>;
        data?: { id?: string };
      };
      const value = Number(item.value);
      const count = Number.isFinite(value) ? value : 0;
      const name = String(item.name ?? "");
      if (!name) return "";

      const nodeId = String(item.data?.id ?? "");
      if (nodeId === "university") {
        return `${name}\nTotal: ${count}`;
      }
      if (nodeId.startsWith("college:")) {
        return `${clampLabel(name, 18)}\n${count}`;
      }
      if (nodeId.startsWith("dept:")) {
        return `${count}`;
      }
      if (nodeId.startsWith("dept-label:")) {
        return clampLabel(name, 22);
      }
      return clampLabel(name, 22);
    };

    const borderColor =
      theme.themeMode === "dark" ? "rgba(20,20,20,0.9)" : "rgba(255,255,255,0.95)";

    const series: SunburstSeriesOption = {
      type: "sunburst",
      id: SERIES_ID,
      center: ["50%", "50%"],
      radius: ["0%", "62%"],
      animationDurationUpdate: 900,
      universalTransition: true,
      nodeClick: false,
      emphasis: { focus: "none" },
      blur: {
        itemStyle: { opacity: 1 },
        label: { opacity: 1 },
      },
      labelLayout: {
        hideOverlap: false,
      },
      sort: (
        a: { depth?: number; dataIndex?: number; getValue?: () => number },
        b: { depth?: number; dataIndex?: number; getValue?: () => number },
      ) => {
        const depth = a.depth ?? 0;
        if (depth === 1) {
          const av = a.getValue?.() ?? 0;
          const bv = b.getValue?.() ?? 0;
          return bv - av;
        }
        return (a.dataIndex ?? 0) - (b.dataIndex ?? 0);
      },
      data: [tree.root],
      label: {
        show: true,
        formatter: labelFormatter,
      },
      itemStyle: {
        borderColor,
        borderWidth: 2,
      },
      levels: [
        {},
        {
          r0: "0%",
          r: "15%",
          label: {
            rotate: 0,
            fontSize: 14,
            fontWeight: 700,
            color: theme.titleColor,
            align: "center",
          },
        },
        {
          r0: "15%",
          r: "42%",
          label: {
            rotate: "radial",
            fontSize: 8,
            fontWeight: 700,
            color: "#fff",
            textBorderColor: "rgba(0,0,0,0.45)",
            textBorderWidth: 2,
            overflow: "truncate",
          },
        },
        {
          r0: "42%",
          r: "56%",
          label: {
            rotate: "radial",
            fontSize: 7,
            fontWeight: 700,
            color: "#fff",
            textBorderColor: "rgba(0,0,0,0.45)",
            textBorderWidth: 2,
            overflow: "truncate",
          },
        },
        {
          r0: "56%",
          r: "62%",
          itemStyle: {
            color: "transparent",
            borderWidth: 0,
          },
          label: {
            position: "outside",
            distance: 0,
            rotate: "radial",
            fontSize: 8,
            color: theme.axisTextColor,
            textShadowBlur: 4,
            textShadowColor:
              theme.themeMode === "dark" ? "rgba(0,0,0,0.8)" : "rgba(255,255,255,0.9)",
            overflow: "truncate",
            minAngle: 0,
          },
        },
      ],
    };

    const option: StatsChartOption = {
      backgroundColor: "transparent",
      darkMode: theme.themeMode === "dark",
      title: {
        text: `Faculty by college and department - ${selectedSemester} (Total: ${tree.totalFaculty})`,
        left: "center",
        top: 0,
        textStyle: {
          fontSize: 14,
          fontWeight: 700,
          color: theme.titleColor,
        },
      },
      toolbox: {
        show: true,
        right: 8,
        top: 0,
        feature: {
          saveAsImage: {
            show: true,
            name: `faculty-sunburst-${selectedSemester || "all"}`,
          },
        },
        iconStyle: { borderColor: theme.axisTextColor },
        emphasis: { iconStyle: { borderColor: theme.titleColor } },
      },
      tooltip: {
        trigger: "item",
        formatter: tooltipFormatter,
      },
      series: [series],
    };

    return option;
  }, [selectedSemester, semesterRows, theme]);

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 1, sm: 2 },
        borderRadius: 3,
      }}
    >
      <Box display="flex" justifyContent="flex-end" sx={{ mb: 1 }}>
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
          sx={{ minWidth: 220 }}
        />
      </Box>

      {isLoading && <MyCustomSpinner label="Calculating faculty distribution..." />}
      {!isLoading && error != null && (
        <Typography variant="body2" color="error">
          Failed to load data: {String(error)}
        </Typography>
      )}
      {!isLoading && !error && !option && (
        <Typography variant="body2" color="text.secondary">
          No faculty data available for the selected semester.
        </Typography>
      )}

      {option && (
        <StatsEChart
          option={option}
          height={760}
          minWidth={980}
          themeMode={theme.themeMode}
        />
      )}
    </Paper>
  );
}
