import { useEffect, useMemo } from "react";
import { Autocomplete, Box, Paper, TextField, Typography } from "@mui/material";
import StatsEChart from "./StatsEChart";
import type { StatsChartOption } from "./statsEcharts";
import type { StatsThemeTokens } from "./statsData";
import MyCustomSpinner from "@/src/components/MyCustomSpinner";
import type { SheetRow } from "@/src/lib/googleSheet";
import { useStatsStore } from "@/src/stores/statsStore";

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
const DAY_CANON = ["Sun", "Mon", "Tue", "Wed", "Thu"] as const;
type CanonDay = (typeof DAY_CANON)[number];
const DAY_SET = new Set<CanonDay>(DAY_CANON);

function isCanonDay(day: string): day is CanonDay {
  return DAY_SET.has(day as CanonDay);
}

const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return NaN;
  return h * 60 + m;
};

function canonicalDay(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const key = raw.trim().toLowerCase();
  const ord = DAY_ORDER[key];
  return ord === undefined ? null : DAY_CANON[ord];
}

function extractCanonicalDays(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  const parts = raw.split(/[^A-Za-z]+/).filter(Boolean);
  const uniq: string[] = [];
  for (const p of parts) {
    const c = canonicalDay(p);
    if (c && !uniq.includes(c)) uniq.push(c);
  }
  return uniq;
}

const START_MIN = 8 * 60;
const END_MIN = 22 * 60;
const SLOT_MIN = 10;

