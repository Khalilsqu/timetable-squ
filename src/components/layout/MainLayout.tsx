// C:\Users\kalho\Desktop\github\squ_frontend2\src\components\layout\MainLayout.tsx
import { CssBaseline, ThemeProvider, createTheme, Box } from "@mui/material";
import { Outlet } from "react-router";
import { useLayoutStore } from "@/src/stores/layoutStore";
import AppHeader from "./AppHeader";
import FilterFab from "@/src/components/filters/FilterFab";
import GlobalErrorHandler from "@/src/components/GlobalErrorSnackbar";

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

        {/* content area grows and hides its own overflow */}
        <Box flex={1} overflow="hidden" p={3}>
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

