// src/components/MyCustomSpinner.tsx
import { Box, CircularProgress, Typography, useTheme } from "@mui/material";

const MyCustomSpinner = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 4,
        px: 2,
        userSelect: "none",
      }}
    >
      <CircularProgress
        size={64}
        thickness={5}
        sx={{
          color: theme.palette.secondary.main,
          filter: "drop-shadow(0 0 6px rgba(0,0,0,0.25))",
        }}
      />
      <Typography
        variant="subtitle1"
        sx={{ mt: 2, color: theme.palette.text.secondary }}
      >
        Wait, fetching data from database…
      </Typography>
    </Box>
  );
};

export default MyCustomSpinner;
