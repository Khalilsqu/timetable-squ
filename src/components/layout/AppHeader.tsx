// C:\Users\kalho\Desktop\github\squ_frontend2\src\components\layout\AppHeader.tsx
import { useState } from "react";
import {
  AppBar,
  Toolbar,
  Switch,
  Box,
  IconButton,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useTheme } from "@mui/material/styles";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import HomeIcon from "@mui/icons-material/Home";
import { Link as RouterLink, NavLink, useLocation } from "react-router"; // ← switch to react-router-dom for hooks
import { useLayoutStore } from "@/src/stores/layoutStore";

const navItems = [
  { label: "Student", path: "/student" },
  { label: "Faculty", path: "/faculty" },
  { label: "Department", path: "/department" },
  { label: "College", path: "/college" },
];

const AppHeader = () => {
  const { search } = useLocation(); // ← extract current ?search=params
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isDark = useLayoutStore((s) => s.isDarkTheme);
  const setDark = useLayoutStore((s) => s.setIsDarkTheme);
  const theme = useTheme();

  return (
    <AppBar position="sticky" elevation={2} className="no-print">
      <Toolbar
        sx={{
          justifyContent: "space-between",
          px: { xs: 1, sm: 2, md: 3 },
          flexWrap: "wrap",
        }}
      >
        {/* mobile menu button */}
        <IconButton
          color="inherit"
          onClick={() => setDrawerOpen(true)}
          sx={{ display: { xs: "inline-flex", md: "none" }, mr: 1 }}
        >
          <MenuIcon />
        </IconButton>

        {/* logo */}
        <RouterLink to={{ pathname: "/", search }} style={{ color: "inherit" }}>
          <HomeIcon fontSize="large" />
        </RouterLink>

        {/* desktop nav */}
        <Box
          component="nav"
          sx={{
            display: { xs: "none", md: "flex" },
            gap: 2,
          }}
        >
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={{ pathname: item.path, search }}
              style={({ isActive }) => ({
                textDecoration: isActive ? "underline" : "none",
                color: theme.palette.text.primary,
                fontWeight: isActive
                  ? theme.typography.fontWeightBold
                  : theme.typography.fontWeightRegular,
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </Box>

        {/* desktop dark-mode toggle (hidden on xs) */}
        <Box
          display="flex"
          alignItems="center"
          gap={1}
          sx={{ display: { xs: "none", md: "flex" } }}
        >
          <LightModeIcon fontSize="small" />
          <Switch
            checked={isDark}
            onChange={(e) => setDark(e.target.checked)}
            slotProps={{ input: { "aria-label": "dark mode toggle" } }}
          />
          <DarkModeIcon fontSize="small" />
        </Box>

        {/* mobile drawer */}
        <Drawer
          anchor="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          ModalProps={{ keepMounted: true }}
        >
          <Box sx={{ width: 240 }} role="presentation">
            <List>
              {navItems.map((item) => (
                <ListItemButton
                  key={item.path}
                  component={RouterLink}
                  to={{ pathname: item.path, search }}
                  onClick={() => setDrawerOpen(false)}
                >
                  <ListItemText primary={item.label} />
                </ListItemButton>
              ))}
            </List>
            {/* mobile dark-mode toggle below links */}
            <Box
              sx={{
                display: { xs: "flex", md: "none" },
                alignItems: "center",
                gap: 1,
                px: 2,
                pt: 1,
              }}
            >
              <LightModeIcon fontSize="small" />
              <Switch
                checked={isDark}
                onChange={(e) => setDark(e.target.checked)}
                slotProps={{ input: { "aria-label": "dark mode toggle" } }}
              />
              <DarkModeIcon fontSize="small" />
            </Box>
          </Box>
        </Drawer>
      </Toolbar>
    </AppBar>
  );
};

export default AppHeader;

