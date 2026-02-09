// src\App.tsx

import { BrowserRouter, Routes, Route, useLocation } from "react-router";
import { AnimatePresence } from "framer-motion";

import MainLayout from "@/src/components/layout/MainLayout";
import EntryPage from "@/src/pages/entryPage/EntryPage";
import StudentTimetable from "@/src/pages/student/StudentTimeTablePage";
import InstructorTimetable from "./pages/faculty/InstructorTimetable";
import DepartmentTimetable from "@/src/pages/department/DepartmentTimetable";
import CollegeTimetable from "@/src/pages/college/CollegeTimeTable";
import CommonSlot from "@/src/pages/common/CommonSlot";
import StatsPage from "@/src/pages/StatsPage";
import RouteSeo from "@/src/components/seo/RouteSeo";

/* --- 1. A small wrapper that gets the current location --- */
const AnimatedRoutes = () => {
  const location = useLocation(); // track the URL
  return (
    /* --- 2. AnimatePresence enables exit animations --- */
    <AnimatePresence mode="wait" initial={false}>
      {/* key MUST change when the path changes */}
      <Routes location={location} key={location.pathname}>
        <Route element={<MainLayout />}>
          {/* <Route path="/" element={<div> hello </div>} /> */}
          <Route index element={<EntryPage />} />
          <Route path="student" element={<StudentTimetable />} />
          <Route path="faculty" element={<InstructorTimetable />} />
          <Route path="department" element={<DepartmentTimetable />} />
          <Route path="college" element={<CollegeTimetable />} />
          <Route path="common-slot" element={<CommonSlot />} />
          <Route path="stats" element={<StatsPage />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <RouteSeo />
      <AnimatedRoutes />
    </BrowserRouter>
  );
}
