// C:\Users\kalho\Desktop\github\squ_frontend2\src\components\layout\MainLayout.tsx
import { CssBaseline, ThemeProvider, createTheme, Box } from "@mui/material";
import { Outlet } from "react-router";
import { useLayoutStore } from "@/src/stores/layoutStore";
import AppHeader from "./AppHeader";
import FilterFab from "@/src/components/filters/FilterFab";
import GlobalErrorHandler from "@/src/components/GlobalErrorSnackbar";
import SessionWelcome from "@/src/components/SessionWelcome";

import ScrollTop from "./useScrollTrigger";

const MainLayout = () => {
  const isDark = useLayoutStore((s) => s.isDarkTheme);

  const muiTheme = createTheme({
    palette: { mode: isDark ? "dark" : "light" },
  });

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <Box
        display="flex"
        flexDirection="column"
        minHeight="100vh"
        overflow="hidden"
      >
        <AppHeader />
        <SessionWelcome />

        {/* content area */}
        <Box
          component="main"
          flex={1}
          overflow="hidden"
          sx={{
            // responsive padding (was p={3})
            p: { xs: 1.5, sm: 2, md: 3 },
          }}
        >
          {/* Removed extra pt; AppHeader already inserts a spacer div */}
          <Outlet />
          <FilterFab />
        </Box>

        <ScrollTop />
        <GlobalErrorHandler />
      </Box>
    </ThemeProvider>
  );
};

export default MainLayout;
