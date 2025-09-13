import { Fab, Tooltip } from "@mui/material";
import { useLocation } from "react-router";
import CalendarViewWeekOutlinedIcon from "@mui/icons-material/CalendarViewWeekOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import { useEntryPageViewStore } from "@/src/stores/entryPageViewStore";
import { useFilterStore } from "@/src/stores/filterStore";

const ViewToggleFab = () => {
  const location = useLocation();
  const { view, toggleView } = useEntryPageViewStore();
  const filteredNumber = useFilterStore((s) => s.filteredNumber);

  // only show on index page and when rows < 2000
  if (location.pathname !== "/" || filteredNumber >= 2000) return null;

  return (
    <Tooltip
      title={view === "table" ? "Weekly view" : "Table view"}
      arrow
      placement="right"
    >
      <Fab
        color="primary"
        size="small"
        // place to the right of FilterFab (FilterFab is at left:25, size small (~40px))
        sx={{ position: "fixed", top: 90, left: 73, zIndex: 1200 }}
        onClick={toggleView}
        className="no-print"
        aria-label="toggle view"
      >
        {view === "table" ? (
          <CalendarViewWeekOutlinedIcon />
        ) : (
          <TableChartOutlinedIcon />
        )}
      </Fab>
    </Tooltip>
  );
};

export default ViewToggleFab;
