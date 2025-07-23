// src\pages\student\SelectedCourseChips.tsx
import { Box, Chip } from "@mui/material";
import type { SectionOpt } from "@/src/stores/studentTableStore";

interface Props {
  chosen: SectionOpt[];
  onRemove: (id: string) => void;
}

export default function SelectedCourseChips({ chosen, onRemove }: Props) {
  return (
    <Box
      mt={2}
      mb={2}
      display="flex"
      gap={1}
      flexWrap="wrap"
      className="no-print"
      data-fade
    >
      {chosen.map((c) => (
        <Chip key={c.id} label={c.label} onDelete={() => onRemove(c.id)} />
      ))}
    </Box>
  );
}

