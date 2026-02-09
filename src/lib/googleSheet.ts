// src\lib\googleSheet.ts
import { formatField } from "@/src/lib/formatters";

/* ─────────────── Public API ─────────────── */
export type CellValue = string | number | boolean | Date | null;

export interface ColumnMeta {
  id: string;
  label: string;
  type: string; // "string" | "number" | "date" | …
  pattern?: string;
}

export type SheetRow = Record<string, CellValue>;

export interface SheetData {
  columns: ColumnMeta[];
  rows: SheetRow[];
}

/* ─────────────── GViz wire format ─────────────── */
interface GVizCell {
  v: unknown;
  f?: string;
}
interface GVizRow {
  c: GVizCell[];
}
interface GVizCol {
  id: string;
  label: string;
  type: string;
  pattern?: string;
}
interface GVizTable {
  cols: GVizCol[];
  rows: GVizRow[];
}
interface GVizResp {
  table: GVizTable;
}

// Map human‑friendly sheet headers to internal keys
const KEY_MAP: Record<string, string> = {
  // new columns
  Collage: "college", // note the misspelling in the sheet
  "Course Code": "course_code",
  "Credit Hours": "credit_hours",
  "Section Num": "section",
  "Course Name": "course_name",
  "Department Name": "department",
  "Instructor Code": "instructor_code",
  "Instructor Name": "instructor",
  "Number of student In Section": "students_in_section",
  "Max Number Of Students": "max_students",
  "Hall Name": "hall",
  "Building Name": "building",
  "Hall Type": "hall_type",
  Day: "day",
  "Room Capcity": "room_capacity",
  "From Time": "start_time",
  "To Time": "end_time",
  Duration: "duration",
  "Exam Date/Time": "exam_date_time",
  "Exam Building": "exam_building",
  "Exam Hall": "exam_hall",
  "Teaching Hours": "teaching_hours",
  UE: "university_elective",
  UR: "university_requirement",
  Semester: "semester",
  "Section type": "section_type",
  "Course Language": "course_language",
  Level: "level",
  // support older/lower‑case names as fallbacks
  College: "college",
  Department: "department",
  "Course code": "course_code",
  "Course name": "course_name",
  Section: "section",
  Instructor: "instructor",
  "Exam day": "exam_day",
  "Exam date": "exam_date",
  "Exam start": "exam_start_time",
  "Exam end": "exam_end_time",
};

// helper to normalise arbitrary header strings
function normaliseKey(label: string): string {
  const trimmed = label.trim();
  // Use explicit mapping when available
  if (KEY_MAP[trimmed]) return KEY_MAP[trimmed];
  // Try case‑insensitive match
  const lower = trimmed.toLowerCase();
  for (const [orig, dest] of Object.entries(KEY_MAP)) {
    if (orig.toLowerCase() === lower) return dest;
  }
  // Fallback: convert spaces to underscores and lowercase
  return lower.replace(/\s+/g, "_");
}

