// src\components\filters\FilterFab.tsx

import { useState } from "react";
import { useLocation } from "react-router";
import { Fab } from "@mui/material";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import FilterDrawer from "./FilterDrawer";

const FilterFab = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // only render on the root path "/"
  if (location.pathname !== "/") {
    return null;
  }

  return (
    <>
      <Fab
        color="secondary"
        size="small"
        sx={{ position: "fixed", top: 90, left: 25, zIndex: 1200 }}
        onClick={() => setOpen(true)}
        className="no-print"
      >
        <FilterAltIcon />
      </Fab>

      <FilterDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
};

export default FilterFab;
