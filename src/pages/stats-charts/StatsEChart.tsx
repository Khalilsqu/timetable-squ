import { useEffect, useRef } from "react";
import { Box } from "@mui/material";
import { echarts, type StatsChartOption } from "./statsEcharts";

export default function StatsEChart({
  option,
  height = 520,
  minWidth = 900,
  themeMode = "light",
}: {
  option: StatsChartOption;
  height?: number;
  minWidth?: number;
  themeMode?: "light" | "dark";
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    chartRef.current?.dispose();
    const chart = echarts.init(el, undefined, { renderer: "canvas" });
    chartRef.current = chart;

    return () => {
      chart.dispose();
      if (chartRef.current === chart) chartRef.current = null;
    };
  }, [themeMode]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.setOption(option, { notMerge: true });
    chart.resize();
  }, [option]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => chartRef.current?.resize());
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Box sx={{ width: "100%", overflowX: "auto", overflowY: "hidden" }}>
      <Box ref={rootRef} sx={{ width: "100%", minWidth, height }} />
    </Box>
  );
}
