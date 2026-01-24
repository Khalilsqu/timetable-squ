import { useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Paper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import type { BarSeriesOption } from "echarts/charts";
import StatsEChart from "./StatsEChart";
import { insideCountLabel, type StatsChartOption } from "./statsEcharts";
import {
  calcMinWidth,
  getCollegeOptions,
  type StatsBaseData,
  type StatsThemeTokens,
} from "./statsData";
import MyCustomSpinner from "@/src/components/MyCustomSpinner";

export default function StatsCollegeDepartmentChart({
  base,
  theme,
  isLoading,
  error,
}: {
  base: StatsBaseData | null;
  theme: StatsThemeTokens;
  isLoading: boolean;
  error: unknown;
}) {
  const collegeOptions = useMemo(() => getCollegeOptions(base), [base]);

  const [selectedCollegeKey, setSelectedCollegeKey] = useState<string | null>(
    null
  );
  const [metric, setMetric] = useState<"uniqueCourses" | "enrollment">(
    "uniqueCourses"
  );

  useEffect(() => {
    if (collegeOptions.length === 0) return;
    if (!selectedCollegeKey) {
      setSelectedCollegeKey(collegeOptions[0].key);
      return;
    }
    if (!collegeOptions.some((o) => o.key === selectedCollegeKey)) {
      setSelectedCollegeKey(collegeOptions[0].key);
    }
  }, [collegeOptions, selectedCollegeKey]);

  const { option, minWidth } = useMemo(() => {
    if (!base || !selectedCollegeKey) {
      return { option: null as StatsChartOption | null, minWidth: 900 };
    }

    const deptDisplay =
      base.displayDeptByCollegeByKey.get(selectedCollegeKey) ?? new Map();
    const deptKeys = [...deptDisplay.keys()].sort((a, b) =>
      (deptDisplay.get(a) ?? a).localeCompare(deptDisplay.get(b) ?? b)
    );
    const departments = deptKeys.map((k) => deptDisplay.get(k) ?? k);
    const useDataZoom = departments.length > 10;
    const minWidth = calcMinWidth(departments.length);

    const series: BarSeriesOption[] = base.semesterKeys.map((semKey) => ({
      name: base.displaySemesterByKey.get(semKey) ?? semKey,
      type: "bar",
      emphasis: { focus: "series" },
      label: insideCountLabel(),
      labelLayout: { hideOverlap: true },
      data: deptKeys.map((deptKey) => {
        if (metric === "uniqueCourses") {
          return (
            base.uniqueCoursesByCollegeDeptSem
              .get(selectedCollegeKey)
              ?.get(deptKey)
              ?.get(semKey)?.size ?? 0
          );
        }
        return (
          base.enrollmentByCollegeDeptSem
            .get(selectedCollegeKey)
            ?.get(deptKey)
            ?.get(semKey) ?? 0
        );
      }),
    }));

    const collegeLabel =
      base.displayCollegeByKey.get(selectedCollegeKey) ?? selectedCollegeKey;
    const metricLabel = metric === "uniqueCourses" ? "Unique courses" : "Enrollment";
    const fileLabel =
      metric === "uniqueCourses"
        ? "unique-courses-by-department"
        : "enrollment-by-department";

    const option: StatsChartOption = {
      backgroundColor: "transparent",
      darkMode: theme.themeMode === "dark",
      title: {
        text: `${metricLabel} by department — ${collegeLabel}`,
        left: "center",
        top: 0,
        textStyle: { fontSize: 14, fontWeight: 700, color: theme.titleColor },
      },
      toolbox: {
        show: true,
        right: 8,
        top: 0,
        feature: {
          saveAsImage: { show: true, name: `${fileLabel}-${collegeLabel}` },
        },
        iconStyle: { borderColor: theme.axisTextColor },
        emphasis: { iconStyle: { borderColor: theme.titleColor } },
      },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      legend: { top: 28, textStyle: { color: theme.axisTextColor } },
      grid: {
        left: 24,
        right: 16,
        top: 64,
        bottom: useDataZoom ? 50 : 18,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: departments,
        axisLine: { lineStyle: { color: theme.gridLineColor } },
        axisLabel: {
          rotate: 90,
          align: "right",
          verticalAlign: "middle",
          margin: 3,
          hideOverlap: true,
          color: theme.axisTextColor,
          formatter: (value: string) => value.split(" ").join("\n"),
        },
      },
      yAxis: {
        type: "value",
        axisLine: { lineStyle: { color: theme.gridLineColor } },
        axisTick: { lineStyle: { color: theme.gridLineColor } },
        splitLine: { lineStyle: { color: theme.gridLineColor } },
        axisLabel: { margin: 10, color: theme.axisTickLabelColor, fontSize: 12 },
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
  }, [base, selectedCollegeKey, metric, theme]);

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 1, sm: 2 },
        borderRadius: 3,
      }}
    >
      <Box
        display="flex"
        flexWrap="wrap"
        alignItems="center"
        gap={1.5}
        sx={{ mb: 1 }}
      >
        <Autocomplete
          size="small"
          options={collegeOptions}
          value={collegeOptions.find((o) => o.key === selectedCollegeKey) ?? null}
          getOptionLabel={(o) => o.label}
          onChange={(_, v) => setSelectedCollegeKey(v?.key ?? null)}
          renderInput={(p) => <TextField {...p} label="College" />}
          sx={{ minWidth: 280 }}
        />
        <ToggleButtonGroup
          size="small"
          exclusive
          value={metric}
          onChange={(_, v) => v && setMetric(v)}
        >
          <ToggleButton value="uniqueCourses">Unique courses</ToggleButton>
          <ToggleButton value="enrollment">Enrollment</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {isLoading && <MyCustomSpinner label="Calculating statistics..." />}
      {!isLoading && error != null && (
        <Typography variant="body2" color="error">
          Failed to load data: {String(error)}
        </Typography>
      )}
      {!isLoading && !error && !option && (
        <Typography variant="body2" color="text.secondary">
          No data available.
        </Typography>
      )}

      {option && <StatsEChart option={option} minWidth={minWidth} themeMode={theme.themeMode} />}
    </Paper>
  );
}
