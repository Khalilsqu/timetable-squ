import { useMemo } from "react";
import { Paper, Typography } from "@mui/material";
import type { BarSeriesOption } from "echarts/charts";
import StatsEChart from "./StatsEChart";
import { insideCountLabel, type StatsChartOption } from "./statsEcharts";
import { calcMinWidth, type StatsBaseData, type StatsThemeTokens } from "./statsData";
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
  const { option, minWidth } = useMemo(() => {
    if (!base) return { option: null as StatsChartOption | null, minWidth: 900 };

    const useDataZoom = base.colleges.length > 10;
    const minWidth = calcMinWidth(base.colleges.length);

    const series: BarSeriesOption[] = base.semesterKeys.map((semKey) => ({
      name: base.displaySemesterByKey.get(semKey) ?? semKey,
      type: "bar",
      emphasis: { focus: "series" },
      label: insideCountLabel(),
      labelLayout: { hideOverlap: true },
      data: base.collegeKeys.map(
        (collegeKey) => base.coursesByCollegeBySem.get(collegeKey)?.get(semKey)?.size ?? 0
      ),
    }));

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
  }, [base, theme]);

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 1, sm: 2 },
        borderRadius: 3,
      }}
    >
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
