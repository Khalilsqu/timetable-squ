import { useMemo } from "react";
import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useScheduleRows, useSemesters } from "@/src/lib/queries";
import StatsCollegeDepartmentChart from "./stats-charts/StatsCollegeDepartmentChart";
import StatsCollegeSummaryChart from "./stats-charts/StatsCollegeSummaryChart";
import { buildStatsBase, getStatsThemeTokens } from "./stats-charts/statsData";

export default function StatsPage() {
  const muiTheme = useTheme();
  const theme = useMemo(() => getStatsThemeTokens(muiTheme), [muiTheme]);

  const { data: semInfo } = useSemesters();
  const { data: rows, isLoading, error } = useScheduleRows(null);

  const base = useMemo(
    () => buildStatsBase(rows, semInfo?.list),
    [rows, semInfo?.list]
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
    </Box>
  );
}
