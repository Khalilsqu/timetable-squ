import { useMemo } from "react";
import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useScheduleRows, useSemesters } from "@/src/lib/queries";
import { useFilterStore } from "@/src/stores/filterStore";
import StatsCollegeDepartmentChart from "./stats-charts/StatsCollegeDepartmentChart";
import StatsCollegeSummaryChart from "./stats-charts/StatsCollegeSummaryChart";
import StatsHallUtilizationHeatmap from "./stats-charts/StatsHallUtilizationHeatmap";
import { buildStatsBase, getStatsThemeTokens } from "./stats-charts/statsData";

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
    </Box>
  );
}
