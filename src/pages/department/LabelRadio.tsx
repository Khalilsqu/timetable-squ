import { RadioGroup, FormControlLabel, Radio, Typography } from "@mui/material";
import TableChartIcon from "@mui/icons-material/TableChart";
import CalendarViewWeekIcon from "@mui/icons-material/CalendarViewWeek";

type LabelRadioProps = {
  viewParam: string;
  value: string;
  label: string;
};

export const LabelRadio = ({ viewParam, value, label }: LabelRadioProps) => (
  <Typography
    variant="body2"
    color={viewParam === value ? "primary" : "text.secondary"}
    sx={{ display: "flex", alignItems: "center" }}
  >
    {label}
  </Typography>
);

export type ViewSelectorProps = {
  viewParam: string;
  onChange: (newView: string) => void;
};

/**
 * Renders the radio‐group for selecting between
 * "Weekly" and "Table View".
 */
export const ViewSelector = ({ viewParam, onChange }: ViewSelectorProps) => (
  <RadioGroup
    row
    value={viewParam}
    onChange={(_, v) => onChange(v)}
    sx={{
      display: "flex",
      alignItems: "center",
      border: "1px solid",
      borderColor: "divider",
      borderRadius: 1,
      p: 0.5,
    }}
  >
    <FormControlLabel
      value="week"
      control={
        <Radio
          icon={<CalendarViewWeekIcon />}
          checkedIcon={<CalendarViewWeekIcon />}
          size="small"
        />
      }
      label={<LabelRadio viewParam={viewParam} value="week" label="Weekly" />}
    />
    <FormControlLabel
      value="table"
      control={
        <Radio
          icon={<TableChartIcon />}
          checkedIcon={<TableChartIcon />}
          size="small"
        />
      }
      label={
        <LabelRadio viewParam={viewParam} value="table" label="Table View" />
      }
    />
  </RadioGroup>
);
