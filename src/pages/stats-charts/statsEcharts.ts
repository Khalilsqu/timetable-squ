import * as echarts from "echarts/core";
import type { ComposeOption } from "echarts/core";
import {
  BarChart,
  CustomChart,
  HeatmapChart,
  type BarSeriesOption,
  type CustomSeriesOption,
  type HeatmapSeriesOption,
} from "echarts/charts";
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
  VisualMapComponent,
  type VisualMapComponentOption,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
  BarChart,
  CustomChart,
  HeatmapChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  TitleComponent,
  ToolboxComponent,
  VisualMapComponent,
  CanvasRenderer,
]);

export type StatsChartOption = ComposeOption<
  | BarSeriesOption
  | CustomSeriesOption
  | HeatmapSeriesOption
  | GridComponentOption
  | TooltipComponentOption
  | LegendComponentOption
  | DataZoomComponentOption
  | TitleComponentOption
  | ToolboxComponentOption
  | VisualMapComponentOption
>;

export function insideCountLabel(): NonNullable<BarSeriesOption["label"]> {
  return {
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
  };
}

export function insideCountLabelAbs(): NonNullable<BarSeriesOption["label"]> {
  return {
    show: true,
    position: "inside",
    fontSize: 11,
    color: "#fff",
    textBorderColor: "rgba(0,0,0,0.35)",
    textBorderWidth: 2,
    formatter: (p) => {
      const v = Math.abs(Number(p.value));
      return v > 0 ? String(v) : "";
    },
  };
}

export function absValueFormatter(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value ?? "");
  return String(Math.abs(n));
}

export function splitLevelTooltipFormatter(params: unknown): string {
  const items = Array.isArray(params) ? params : [params];
  if (!items.length) return "";

  const first =
    items[0] && typeof items[0] === "object"
      ? (items[0] as Record<string, unknown>)
      : {};
  const headerRaw = first.axisValueLabel ?? first.axisValue ?? first.name ?? "";
  const header = String(headerRaw ?? "");

  const lines = items.map((raw) => {
    const item =
      raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const value = Number(item.value);
    const levelLabel = value < 0 ? "PG" : "UG";
    const displayValue = absValueFormatter(value);
    const marker = typeof item.marker === "string" ? item.marker : "";
    const seriesName = String(item.seriesName ?? "");
    return `${marker}${seriesName} ${levelLabel}: ${displayValue}`;
  });

  return [header, ...lines].join("<br/>");
}

export const SEMESTER_COLORS = [
  "#4E79A7",
  "#F28E2B",
  "#E15759",
  "#76B7B2",
  "#59A14F",
  "#EDC948",
  "#B07AA1",
  "#FF9DA7",
  "#9C755F",
  "#BAB0AC",
];

export function colorForIndex(index: number): string {
  return SEMESTER_COLORS[index % SEMESTER_COLORS.length];
}

export { echarts };
