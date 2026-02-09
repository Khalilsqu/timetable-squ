// src\pages\entryPage\utils\strings.ts
/** Tiny string/number helpers shared across the timetable feature */

export const stripPrefix = (s: string = "", prefix: string): string =>
  s.startsWith(prefix) ? s.slice(prefix.length) : s;

export const cmp = (a: string | number, b: string | number): number =>
  a < b ? -1 : a > b ? 1 : 0;

/** Format PocketBase ISO exam_start → { exam_day, exam_date, exam_start_time }  */
export const fmtStart = (iso?: string) =>
  iso
    ? {
        exam_day: new Date(iso).toLocaleDateString("en-US", {
          weekday: "short",
        }),
        exam_date: iso.slice(0, 10),
        exam_start_time: iso.slice(11, 16),
      }
    : {};

/** Extract “HH:MM” from ISO exam_end */
export const fmtEnd = (iso?: string) => (iso ? iso.slice(11, 16) : undefined);
