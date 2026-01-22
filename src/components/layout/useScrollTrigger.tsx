// C:\Users\kalho\Desktop\github\squ_frontend2\src\components\layout\useScrollTrigger.tsx
import { Fab, Zoom, useScrollTrigger } from "@mui/material";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

const ScrollTop = () => {
  /* show when the page is scrolled ≥100 px */
  const trigger = useScrollTrigger({
    disableHysteresis: true, // react immediately
    threshold: 100, // px from top before showing
  });

  const handleClick = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <Zoom in={trigger}>
      <Fab
        size="small"
        color="primary"
        className="no-print"
        onClick={handleClick}
        sx={{
          position: "fixed",
          bottom: 20,
          right: 20,
          zIndex: 1100,
        }}
      >
        <KeyboardArrowUpIcon />
      </Fab>
    </Zoom>
  );
};

export default ScrollTop;