const formatTime = (min: number) => {
  const h = Math.floor(min / 60)
    .toString()
    .padStart(2, "0");
  const m = (min % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
};

export default function StatsHallUtilizationHeatmap({
  rows,
  theme,
  isLoading,
  error,
}: {
  rows: SheetRow[] | undefined;
  theme: StatsThemeTokens;
  isLoading: boolean;
  error: unknown;
}) {
  const hallOptions = useMemo(() => {
    if (!rows?.length) return [];
    const set = new Set<string>();
    rows.forEach((row) => {
      const hall = String(row.hall ?? "").trim();
      if (hall) set.add(hall);
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [rows]);
  const selectedHalls = useStatsStore((s) => s.heatmapSelectedHalls);
  const setSelectedHalls = useStatsStore((s) => s.setHeatmapSelectedHalls);
  const heatmapInitialized = useStatsStore((s) => s.heatmapInitialized);
  const setHeatmapInitialized = useStatsStore((s) => s.setHeatmapInitialized);

  useEffect(() => {
    if (heatmapInitialized || hallOptions.length === 0) return;
    setSelectedHalls(hallOptions.slice(0, 5));
    setHeatmapInitialized(true);
  }, [
    hallOptions,
    heatmapInitialized,
    setHeatmapInitialized,
    setSelectedHalls,
  ]);

  const { option, minWidth } = useMemo(() => {
    if (!rows?.length || selectedHalls.length === 0) {
      return { option: null as StatsChartOption | null, minWidth: 900 };
    }

    const hallSet = new Set<string>();
    const slotDetails = new Map<string, Set<string>>();

    const slotStarts: number[] = [];
    for (let m = START_MIN; m < END_MIN; m += SLOT_MIN) {
      slotStarts.push(m);
    }
    const slotsPerDay = slotStarts.length;

    const xLabels: string[] = [];
    const timeLabels: string[] = [];
    const xIndexByKey = new Map<string, number>();
    const dayRanges: Array<[number, number]> = [];
    DAY_CANON.forEach((day, dayIndex) => {
      slotStarts.forEach((slotMin, slotIndex) => {
        const label = `${day} ${formatTime(slotMin)}`;
        const key = `${dayIndex}|${slotIndex}`;
        xIndexByKey.set(key, xLabels.length);
        xLabels.push(label);
        timeLabels.push(formatTime(slotMin));
      });
      const startIndex = dayIndex * slotsPerDay;
      const endIndex = startIndex + slotsPerDay - 1;
      if (xLabels[startIndex] && xLabels[endIndex]) {
        dayRanges.push([startIndex, endIndex]);
      }
    });

    for (const row of rows) {
      const hall = String(row.hall ?? "").trim();
      if (!hall) continue;
      if (selectedHalls.length && !selectedHalls.includes(hall)) continue;

      const startRaw = String(row.start_time ?? "").slice(0, 5);
      const endRaw = String(row.end_time ?? "").slice(0, 5);
      const start = toMinutes(startRaw);
      const end = toMinutes(endRaw);
      if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
      if (end <= START_MIN || start >= END_MIN) continue;

      const rowDays = extractCanonicalDays(row.day).filter(isCanonDay);
      if (!rowDays.length) continue;

      hallSet.add(hall);

      for (const day of rowDays) {
        const dayIndex = DAY_CANON.indexOf(day);
        if (dayIndex < 0) continue;

        const startSlot = Math.max(
          0,
          Math.floor((start - START_MIN) / SLOT_MIN),
        );
        const endSlot = Math.min(
          slotStarts.length,
          Math.ceil((end - START_MIN) / SLOT_MIN),
        );
        for (let slotIndex = startSlot; slotIndex < endSlot; slotIndex += 1) {
          const xKey = `${dayIndex}|${slotIndex}`;
          const xIndex = xIndexByKey.get(xKey);
          if (xIndex === undefined) continue;
          const key = `${hall}|${xIndex}`;
          const course = String(row.course_code ?? "").trim();
          const section = String(row.section ?? "").trim();
          if (course && section) {
            const label = `${course}-${section} (${startRaw}-${endRaw})`;
            const set = slotDetails.get(key) ?? new Set<string>();
            set.add(label);
            slotDetails.set(key, set);
          }
        }
      }
    }

    const halls = selectedHalls.filter((hall) => hallSet.has(hall));
    const yIndexByHall = new Map(halls.map((h, i) => [h, i]));

    const data: Array<[number, number, number]> = [];
    for (const [key, set] of slotDetails.entries()) {
      const [hall, xIndexRaw] = key.split("|");
      const yIndex = yIndexByHall.get(hall);
      if (yIndex === undefined) continue;
      data.push([Number(xIndexRaw), yIndex, set.size]);
    }

    const maxValue = data.reduce((max, item) => Math.max(max, item[2]), 0);

    const dayColors = ["#ef4444", "#8b5cf6", "#10b981", "#f59e0b", "#0ea5e9"];
    const dayBoxes = dayRanges.map(([start, end], index) => [
      start,
      end,
      dayColors[index % dayColors.length],
    ]);

    const option: StatsChartOption = {
      backgroundColor: "transparent",
      darkMode: theme.themeMode === "dark",
      title: {
        text: "Hall usage (Sun–Thu, 08:00–22:00)",
        left: "center",
        top: 0,
        textStyle: { fontSize: 14, fontWeight: 700, color: theme.titleColor },
      },
      tooltip: {
        confine: true,
        position: (
          point: number[],
          _params: unknown,
          _dom: unknown,
          _rect: unknown,
          size: { viewSize: number[] },
        ) => {
          const [x, y] = point;
          const [vw, vh] = size.viewSize;
          const offset = 16;
          const nextX = Math.min(x + offset, vw - offset);
          const nextY = Math.min(y + offset, vh - offset);
          return [nextX, nextY];
        },
        formatter: (p: unknown) => {
          const raw =
            p && typeof p === "object" ? (p as Record<string, unknown>) : {};
          const tuple = Array.isArray(raw.data) ? raw.data : [];
          const xIndex = Number(tuple[0]);
          const yIndex = Number(tuple[1]);
          const value = Number(tuple[2]);
          const hall = halls[yIndex] ?? "";
          const slotLabel = xLabels[xIndex] ?? "";
          const key = `${hall}|${xIndex}`;
          const list = slotDetails.get(key);
          const details = list
            ? [...list].sort((a, b) => a.localeCompare(b))
            : [];
          const detailLines = details.length
            ? `<br/>${details.join("<br/>")}`
            : "";
          const displayCount = Number.isFinite(value) ? value : 0;
          return `${hall}<br/>${slotLabel}<br/>Sections: ${displayCount}${detailLines}`;
        },
      },
      grid: {
        left: 120,
        right: 16,
        top: 38,
        bottom: 60,
        containLabel: true,
      },
      xAxis: [
        {
          type: "category",
          data: timeLabels,
          axisLine: { lineStyle: { color: theme.gridLineColor } },
          axisLabel: {
            rotate: 90,
            align: "right",
            verticalAlign: "middle",
            margin: 6,
            color: theme.axisTextColor,
            interval: 5,
          },
          splitLine: { show: false },
        },
        {
          type: "category",
          data: xLabels,
          position: "bottom",
          offset: 28,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            color: theme.axisTextColor,
            interval: (index: number) =>
              index % slotsPerDay === Math.floor(slotsPerDay / 2),
            formatter: (value: string) => value.split(" ")[0],
            margin: 10,
            fontWeight: 700,
          },
        },
      ],
      yAxis: {
        type: "category",
        data: halls,
        axisLine: { lineStyle: { color: theme.gridLineColor } },
        axisLabel: {
          color: theme.axisTextColor,
          width: 110,
          overflow: "truncate",
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: theme.gridLineColor,
            type: "dotted",
            width: 1,
          },
        },
      },
      visualMap: {
        min: 0,
        max: Math.max(1, maxValue),
        calculable: true,
        orient: "horizontal",
        left: "center",
        bottom: 8,
        inRange: {
          color:
            theme.themeMode === "dark"
              ? ["#1f2937", "#60a5fa", "#f59e0b"]
              : ["#f3f4f6", "#93c5fd", "#f59e0b"],
        },
        textStyle: { color: theme.axisTextColor },
      },
      series: [
        {
          type: "custom",
          silent: true,
          clip: false,
          data: dayBoxes,
          renderItem: (params, api) => {
            if (!api.coord || !api.size) return null;
            const start = api.value(0) as number;
            const end = api.value(1) as number;
            const stroke = (api.value(2) as string) || "#d32f2f";
            const cellSize = api.size([1, 1]) as number[];
            const startCoord = api.coord([start, 0]) as number[];
            const endCoord = api.coord([end, halls.length - 1]) as number[];
            const lineWidth = 2;
            const halfStroke = lineWidth / 2;
            const padPx = 3;
            const x0 = startCoord[0] - cellSize[0] / 2 - halfStroke;
            const x1 = endCoord[0] + cellSize[0] / 2 + halfStroke;
            const topBoundary = api.coord([start, -0.5])[1] as number;
            const bottomBoundary = api.coord([
              start,
              halls.length - 0.5,
            ])[1] as number;
            const yTop = Math.min(topBoundary, bottomBoundary);
            const yBottom = Math.max(topBoundary, bottomBoundary);
            const y0Raw = yTop - cellSize[1] / 2 - halfStroke - padPx;
            const y1Raw = yBottom + cellSize[1] / 2 + halfStroke + padPx;
            const coordSys = params.coordSys as unknown as {
              x: number;
              y: number;
              width: number;
              height: number;
            };
            const yMin = coordSys.y;
            const yMax = coordSys.y + coordSys.height;
            const y0 = Math.max(y0Raw, yMin);
            const y1 = Math.min(y1Raw, yMax);
            return {
              type: "rect",
              shape: {
                x: x0,
                y: y0,
                width: x1 - x0,
                height: y1 - y0,
              },
              style: {
                fill: "rgba(0,0,0,0)",
                stroke,
                lineWidth,
              },
            };
          },
        },
        {
          name: "Hall utilization",
          type: "heatmap",
          data,
          emphasis: {
            itemStyle: {
              borderColor: theme.titleColor,
              borderWidth: 1,
            },
          },
        },
      ],
    };

    const minWidth = Math.max(800, xLabels.length * 3);
    return { option, minWidth };
  }, [rows, selectedHalls, theme]);

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 1, sm: 2 },
        borderRadius: 3,
      }}
    >
      <Box mb={2}>
        <Autocomplete
          multiple
          size="small"
          options={hallOptions}
          value={selectedHalls}
          onChange={(_, v) => setSelectedHalls(v)}
          renderInput={(params) => (
            <TextField {...params} label="Halls" placeholder="Select halls" />
          )}
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
          No hall utilization data available.
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
