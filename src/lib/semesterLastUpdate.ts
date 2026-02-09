// src/lib/semesterLastUpdate.ts
//-----------------------------------------------------------
export interface SemesterLastUpdate {
  semester: string; // e.g. "2025‑Fall"
  date: string; // raw cell text e.g. "06/07/2025"
  parsed: Date; // JS Date for convenience
}

/* GViz wire format (minimal) */
interface GVizCell {
  v: unknown;
}
interface GVizRow {
  c: GVizCell[];
}
interface GVizCol {
  label: string;
}
interface GVizTable {
  cols: GVizCol[];
  rows: GVizRow[];
}
interface GVizResp {
  table: GVizTable;
}

function parseGvizDate(cell: string): Date | null {
  // matches Date(2025,5,7)  → [ '2025', '5', '7' ]
  const m = cell.match(/^Date\((\d{4}),\s*(\d{1,2}),\s*(\d{1,2})\)$/);
  if (!m) return null;
  const [, y, mth, d] = m.map(Number);
  return new Date(y, mth, d); // JS months are zero‑based already
}

export async function fetchSemesterLastUpdate(
  wantedSemester?: string, // NEW
): Promise<SemesterLastUpdate> {
  /* 1 — build a proper gviz URL (works with share links or direct) */
  const sheetOrUrl = import.meta.env.VITE_GOOGLE_SHEET2 as string;
  if (!sheetOrUrl) throw new Error("VITE_GOOGLE_SHEET2 is not set");

  const idMatch = sheetOrUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
  const gidMatch = sheetOrUrl.match(/[?&]gid=(\d+)/);
  const sheetId = idMatch ? idMatch[1] : sheetOrUrl;
  const gid = gidMatch ? gidMatch[1] : "0";

  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}&headers=1`;

  const raw = await fetch(url).then((r) => r.text());

  const jsonText = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  const { table } = JSON.parse(jsonText) as GVizResp;

  /* 3 — find column indices (same) */
  const norm = (s: string | undefined) => (s ?? "").trim().toLowerCase();
  const semIdx = table.cols.findIndex((c) => norm(c.label) === "semester");
  const dateIdx = table.cols.findIndex((c) => norm(c.label) === "date");
  if (semIdx === -1 || dateIdx === -1) {
    throw new Error("Tab must contain 'semester' and 'date' columns");
  }

  /* 4 — map every row → {semester, date, parsed} */
  const rows: SemesterLastUpdate[] = table.rows
    .map((r) => {
      const semester = (r.c[semIdx]?.v as string) ?? "";
      const rawDate = (r.c[dateIdx]?.v as string) ?? "";
      const parsed = parseGvizDate(rawDate);
      return parsed ? { semester, date: rawDate, parsed } : null;
    })
    .filter(Boolean) as SemesterLastUpdate[];

  if (!rows.length) throw new Error("Sheet has no valid rows");

  /* 5 — pick the row for the wanted semester (case‑insensitive) */
  const match = wantedSemester
    ? rows.find(
        (r) => r.semester.toLowerCase() === wantedSemester.toLowerCase(),
      )
    : undefined;

  /* 6 — if not found, take the most recent date overall */
  const chosen = match ?? rows.reduce((a, b) => (a.parsed > b.parsed ? a : b));

  return chosen;
}
