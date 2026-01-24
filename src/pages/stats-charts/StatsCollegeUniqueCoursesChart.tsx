import { useMemo, useState } from "react";
import { Box, FormControlLabel, Paper, Switch, Typography } from "@mui/material";
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
import type { YAXisOption } from "echarts/types/src/coord/cartesian/AxisModel.js";
import {
  LEVEL_KEYS,
  calcMinWidth,
  type StatsBaseData,
  type StatsThemeTokens,
} from "./statsData";
import MyCustomSpinner from "@/src/components/MyCustomSpinner";

export default function StatsCollegeUniqueCoursesChart({
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
  const [splitByLevel, setSplitByLevel] = useState(false);
  const { option, minWidth } = useMemo(() => {
    if (!base) return { option: null as StatsChartOption | null, minWidth: 900 };

    const useDataZoom = base.colleges.length > 10;
    const minWidth = calcMinWidth(base.colleges.length);

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
            data: base.collegeKeys.map((collegeKey) => {
              const value =
                base.coursesByCollegeBySemLevel
                  .get(collegeKey)
                  ?.get(semKey)
                  ?.get(levelKey)?.size ?? 0;
              return levelKey === "pg" ? -value : value;
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
          data: base.collegeKeys.map(
            (collegeKey) =>
              base.coursesByCollegeBySem.get(collegeKey)?.get(semKey)?.size ?? 0
          ),
        }));

    const yValues = splitByLevel
      ? series.flatMap((entry) =>
          Array.isArray(entry.data) ? entry.data.map((value) => Number(value) || 0) : []
        )
      : [];
    const yMin = splitByLevel && yValues.length ? Math.min(0, ...yValues) : undefined;
    const yMax = splitByLevel && yValues.length ? Math.max(0, ...yValues) : undefined;
    const labelWidth = 36;
    const yAxisLabel: NonNullable<YAXisOption["axisLabel"]> = splitByLevel
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

    const tooltip = splitByLevel
      ? {
          trigger: "axis" as const,
          axisPointer: { type: "shadow" as const },
          formatter: splitLevelTooltipFormatter,
        }
      : { trigger: "axis" as const, axisPointer: { type: "shadow" as const } };

    const option: StatsChartOption = {
      backgroundColor: "transparent",
      darkMode: theme.themeMode === "dark",
      title: {
        text: "Number of unique courses offered by each college per semester",
        left: "center",
        top: 0,
        textStyle: { fontSize: 14, fontWeight: 700, color: theme.titleColor },
      },
      toolbox: {
        show: true,
        right: 8,
        top: 0,
        feature: {
          saveAsImage: { show: true, name: "unique-courses-by-college" },
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
        data: base.colleges,
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
  }, [base, splitByLevel, theme]);

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 1, sm: 2 },
        borderRadius: 3,
      }}
    >
      <Box display="flex" justifyContent="flex-end" sx={{ mb: 1 }}>
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

      {option && (
        <StatsEChart option={option} minWidth={minWidth} themeMode={theme.themeMode} />
      )}
    </Paper>
  );
}
