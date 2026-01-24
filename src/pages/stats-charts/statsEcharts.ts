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

export type StatsChartOption = ComposeOption<
  | BarSeriesOption
  | GridComponentOption
  | TooltipComponentOption
  | LegendComponentOption
  | DataZoomComponentOption
  | TitleComponentOption
  | ToolboxComponentOption
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

export { echarts };
