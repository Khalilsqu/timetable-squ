// src\App.tsx

import { BrowserRouter, Routes, Route, useLocation } from "react-router";
import { AnimatePresence } from "framer-motion";
import { lazy, Suspense, type ReactNode } from "react";

import MainLayout from "@/src/components/layout/MainLayout";
import EntryPage from "@/src/pages/entryPage/EntryPage";
import MyCustomSpinner from "@/src/components/MyCustomSpinner";
import RouteSeo from "@/src/components/seo/RouteSeo";

const StudentTimetable = lazy(() => import("./pages/student/StudentTimeTablePage"));
const InstructorTimetable = lazy(() => import("./pages/faculty/InstructorTimetable"));
const DepartmentTimetable = lazy(
  () => import("./pages/department/DepartmentTimetable"),
);
const CollegeTimetable = lazy(() => import("./pages/college/CollegeTimeTable"));
const CommonSlot = lazy(() => import("./pages/common/CommonSlot"));
const StatsPage = lazy(() => import("./pages/StatsPage"));

const LazyRouteFallback = () => <MyCustomSpinner label="Loading page..." />;

const LazyRoute = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={<LazyRouteFallback />}>{children}</Suspense>
);

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
          <Route
            path="student"
            element={
              <LazyRoute>
                <StudentTimetable />
              </LazyRoute>
            }
          />
          <Route
            path="faculty"
            element={
              <LazyRoute>
                <InstructorTimetable />
              </LazyRoute>
            }
          />
          <Route
            path="department"
            element={
              <LazyRoute>
                <DepartmentTimetable />
              </LazyRoute>
            }
          />
          <Route
            path="college"
            element={
              <LazyRoute>
                <CollegeTimetable />
              </LazyRoute>
            }
          />
          <Route
            path="common-slot"
            element={
              <LazyRoute>
                <CommonSlot />
              </LazyRoute>
            }
          />
          <Route
            path="stats"
            element={
              <LazyRoute>
                <StatsPage />
              </LazyRoute>
            }
          />
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
