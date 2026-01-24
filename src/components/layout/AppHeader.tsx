// C:\Users\kalho\Desktop\github\squ_frontend2\src\components\layout\AppHeader.tsx
import {
  Fragment,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { useSearchParams } from "react-router";
import {
  AppBar,
  Toolbar,
  Switch,
  Box,
  ButtonBase,
  Collapse,
  Grow,
  IconButton,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  MenuList,
  Autocomplete,
  Paper,
  Popper,
  TextField,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import HomeIcon from "@mui/icons-material/Home";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { Link as RouterLink, NavLink, useLocation } from "react-router";
import { styled, alpha } from "@mui/material/styles";
import { useLayoutStore } from "@/src/stores/layoutStore";
import { useFilterStore } from "@/src/stores/filterStore";
import { useSemesters } from "@/src/lib/queries";
import FilterDrawer from "@/src/components/filters/FilterDrawer";

const navItems = [
  { label: "Student", path: "/student" },
  { label: "Faculty", path: "/faculty" },
  { label: "Department", path: "/department" },
  { label: "College", path: "/college" },
];

const extraItems = [
  { label: "Common Slot", path: "/common-slot" },
  { label: "Statistics", path: "/stats" },
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

const NavButton = styled(ButtonBase)(({ theme }) => {
  const isDark = theme.palette.mode === "dark";
  return {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 12px",
    borderRadius: 20,
    fontSize: 14,
    lineHeight: 1.4,
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
  const routerLocation = useLocation();
  const { search } = routerLocation;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isDark = useLayoutStore((s) => s.isDarkTheme);
  const setDark = useLayoutStore((s) => s.setIsDarkTheme);
  const [, setSearchParams] = useSearchParams();
  const [filterOpen, setFilterOpen] = useState(false);
  const [extraAnchorEl, setExtraAnchorEl] = useState<HTMLElement | null>(null);
  const [extraMenuPathname, setExtraMenuPathname] = useState("");
  const [mobileExtraOpenWhenInactive, setMobileExtraOpenWhenInactive] =
    useState(false);
  const [mobileExtraOpenWhenActive, setMobileExtraOpenWhenActive] =
    useState(true);
  const extraCloseTimerRef = useRef<number | null>(null);
  const extraMenuPaperRef = useRef<HTMLDivElement | null>(null);

  // Semester Logic
  const { data: semInfo } = useSemesters();
  const { semester, setSemester, softReset } = useFilterStore();
  const activeSem = semInfo?.active ?? null;

  // Initialize semester if not set
  useEffect(() => {
    if (!semester && activeSem) setSemester(activeSem);
  }, [semester, activeSem, setSemester]);

  const semesterOptions = semInfo?.list ?? [];
  const extraActive = extraItems.some((item) =>
    routerLocation.pathname.startsWith(item.path)
  );
  const extraMenuOpen =
    Boolean(extraAnchorEl) && extraMenuPathname === routerLocation.pathname;
  const mobileExtraOpen = extraActive
    ? mobileExtraOpenWhenActive
    : mobileExtraOpenWhenInactive;

  const cancelExtraClose = useCallback(() => {
    if (extraCloseTimerRef.current) {
      window.clearTimeout(extraCloseTimerRef.current);
      extraCloseTimerRef.current = null;
    }
  }, []);

  const closeExtraMenu = useCallback(() => {
    cancelExtraClose();
    setExtraAnchorEl(null);
  }, [cancelExtraClose]);

  const scheduleExtraClose = useCallback(() => {
    cancelExtraClose();
    extraCloseTimerRef.current = window.setTimeout(() => {
      setExtraAnchorEl(null);
    }, 140);
  }, [cancelExtraClose]);

  useEffect(() => {
    if (!extraMenuOpen) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;

      if (extraAnchorEl && extraAnchorEl.contains(target)) return;
      if (extraMenuPaperRef.current?.contains(target)) return;
      closeExtraMenu();
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [extraMenuOpen, extraAnchorEl, closeExtraMenu]);

  // ---- scroll hide / show state ----
  const [visible, setVisible] = useState(true);
  const [elevated, setElevated] = useState(false);
  const lastYRef = useRef(0);
  const tickingRef = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;
      window.requestAnimationFrame(() => {
        const y = window.scrollY;
        const lastY = lastYRef.current;

        // add elevation after some scroll
        if (!elevated && y > 24) setElevated(true);
        else if (elevated && y <= 24) setElevated(false);

        const delta = y - lastY;
        // show when scrolling up (delta < -8)
        if (delta < -8) {
          if (!visible) setVisible(true);
        } else if (delta > 8 && y > 120) {
          // hide when scrolling down beyond threshold
          if (visible) setVisible(false);
        } else if (y <= 0 && !visible) {
          setVisible(true);
        }
        lastYRef.current = y;
        tickingRef.current = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [visible, elevated]);

  // header height
  const DEFAULT_APP_HEADER_HEIGHT = 56;
  const appBarRef = useRef<HTMLDivElement | null>(null);
  const headerHeightRef = useRef(DEFAULT_APP_HEADER_HEIGHT);
  const visibleRef = useRef(visible);

  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  // Expose a CSS variable for layout offset (consumer can read)
  useEffect(() => {
    const el = appBarRef.current;
    if (!el) return;

    const apply = () => {
      const height =
        el.getBoundingClientRect().height || DEFAULT_APP_HEADER_HEIGHT;
      headerHeightRef.current = height;
      document.documentElement.style.setProperty(
        "--app-header-height",
        `${height}px`,
      );
      document.documentElement.style.setProperty(
        "--app-header-offset",
        visibleRef.current ? `${height}px` : "0px",
      );
    };

    apply();

    const ro = new ResizeObserver(() => apply());
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  // Keep offset adaptive as AppBar hides/shows
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--app-header-offset",
      visible ? `${headerHeightRef.current}px` : "0px",
    );
  }, [visible]);

  return (
    <Fragment>
      <AppBar
        ref={appBarRef}
        position="fixed"
        elevation={elevated ? 4 : 0}
        className="no-print"
        sx={{
          top: 0,
          left: 0,
          right: 0,
          minHeight: DEFAULT_APP_HEADER_HEIGHT,
          color: (t) =>
            t.palette.mode === "dark"
              ? t.palette.grey[100]
              : t.palette.text.primary,
          "& .MuiSvgIcon-root": { color: "inherit" },
          "& .MuiIconButton-root": { color: "inherit" },
          "& a": { color: "inherit" },
          backdropFilter: "blur(8px)",
          backgroundColor: (t) =>
            visible
              ? alpha(
                  t.palette.background.paper,
                  t.palette.mode === "dark" ? 0.88 : 0.92
                )
              : "transparent",
          borderBottom: (t) =>
            visible ? `1px solid ${alpha(t.palette.divider, 0.5)}` : "none",
          boxShadow: elevated
            ? (t) =>
                `0 2px 6px -2px ${
                  t.palette.mode === "dark"
                    ? "rgba(0,0,0,.6)"
                    : "rgba(0,0,0,.25)"
                }`
            : "none",
          transition:
            "transform .35s ease, background-color .3s ease, box-shadow .3s ease",
          transform: visible ? "translateY(0)" : "translateY(-110%)",
          zIndex: (t) => t.zIndex.appBar + 1,
        }}
      >
        <Toolbar
          sx={{
            justifyContent: "space-between",
            px: { xs: 1, sm: 2, md: 3 },
            flexWrap: "wrap",
            minHeight: DEFAULT_APP_HEADER_HEIGHT,
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
          {/* logo + semester selector */}
          <Box display="flex" alignItems="center" gap={2}>
            <RouterLink
              to={{ pathname: "/", search }}
              style={{ color: "inherit", display: "flex", alignItems: "center" }}
            >
              <HomeIcon fontSize="large" />
            </RouterLink>

            {/* Semester Filter */}
            <Autocomplete
              size="small"
              options={semesterOptions}
              value={semester ?? ""}
              disableClearable
              onChange={(_, v) => {
                if (v && v !== semester) {
                  setSemester(v);
                  softReset();

                  // Preserve other params if needed, or clear?
                  // The previous drawer implementation cleared them: setSearchParams({})
                  // Let's keep that behavior for consistency if switching semesters invalidates other filters
                  setSearchParams({});
                }
              }}
              renderInput={(p) => (
                <TextField
                  {...p}
                  variant="outlined"
                  placeholder="Semester"
                  sx={{ width: 140 }}
                  slotProps={{
                    input: {
                      ...p.InputProps,
                      style: {
                        fontSize: "0.875rem",
                        paddingTop: 1,
                        paddingBottom: 1,
                      },
                    },
                  }}
                />
              )}
            />
          </Box>

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

            <NavButton
              className={extraActive ? "active" : undefined}
              onMouseEnter={(e) => {
                cancelExtraClose();
                setExtraMenuPathname(routerLocation.pathname);
                setExtraAnchorEl(e.currentTarget);
              }}
              onMouseLeave={scheduleExtraClose}
              onClick={(e) => {
                cancelExtraClose();
                if (extraMenuOpen) {
                  closeExtraMenu();
                  return;
                }
                setExtraMenuPathname(routerLocation.pathname);
                setExtraAnchorEl(e.currentTarget);
              }}
              aria-haspopup="menu"
              aria-expanded={extraMenuOpen ? "true" : undefined}
              aria-controls={extraMenuOpen ? "extra-menu" : undefined}
            >
              Extra
              <ExpandMoreIcon
                fontSize="small"
                sx={{
                  transition: "transform .15s",
                  transform: extraMenuOpen ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </NavButton>

            <Popper
              id="extra-menu"
              anchorEl={extraAnchorEl}
              open={extraMenuOpen}
              placement="bottom-start"
              transition
              sx={{ zIndex: (t) => t.zIndex.appBar + 2 }}
              modifiers={[
                { name: "offset", options: { offset: [0, 6] } },
                { name: "flip", options: { padding: 8 } },
                { name: "preventOverflow", options: { padding: 8 } },
              ]}
            >
              {({ TransitionProps }) => (
                <Grow {...TransitionProps} style={{ transformOrigin: "0 0" }}>
                  <Paper
                    ref={extraMenuPaperRef}
                    variant="outlined"
                    onMouseEnter={cancelExtraClose}
                    onMouseLeave={scheduleExtraClose}
                    sx={{
                      borderRadius: 2,
                      minWidth: 200,
                      overflow: "hidden",
                    }}
                  >
                    <MenuList dense disablePadding>
                      {extraItems.map((item) => (
                        <MenuItem
                          key={item.path}
                          selected={routerLocation.pathname.startsWith(item.path)}
                          component={RouterLink}
                          to={{ pathname: item.path, search }}
                          onClick={closeExtraMenu}
                        >
                          {item.label}
                        </MenuItem>
                      ))}
                    </MenuList>
                  </Paper>
                </Grow>
              )}
            </Popper>
          </Box>

          {/* desktop dark-mode toggle */}
          <Box
            display="flex"
            alignItems="center"
            gap={1}
            sx={{ display: { xs: "none", md: "flex" } }}
          >
            {routerLocation.pathname === "/" && (
              <IconButton onClick={() => setFilterOpen(true)} color="inherit">
                <FilterAltIcon />
              </IconButton>
            )}
            <LightModeIcon fontSize="small" />
            <Switch
              checked={isDark}
              onChange={(e) => setDark(e.target.checked)}
              slotProps={{ input: { "aria-label": "dark mode toggle" } }}
            />
            <DarkModeIcon fontSize="small" />
          </Box>
          
          {/* mobile filter button (shown on right) */}
          {routerLocation.pathname === "/" && (
             <IconButton
               onClick={() => setFilterOpen(true)}
               color="inherit"
               sx={{ display: { xs: "flex", md: "none" } }}
             >
               <FilterAltIcon />
             </IconButton>
           )}

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
                  const active = routerLocation.pathname.startsWith(item.path);
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

                <ListItemButton
                  onClick={() => {
                    if (extraActive) {
                      setMobileExtraOpenWhenActive((v) => !v);
                      return;
                    }
                    setMobileExtraOpenWhenInactive((v) => !v);
                  }}
                >
                  <ListItemText
                    primary="Extra"
                    primaryTypographyProps={{
                      fontWeight: extraActive ? 600 : 500,
                    }}
                  />
                  {mobileExtraOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </ListItemButton>
                <Collapse in={mobileExtraOpen} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {extraItems.map((item) => {
                      const active = routerLocation.pathname.startsWith(
                        item.path
                      );
                      return (
                        <ListItemButton
                          key={item.path}
                          selected={active}
                          component={RouterLink}
                          to={{ pathname: item.path, search }}
                          sx={{ pl: 4 }}
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
                </Collapse>
              </List>
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

      <FilterDrawer open={filterOpen} onClose={() => setFilterOpen(false)} />

      {/* OFFSET: reserves vertical space so page content isn't hidden */}
      <Box
        aria-hidden
        className="no-print"
        sx={{
          height: "var(--app-header-height,56px)",
          flexShrink: 0,
        }}
      />
    </Fragment>
  );
};

export default AppHeader;
