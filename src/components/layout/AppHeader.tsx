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
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import HomeIcon from "@mui/icons-material/Home";
import { Link as RouterLink, NavLink, useLocation } from "react-router";
import { styled, alpha } from "@mui/material/styles";
import { useLayoutStore } from "@/src/stores/layoutStore";

const navItems = [
  { label: "Student", path: "/student" },
  { label: "Faculty", path: "/faculty" },
  { label: "Department", path: "/department" },
  { label: "College", path: "/college" },
  { label: "Common Slot", path: "/common-slot" },
];

// styled nav link
const NavAnchor = styled(NavLink)(({ theme }) => {
  const isDark = theme.palette.mode === "dark";
  return {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 12px",
    borderRadius: 20,
    fontSize: 14,
    lineHeight: 1.4,
    textDecoration: "none",
    color: theme.palette.text.secondary,
    fontWeight: 500,
    transition: "background-color .25s,color .25s",
    outline: "none",
    "&:hover": {
      backgroundColor: alpha(theme.palette.primary.main, isDark ? 0.25 : 0.1),
      color: theme.palette.text.primary,
    },
    "&.active": {
      color: theme.palette.primary.contrastText,
      backgroundColor: theme.palette.primary.main,
      fontWeight: 600,
    },
    "&.active::after": {
      content: '""',
      position: "absolute",
      left: 10,
      right: 10,
      bottom: 3,
      height: 2,
      borderRadius: 2,
      backgroundColor: theme.palette.primary.contrastText,
      opacity: 0.9,
    },
    "&:focus-visible": {
      boxShadow: `0 0 0 3px ${alpha(
        isDark ? theme.palette.primary.light : theme.palette.primary.main,
        0.5
      )}`,
    },
  };
});

const AppHeader = () => {
  const { search } = useLocation(); // ← extract current ?search=params
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isDark = useLayoutStore((s) => s.isDarkTheme);
  const setDark = useLayoutStore((s) => s.setIsDarkTheme);

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
            <NavAnchor
              key={item.path}
              to={{ pathname: item.path, search }}
              className={({ isActive }) => (isActive ? "active" : undefined)}
              end={item.path === "/"} /* avoid partial match unless root */
            >
              {item.label}
            </NavAnchor>
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
              {navItems.map((item) => {
                const active = location.pathname.startsWith(item.path);
                return (
                  <ListItemButton
                    key={item.path}
                    selected={active}
                    component={RouterLink}
                    to={{ pathname: item.path, search }}
                    onClick={() => setDrawerOpen(false)}
                  >
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontWeight: active ? 600 : 500,
                      }}
                    />
                  </ListItemButton>
                );
              })}
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
