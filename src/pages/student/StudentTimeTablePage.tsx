//src\pages\student\StudentTimeTablePage.tsx
import PageTransition from "@/src/components/layout/PageTransition";
import StudentTimetableContent from "./StudentTimetableContent";

/**
 * Route entry wrapper – nothing but the transition.
 */
export default function StudentTimetable() {
  return (
    <PageTransition>
      {/* The data-fade attr lets you stagger if you like */}
      <StudentTimetableContent data-fade />
    </PageTransition>
  );
}