/* ─────────────── Helper ─────────────── */
export async function fetchSheetData(sheetUrl?: string): Promise<SheetData> {
  const url = sheetUrl ?? import.meta.env.VITE_GOOGLE_FALL2025;

  if (!url) throw new Error("No Google Sheet URL was provided");

  /* 1. Build a proper GViz URL (works with share links or direct) */
  const idMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  const gidMatch = url.match(/[?&]gid=(\d+)/);
  const sheetId = idMatch ? idMatch[1] : url;
  const gid = gidMatch ? gidMatch[1] : "0";
  const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}&headers=1`;

  /* 1. Fetch & unwrap --------------------------------------------------- */
  const raw = await fetch(gvizUrl).then((r) => r.text());
  if (!raw.startsWith("/*O_o*/")) {
    throw new Error("Unexpected response format from Google Sheets");
  }
  const jsonText = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  const { table } = JSON.parse(jsonText) as GVizResp;

  /* 2. Column metadata -------------------------------------------------- */
  const columns: ColumnMeta[] = table.cols.map((col) => ({
    id: col.id,
    label: col.label || col.id,
    type: col.type,
    pattern: col.pattern,
  }));

  /* 3. Helpers ---------------------------------------------------------- */
  const dateLiteralRe = /Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)/;

  const parseDateLiteral = (v: string): Date => {
    const m = v.match(dateLiteralRe);
    if (!m) return new Date(v); // Fallback: ISO/anything JS accepts
    const [, y, M, d, h = "0", m2 = "0", s = "0"] = m;
    return new Date(+y, +M, +d, +h, +m2, +s); // Google months are already 0‑based
  };

  const coerce = (rawVal: unknown, colType: string): CellValue => {
    if (rawVal == null) return null;

    switch (colType) {
      case "number":
        return typeof rawVal === "number" ? rawVal : Number(rawVal);
      case "boolean":
        return typeof rawVal === "boolean" ? rawVal : rawVal === "true";
      case "date":
      case "datetime":
        return typeof rawVal === "string"
          ? parseDateLiteral(rawVal)
          : new Date(String(rawVal));
      default:
        return String(rawVal);
    }
  };

  const rows: SheetRow[] = table.rows.map((row) => {
    const rawObj: SheetRow = {};
    row.c.forEach((cell, i) => {
      const meta = columns[i];
      const rawVal = coerce(cell?.v, meta.type);
      const key = (meta.label ?? "").trim() || meta.id;
      rawObj[key] = formatField(key, rawVal);
    });
    // remap keys on a copy so we don’t mutate while iterating
    const remapped: SheetRow = {};
    for (const [k, v] of Object.entries(rawObj)) {
      const internalKey = normaliseKey(k);
      // special handling for the exam date/time column
      if (internalKey === "exam_date_time" && v) {
        const asString = String(v);
        // Parse strings like "28/12/2025 SUN 11:30:00 - 14:30:00"
        // into separate date, day, start and end fields.  The sheet uses
        // DD/MM/YYYY, an uppercase three‑letter day, a start time with
        // optional seconds, a dash, and an end time.  If the format
        // doesn’t match, we simply store the original string on
        // `exam_date_time`.
        const match = asString.match(
          /(\d{2}\/\d{2}\/\d{4})\s+([A-Za-z]{3})\s+(\d{1,2}:\d{2})(?::\d{2})?\s*[-–]\s*(\d{1,2}:\d{2})(?::\d{2})?/,
        );
        if (match) {
          const [, date, day, start, end] = match;
          remapped["exam_date"] = date;
          remapped["exam_day"] = day;
          remapped["exam_start_time"] = start;
          remapped["exam_end_time"] = end;
        }
        // always keep the raw string too
        remapped[internalKey] = v;
        continue;
      }
      // convert UE/UR values into booleans
      if (
        internalKey === "university_elective" ||
        internalKey === "university_requirement"
      ) {
        const str = String(v).trim().toLowerCase();
        remapped[internalKey] =
          str === "true" || str === "yes" || str === "1" || str === "y";
        continue;
      }
      // For all other keys, run the value through formatField again using the
      // normalised key.  This ensures that times like "From Time" and "To Time"
      // (which map to `start_time` and `end_time`) are converted using the
      // `_time` suffix, and dates are converted using the `_date` suffix.  Without
      // this step, a Date object would be stringified with its full date, which
      // is why years were showing up in the section search.
      remapped[internalKey] = formatField(internalKey, v as CellValue);
    }
    return remapped;
  });
  /* 4. Deduplicate ------------------------------------------------------ */
  const seen = new Set<string>();
  const uniqueRows: SheetRow[] = [];

  for (const row of rows) {
    // create a composite key for uniqueness
    // adjust fields as needed if more specificity is required
    const key = [
      String(row.course_code ?? "").trim(),
      String(row.section ?? "").trim(),
      String(row.day ?? "").trim(),
      String(row.start_time ?? "").trim(),
      String(row.end_time ?? "").trim(),
      String(row.instructor ?? "").trim(),
      String(row.hall ?? "").trim(),
      String(row.semester ?? "").trim(),
    ]
      .map((s) => s.toLowerCase())
      .join("|");

    if (!seen.has(key)) {
      seen.add(key);
      uniqueRows.push(row);
    }
  }

  const norm = (v: unknown) =>
    String(v ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ");

  const filteredRows = uniqueRows.filter((row) => {
    const hall = norm(row.hall);
    const building = norm(row.building);
    const instructor = norm(row.instructor);
    const isClosedSection =
      hall === "clo" &&
      building === "closed section" &&
      instructor === "to be announced";
    return !isClosedSection;
  });

  return { columns, rows: filteredRows };
}
