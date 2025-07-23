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

/* ─────────────── Helper ─────────────── */
export async function fetchSheetData(): Promise<SheetData> {
  const url = import.meta.env.VITE_GOOGLE_SHEET1;

  if (!url) throw new Error("VITE_GOOGLE_SHEET1 is not set");

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

  console.log("Fetched sheet data from:", table);

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

  /* 4. Rows with proper types ------------------------------------------ */
  /* 4. Rows with proper types ------------------------------------------ */
  const rows: SheetRow[] = table.rows.map((row) => {
    const obj: SheetRow = {};

    row.c.forEach((cell, i) => {
      const meta = columns[i];
      const rawVal = coerce(cell?.v, meta.type);

      // Use the human column name (label); fall back to A/B/C if label is empty
      const key = (meta.label ?? "").trim() || meta.id;
      obj[key] = formatField(key, rawVal);
    });

    return obj;
  });

  return { columns, rows };
}
