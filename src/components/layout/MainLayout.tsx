// C:\Users\kalho\Desktop\github\squ_frontend2\src\components\layout\MainLayout.tsx
import { CssBaseline, ThemeProvider, createTheme, Box } from "@mui/material";
import { Outlet } from "react-router";
import { useLayoutStore } from "@/src/stores/layoutStore";
import AppHeader from "./AppHeader";
import GlobalErrorHandler from "@/src/components/GlobalErrorSnackbar";
import SessionWelcome from "@/src/components/SessionWelcome";
import ScrollTop from "./useScrollTrigger";
import ViewToggleFab from "@/src/components/filters/ViewToggleFab";

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
        sx={{
          "@media print": {
            display: "block",
            overflow: "visible !important",
            height: "auto",
            minHeight: "auto",
          },
        }}
      >
        <AppHeader />
        <SessionWelcome />

        {/* content area */}
        <Box
          component="main"
          flex={1}
          sx={{
            p: { xs: 1.5, sm: 2, md: 3 },
            bgcolor: (t) =>
              t.palette.mode === "light"
                ? t.palette.grey[50]
                : t.palette.background.default,
            "@media print": {
              display: "block",
              overflow: "visible !important",
              p: 0,
            },
          }}
        >
          {/* AppHeader already inserts a spacer; no extra pt needed */}
          <Outlet />
          <ViewToggleFab />
        </Box>

        <ScrollTop />
        <GlobalErrorHandler />
      </Box>
    </ThemeProvider>
  );
};

export default MainLayout;
