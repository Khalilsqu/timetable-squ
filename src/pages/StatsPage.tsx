import { lazy, Suspense, useMemo } from "react";
import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useScheduleRows, useSemesters } from "@/src/lib/queries";
import { useFilterStore } from "@/src/stores/filterStore";
import MyCustomSpinner from "@/src/components/MyCustomSpinner";
import { buildStatsBase, getStatsThemeTokens } from "./stats-charts/statsData";

const StatsCollegeSummaryChart = lazy(
  () => import("./stats-charts/StatsCollegeSummaryChart"),
);
const StatsCollegeDepartmentChart = lazy(
  () => import("./stats-charts/StatsCollegeDepartmentChart"),
);
const StatsHallUtilizationHeatmap = lazy(
  () => import("./stats-charts/StatsHallUtilizationHeatmap"),
);
const StatsInstructorTeachingHoursChart = lazy(
  () => import("./stats-charts/StatsInstructorTeachingHoursChart"),
);

export default function StatsPage() {
  const muiTheme = useTheme();
  const theme = useMemo(() => getStatsThemeTokens(muiTheme), [muiTheme]);

  const { data: semInfo } = useSemesters();
  const semester = useFilterStore((s) => s.semester);
  const heatmapSemester = semester || semInfo?.active || "";
  const { data: rows, isLoading, error } = useScheduleRows(null);
  const {
    data: heatmapRows,
    isLoading: heatmapLoading,
    error: heatmapError,
  } = useScheduleRows(heatmapSemester || null);

  const base = useMemo(
    () => buildStatsBase(rows, semInfo?.list),
    [rows, semInfo?.list],
  );

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <Suspense fallback={<MyCustomSpinner label="Loading charts..." />}>
        <StatsCollegeSummaryChart
          base={base}
          theme={theme}
          isLoading={isLoading}
          error={error}
        />
        <StatsCollegeDepartmentChart
          base={base}
          theme={theme}
          isLoading={isLoading}
          error={error}
        />
        <StatsHallUtilizationHeatmap
          rows={heatmapRows}
          theme={theme}
          isLoading={heatmapLoading}
          error={heatmapError}
        />
        <StatsInstructorTeachingHoursChart
          rows={rows}
          semesters={semInfo?.list ?? []}
          activeSemester={heatmapSemester}
          theme={theme}
          isLoading={isLoading}
          error={error}
        />
      </Suspense>
    </Box>
  );
}
