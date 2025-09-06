// src/pages/student/AllowConflictsToggle.tsx
import { useState } from "react";
import {
  Box,
  FormControlLabel,
  Checkbox,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useTimetableStore } from "@/src/stores/studentTableStore";

/**
 * Toggle to allow/disallow timetable conflicts with an info explainer.
 * Clears current selections whenever the mode changes.
 */
export default function AllowConflictsToggle() {
  const { allowConflicts, toggleAllowConflicts, clear } = useTimetableStore();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <Box className="no-print" sx={{ ml: { xs: 0, lg: 1 } }}>
      <Box display="flex" alignItems="center">
        <FormControlLabel
          control={
            <Checkbox
              checked={allowConflicts}
              onChange={() => {
                clear();
                toggleAllowConflicts();
              }}
            />
          }
          label="Allow conflicts"
          sx={{ m: 0 }}
        />
        <Tooltip title="Details" arrow>
          <IconButton
            size="small"
            sx={{ ml: 0.5 }}
            aria-label="allow conflicts info"
            onClick={() => setDialogOpen(true)}
          >
            <InfoOutlinedIcon fontSize="inherit" />
          </IconButton>
        </Tooltip>
      </Box>
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        aria-labelledby="allow-conflicts-dialog-title"
      >
        <DialogTitle id="allow-conflicts-dialog-title">
          Allow Conflicts
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ textAlign: "justify" }}>
            When enabled, course schedule and exam conflicts are ignored.
            Overlaps may appear in your timetable or exams list. This is
            generally not recommended unless you are experimenting with
            possibilities.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} autoFocus>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
