// src/lib/formatters.ts
import { stripPrefix } from "@/src/pages/entryPage/utils/strings";
import type { CellValue } from "./googleSheet";

const isTime = (k: string) => /_time$/.test(k) && !/_date$/.test(k);
const isDate = (k: string) => /_date$/.test(k);

export function formatField(key: string, value: CellValue): CellValue {
  if (value == null) return value; // leave null / empty alone

  /* — Human‑friendly strings — */
  if (key === "college") return stripPrefix(String(value), "College of ");

  if (key === "department") return stripPrefix(String(value), "Department of ");

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

  return value;
}
