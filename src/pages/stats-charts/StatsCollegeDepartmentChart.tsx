import { useEffect, useMemo } from "react";
import {
  Autocomplete,
  Box,
  FormControlLabel,
  Paper,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import type { BarSeriesOption } from "echarts/charts";
import StatsEChart from "./StatsEChart";
import {
  absValueFormatter,
  colorForIndex,
  insideCountLabel,
  insideCountLabelAbs,
  splitLevelTooltipFormatter,
  type StatsChartOption,
} from "./statsEcharts";
import {
  calcMinWidth,
  getCollegeOptions,
  LEVEL_KEYS,
  type StatsBaseData,
  type StatsThemeTokens,
} from "./statsData";
import MyCustomSpinner from "@/src/components/MyCustomSpinner";
import { useStatsStore } from "@/src/stores/statsStore";
import type { YAXisOption } from "echarts/types/src/coord/cartesian/AxisModel.js";

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

  const selectedCollegeKey = useStatsStore((s) => s.deptCollegeKey);
  const setSelectedCollegeKey = useStatsStore((s) => s.setDeptCollegeKey);
  const metric = useStatsStore((s) => s.deptMetric);
  const setMetric = useStatsStore((s) => s.setDeptMetric);
  const splitByLevel = useStatsStore((s) => s.deptSplitByLevel);
  const setSplitByLevel = useStatsStore((s) => s.setDeptSplitByLevel);

  useEffect(() => {
    if (collegeOptions.length === 0) return;
    if (!selectedCollegeKey) {
      setSelectedCollegeKey(collegeOptions[0].key);
      return;
    }
    if (!collegeOptions.some((o) => o.key === selectedCollegeKey)) {
      setSelectedCollegeKey(collegeOptions[0].key);
    }
  }, [collegeOptions, selectedCollegeKey, setSelectedCollegeKey]);

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

    const semesterLabels = base.semesterKeys.map(
      (key) => base.displaySemesterByKey.get(key) ?? key
    );
    const semesterLabelByKey = new Map(
      base.semesterKeys.map((key, index) => [
        key,
        semesterLabels[index] ?? key,
      ])
    );
    const semesterColors = new Map(
      base.semesterKeys.map((key, index) => [key, colorForIndex(index)])
    );

    const splitLabel = (
      levelKey: "ug" | "pg"
    ): NonNullable<BarSeriesOption["label"]> => ({
      ...insideCountLabelAbs(),
      position: levelKey === "pg" ? "insideBottom" : "insideTop",
      distance: 2,
    });

    const series: BarSeriesOption[] = splitByLevel
      ? base.semesterKeys.flatMap((semKey) =>
          LEVEL_KEYS.map((levelKey) => ({
            name: semesterLabelByKey.get(semKey) ?? semKey,
            type: "bar",
            stack: semKey,
            emphasis: { focus: "series" },
            label: splitLabel(levelKey),
            labelLayout: { hideOverlap: true },
            itemStyle: { color: semesterColors.get(semKey) },
            data: deptKeys.map((deptKey) => {
              const sign = levelKey === "pg" ? -1 : 1;
              if (metric === "uniqueCourses") {
                const value =
                  base.uniqueCoursesByCollegeDeptSemLevel
                    .get(selectedCollegeKey)
                    ?.get(deptKey)
                    ?.get(semKey)
                    ?.get(levelKey)?.size ?? 0;
                return value * sign;
              }
              const value =
                base.enrollmentByCollegeDeptSemLevel
                  .get(selectedCollegeKey)
                  ?.get(deptKey)
                  ?.get(semKey)
                  ?.get(levelKey) ?? 0;
              return value * sign;
            }),
          }))
        )
      : base.semesterKeys.map((semKey) => ({
          name: semesterLabelByKey.get(semKey) ?? semKey,
          type: "bar",
          emphasis: { focus: "series" },
          label: insideCountLabel(),
          labelLayout: { hideOverlap: true },
          itemStyle: { color: semesterColors.get(semKey) },
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

    const tooltip = splitByLevel
      ? {
          trigger: "axis" as const,
          axisPointer: { type: "shadow" as const },
          formatter: splitLevelTooltipFormatter,
        }
      : { trigger: "axis" as const, axisPointer: { type: "shadow" as const } };

    const yValues = splitByLevel
      ? series.flatMap((entry) =>
          Array.isArray(entry.data) ? entry.data.map((value) => Number(value) || 0) : []
        )
      : [];
    const yMin = splitByLevel && yValues.length ? Math.min(0, ...yValues) : undefined;
    const yMax = splitByLevel && yValues.length ? Math.max(0, ...yValues) : undefined;
    const labelWidth = 36;
    const yAxisLabel: NonNullable<
      Extract<YAXisOption, { type?: "value" }>["axisLabel"]
    > = splitByLevel
      ? {
          margin: 6,
          color: theme.axisTickLabelColor,
          fontSize: 12,
          align: "right",
          width: labelWidth,
          overflow: "truncate",
          showMinLabel: true,
          showMaxLabel: true,
          formatter: (value: number) => {
            const numeric = Number(value);
            const absValue = absValueFormatter(numeric);
            if (yMax !== undefined && numeric === yMax) {
              return `{levelUG|UG}\n{value|${absValue}}`;
            }
            if (yMin !== undefined && numeric === yMin) {
              return `{value|${absValue}}\n{levelPG|PG}`;
            }
            return `{value|${absValue}}`;
          },
          rich: {
            levelUG: {
              fontWeight: 700,
              color: theme.axisTickLabelColor,
              align: "left",
              width: labelWidth,
              lineHeight: 14,
              padding: [0, 0, 20, 20],
            },
            levelPG: {
              fontWeight: 700,
              color: theme.axisTickLabelColor,
              align: "left",
              width: labelWidth,
              lineHeight: 14,
              padding: [20, 0, 0, 20],
            },
            value: {
              color: theme.axisTickLabelColor,
              align: "right",
              width: labelWidth,
            },
          },
        }
      : { margin: 10, color: theme.axisTickLabelColor, fontSize: 12 };
    const yAxis: YAXisOption = {
      type: "value",
      axisLine: { lineStyle: { color: theme.gridLineColor } },
      axisTick: { lineStyle: { color: theme.gridLineColor } },
      splitLine: { lineStyle: { color: theme.gridLineColor } },
      axisLabel: yAxisLabel,
      ...(yMin !== undefined ? { min: yMin } : {}),
      ...(yMax !== undefined ? { max: yMax } : {}),
    };

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
      tooltip,
      legend: { top: 28, textStyle: { color: theme.axisTextColor }, data: semesterLabels },
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
      yAxis,
      dataZoom: useDataZoom
        ? [
            { type: "inside", xAxisIndex: 0 },
            { type: "slider", xAxisIndex: 0, height: 14, bottom: 8 },
          ]
        : [],
      series,
    };

    return { option, minWidth };
  }, [base, selectedCollegeKey, metric, splitByLevel, theme]);

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
        <Box display="flex" alignItems="center" gap={1.5} sx={{ ml: "auto" }}>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={metric}
            onChange={(_, v) => v && setMetric(v)}
          >
            <ToggleButton value="uniqueCourses">Unique courses</ToggleButton>
            <ToggleButton value="enrollment">Enrollment</ToggleButton>
          </ToggleButtonGroup>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={splitByLevel}
                onChange={(_, checked) => setSplitByLevel(checked)}
              />
            }
            label="Split By Level"
          />
        </Box>
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
