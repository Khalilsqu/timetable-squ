// src/lib/formatters.ts
import { stripPrefix } from "@/src/pages/entryPage/utils/strings";
import type { CellValue } from "./googleSheet";

const isTime = (k: string) => /_time$/.test(k) && !/_date$/.test(k);
const isDate = (k: string) => /_date$/.test(k);

export function formatField(key: string, value: CellValue): CellValue {
  if (value == null) return value;

  /* — Human‑friendly strings — */
  if (key === "college") return stripPrefix(String(value), "College of ");
  if (key === "department") return stripPrefix(String(value), "Department of ");

  // Convert a date stored under the "day" column to its weekday name (e.g. MON).
  if (key === "day" && value instanceof Date)
    return value.toLocaleDateString("en-US", { weekday: "short" });

  // Existing rules for times and dates
  if (isTime(key) && value instanceof Date)
    return value.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  if (isDate(key) && value instanceof Date)
    return value.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  // Fallback: if we still have a Date object (because the key didn’t match any pattern),
  // convert it to a locale string so React receives a string instead of a Date.
  if (value instanceof Date) return value.toLocaleString();

  return value;
}
