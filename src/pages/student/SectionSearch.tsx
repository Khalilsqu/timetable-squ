// src/pages/student/SectionSearch.tsx
import {
  Autocomplete,
  Box,
  CircularProgress,
  TextField,
  Typography,
} from "@mui/material";
import type { SectionOpt } from "@/src/stores/studentTableStore";

interface Props {
  sections: SectionOpt[];
  chosen: SectionOpt[];
  onPick: (v: SectionOpt) => void;
  getConflictReason: (o: SectionOpt, chosen: SectionOpt[]) => string | null;
  loading: boolean;
}

export default function SectionSearch({
  sections,
  chosen,
  onPick,
  getConflictReason,
  loading,
}: Props) {
  return (
    <Autocomplete
      options={sections}
      getOptionLabel={(o) => o.label}
      isOptionEqualToValue={(o, v) => o.id === v.id}
      onChange={(_, v) => v && onPick(v)}
      getOptionDisabled={(opt) => !!getConflictReason(opt, chosen)}
      value={null}
      filterOptions={(opts, state) =>
        !state.inputValue
          ? []
          : opts.filter((o) =>
              o.label.toUpperCase().includes(state.inputValue.toUpperCase())
            )
      }
      renderOption={(props, option) => {
        const reason = getConflictReason(option, chosen);
        const timeSlots = option.slots
          .map((s) => `${s.day.toUpperCase()}:${s.start}-${s.end}`)
          .join(", ");
        return (
          <li {...props} style={reason ? { opacity: 0.6 } : undefined}>
            <Box
              display="flex"
              justifyContent="space-between"
              width="100%"
              sx={{ pr: 1 }}
            >
              <Box>
                <strong>{option.label.split(" ")[0]}</strong>{" "}
                {option.label.replace(option.label.split(" ")[0], "")}
                {reason && (
                  <Typography
                    variant="caption"
                    color="error.main"
                    display="block"
                  >
                    Conflict – {reason}
                  </Typography>
                )}
              </Box>
              <Typography variant="body2" color="text.secondary">
                {timeSlots}
              </Typography>
            </Box>
          </li>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={
            chosen.length
              ? `Search more courses (selected: ${chosen.length})`
              : "Type to search by course code"
          }
          slotProps={{
            input: {
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading && <CircularProgress size={20} />}
                  {params.InputProps.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
      className="no-print"
      data-fade
    />
  );
}
