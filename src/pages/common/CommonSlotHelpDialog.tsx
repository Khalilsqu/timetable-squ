import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
} from "@mui/material";

interface CommonSlotHelpDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function CommonSlotHelpDialog({
  open,
  onClose,
}: CommonSlotHelpDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="common-slot-help-title"
    >
      <DialogTitle id="common-slot-help-title">
        Common Slot Filters Explained
      </DialogTitle>
      <DialogContent dividers sx={{ pt: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          Modes
        </Typography>
        <Typography variant="body2" component="p">
          <strong>Time Slot:</strong> Shows all sections whose meeting time
          overlaps the selected time range (if no days chosen → all days).
        </Typography>
        <Typography variant="body2" component="p">
          <strong>Hall Occupancy:</strong> Adds a Hall filter; only sections in
          that hall overlapping the time range (and chosen days) appear.
        </Typography>

        <Typography variant="subtitle2" gutterBottom>
          Time Range
        </Typography>
        <Typography variant="body2" component="p">
          A section is included if: sectionStart &lt; selectedEnd AND sectionEnd
          &gt; selectedStart. End must be after Start.
        </Typography>

        <Typography variant="subtitle2" gutterBottom>
          Days
        </Typography>
        <Typography variant="body2" component="p">
          Choose one or more days to restrict results. Empty = any day. Variants
          (TUE / Tuesday) are normalised.
        </Typography>

        <Typography variant="subtitle2" gutterBottom>
          Hall
        </Typography>
        <Typography variant="body2" component="p">
          (Hall Occupancy mode only) Limits results to that hall in the time
          window (also filtered by selected days if any).
        </Typography>

        <Typography variant="subtitle2" gutterBottom>
          Views
        </Typography>
        <Typography variant="body2" component="p">
          <strong>Schedule:</strong> Weekly grid. <br />
          <strong>Table:</strong> Data table (virtualized).
        </Typography>

        <Typography variant="subtitle2" gutterBottom>
          Reset
        </Typography>
        <Typography variant="body2" component="p">
          Restores defaults (Time Slot, 08:00–10:00, no days, no hall, Schedule
          view).
        </Typography>

        <Typography variant="body2" color="text.secondary">
          Tip: Use a narrow window to find a common free slot, or Hall mode to
          inspect room usage.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} size="small" variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
