import { useEffect, useMemo, useRef } from "react";
import { Box, Paper, Typography } from "@mui/material";
import { useScheduleRows, useSemesters } from "@/src/lib/queries";

import * as echarts from "echarts/core";
import type { ComposeOption } from "echarts/core";
import { BarChart, type BarSeriesOption } from "echarts/charts";
import {
  DataZoomComponent,
  type DataZoomComponentOption,
  GridComponent,
  type GridComponentOption,
  LegendComponent,
  type LegendComponentOption,
  TitleComponent,
  type TitleComponentOption,
  ToolboxComponent,
  type ToolboxComponentOption,
  TooltipComponent,
  type TooltipComponentOption,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
  BarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  TitleComponent,
  ToolboxComponent,
  CanvasRenderer,
]);

type StatsChartOption = ComposeOption<
  | BarSeriesOption
  | GridComponentOption
  | TooltipComponentOption
  | LegendComponentOption
  | DataZoomComponentOption
  | TitleComponentOption
  | ToolboxComponentOption
>;

function EChart({
  option,
  height = 520,
  minWidth = 900,
}: {
  option: StatsChartOption;
  height?: number;
  minWidth?: number;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const chart = echarts.init(el, undefined, { renderer: "canvas" });
    chartRef.current = chart;

    return () => {
      chartRef.current = null;
      chart.dispose();
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.setOption(option, { notMerge: true });
    chart.resize();
  }, [option]);

  useEffect(() => {
    const el = rootRef.current;
    const chart = chartRef.current;
    if (!el || !chart) return;

    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Box sx={{ width: "100%", overflowX: "auto", overflowY: "hidden" }}>
      <Box ref={rootRef} sx={{ width: "100%", minWidth, height }} />
    </Box>
  );
}

const normalizeKey = (v: unknown) =>
  String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const toNumber = (v: unknown): number => {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
};

export default function StatsPage() {
  const { data: semInfo } = useSemesters();
  const { data: rows, isLoading, error } = useScheduleRows(null);

  const { uniqueCoursesOption, enrollmentOption, chartMinWidth } = useMemo(() => {
    if (!rows?.length) {
      return {
        uniqueCoursesOption: null as StatsChartOption | null,
        enrollmentOption: null as StatsChartOption | null,
        chartMinWidth: 900,
      };
    }

    const displayCollegeByKey = new Map<string, string>();
    const displaySemesterByKey = new Map<string, string>();
    const coursesByCollegeBySem = new Map<string, Map<string, Set<string>>>();
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
      const semesterRaw = String(row.semester ?? "").trim();
      const courseRaw = String(row.course_code ?? "").trim();
      if (!collegeRaw || !semesterRaw || !courseRaw) continue;

      const collegeKey = normalizeKey(collegeRaw);
      const semesterKey = normalizeKey(semesterRaw);
      const courseKey = normalizeKey(courseRaw);

      if (!displayCollegeByKey.has(collegeKey)) {
        displayCollegeByKey.set(collegeKey, collegeRaw);
      }
      if (!displaySemesterByKey.has(semesterKey)) {
        displaySemesterByKey.set(semesterKey, semesterRaw);
      }

      let bySem = coursesByCollegeBySem.get(collegeKey);
      if (!bySem) {
        bySem = new Map();
        coursesByCollegeBySem.set(collegeKey, bySem);
      }

      let courseSet = bySem.get(semesterKey);
      if (!courseSet) {
        courseSet = new Set();
        bySem.set(semesterKey, courseSet);
      }
      courseSet.add(courseKey);

      // Enrollment: dedupe sessions within the same section (take max enrollment seen)
      const departmentRaw = String(row.department ?? "").trim();
      const sectionRaw = String(row.section ?? "").trim();
      const enrollment = toNumber(row.students_in_section);
      if (!departmentRaw || !sectionRaw || enrollment <= 0) continue;

      const departmentKey = normalizeKey(departmentRaw);
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

    const collegeKeys = [...displayCollegeByKey.keys()].sort((a, b) =>
      (displayCollegeByKey.get(a) ?? a).localeCompare(
        displayCollegeByKey.get(b) ?? b
      )
    );

    const presentSemesterKeys = new Set(displaySemesterByKey.keys());
    const semesterKeys: string[] = [];
    const pushed = new Set<string>();

    for (const sem of semInfo?.list ?? []) {
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

    const colleges = collegeKeys.map((k) => displayCollegeByKey.get(k) ?? k);

    const chartMinWidth = Math.max(900, colleges.length * 60);

    const series: BarSeriesOption[] = semesterKeys.map((semKey) => ({
      name: displaySemesterByKey.get(semKey) ?? semKey,
      type: "bar",
      emphasis: { focus: "series" },
      label: {
        show: true,
        position: "inside",
        fontSize: 11,
        color: "#fff",
        textBorderColor: "rgba(0,0,0,0.35)",
        textBorderWidth: 2,
        formatter: (p) => {
          const v = Number(p.value);
          return v > 0 ? String(v) : "";
        },
      },
      labelLayout: { hideOverlap: true },
      data: collegeKeys.map(
        (collegeKey) =>
          coursesByCollegeBySem.get(collegeKey)?.get(semKey)?.size ?? 0
      ),
    }));

    const useDataZoom = colleges.length > 10;

    const uniqueCoursesOption: StatsChartOption = {
      title: {
        text: "Number of unique courses offered by each college per semester",
        left: "center",
        top: 0,
        textStyle: { fontSize: 14, fontWeight: 700 },
      },
      toolbox: {
        show: true,
        right: 8,
        top: 0,
        feature: {
          saveAsImage: { show: true, name: "unique-courses-by-college" },
        },
      },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      legend: { top: 28 },
      grid: {
        left: 24,
        right: 16,
        top: 64,
        bottom: useDataZoom ? 50 : 18,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: colleges,
        axisLabel: {
          rotate: 90,
          align: "right",
          verticalAlign: "middle",
          margin: 3,
          hideOverlap: true,
          formatter: (value: string) => value.split(" ").join("\n"),
        },
      },
      yAxis: {
        type: "value",
        axisLabel: { margin: 10 },
      },
      dataZoom: useDataZoom
        ? [
            { type: "inside", xAxisIndex: 0 },
            { type: "slider", xAxisIndex: 0, height: 14, bottom: 8 },
          ]
        : [],
      series,
    };

    let enrollmentOption: StatsChartOption | null = null;
    if (sectionEnrollmentByKey.size > 0) {
      const courseTotals = new Map<string, number>(); // semester|college|department|course -> total
      for (const s of sectionEnrollmentByKey.values()) {
        const courseId = [s.semesterKey, s.collegeKey, s.departmentKey, s.courseKey].join(SEP);
        courseTotals.set(courseId, (courseTotals.get(courseId) ?? 0) + s.enrollment);
      }

      const departmentTotals = new Map<string, number>(); // semester|college|department -> total
      for (const [courseId, total] of courseTotals) {
        const [semesterKey, collegeKey, departmentKey] = courseId.split(SEP);
        const deptId = [semesterKey, collegeKey, departmentKey].join(SEP);
        departmentTotals.set(deptId, (departmentTotals.get(deptId) ?? 0) + total);
      }

      const enrollmentByCollegeBySem = new Map<string, Map<string, number>>();
      for (const [deptId, total] of departmentTotals) {
        const [semesterKey, collegeKey] = deptId.split(SEP);
        let bySem = enrollmentByCollegeBySem.get(collegeKey);
        if (!bySem) {
          bySem = new Map();
          enrollmentByCollegeBySem.set(collegeKey, bySem);
        }
        bySem.set(semesterKey, (bySem.get(semesterKey) ?? 0) + total);
      }

      const enrollmentSeries: BarSeriesOption[] = semesterKeys.map((semKey) => ({
        name: displaySemesterByKey.get(semKey) ?? semKey,
        type: "bar",
        emphasis: { focus: "series" },
        label: {
          show: true,
          position: "inside",
          fontSize: 11,
          color: "#fff",
          textBorderColor: "rgba(0,0,0,0.35)",
          textBorderWidth: 2,
          formatter: (p) => {
            const v = Number(p.value);
            return v > 0 ? String(v) : "";
          },
        },
        labelLayout: { hideOverlap: true },
        data: collegeKeys.map(
          (collegeKey) => enrollmentByCollegeBySem.get(collegeKey)?.get(semKey) ?? 0
        ),
      }));

      enrollmentOption = {
        title: {
          text: "Enrollment by college per semester",
          left: "center",
          top: 0,
          textStyle: { fontSize: 14, fontWeight: 700 },
        },
        toolbox: {
          show: true,
          right: 8,
          top: 0,
          feature: {
            saveAsImage: { show: true, name: "enrollment-by-college" },
          },
        },
        tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
        legend: { top: 28 },
        grid: {
          left: 24,
          right: 16,
          top: 64,
          bottom: useDataZoom ? 50 : 18,
          containLabel: true,
        },
        xAxis: {
          type: "category",
          data: colleges,
          axisLabel: {
            rotate: 90,
            align: "right",
            verticalAlign: "middle",
            margin: 3,
            hideOverlap: true,
            formatter: (value: string) => value.split(" ").join("\n"),
          },
        },
        yAxis: {
          type: "value",
          axisLabel: { margin: 10 },
        },
        dataZoom: useDataZoom
          ? [
              { type: "inside", xAxisIndex: 0 },
              { type: "slider", xAxisIndex: 0, height: 14, bottom: 8 },
            ]
          : [],
        series: enrollmentSeries,
      };
    }

    return { uniqueCoursesOption, enrollmentOption, chartMinWidth };
  }, [rows, semInfo?.list]);

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 1, sm: 2 },
          borderRadius: 3,
        }}
      >
        {isLoading && (
          <Typography variant="body2" color="text.secondary">
            Loading...
          </Typography>
        )}
        {!isLoading && error && (
          <Typography variant="body2" color="error">
            Failed to load data: {String(error)}
          </Typography>
        )}
        {!isLoading && !error && !uniqueCoursesOption && (
          <Typography variant="body2" color="text.secondary">
            No data available.
          </Typography>
        )}

        {uniqueCoursesOption && (
          <EChart option={uniqueCoursesOption} minWidth={chartMinWidth} />
        )}
      </Paper>

      <Paper
        variant="outlined"
        sx={{
          p: { xs: 1, sm: 2 },
          borderRadius: 3,
        }}
      >
        {isLoading && (
          <Typography variant="body2" color="text.secondary">
            Loading...
          </Typography>
        )}
        {!isLoading && error && (
          <Typography variant="body2" color="error">
            Failed to load data: {String(error)}
          </Typography>
        )}
        {!isLoading && !error && !enrollmentOption && (
          <Typography variant="body2" color="text.secondary">
            No enrollment data available.
          </Typography>
        )}

        {enrollmentOption && (
          <EChart option={enrollmentOption} minWidth={chartMinWidth} />
        )}
      </Paper>
    </Box>
  );
}
