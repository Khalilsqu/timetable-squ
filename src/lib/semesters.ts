// src/lib/semesters.ts
//-----------------------------------------------------------
export interface SemesterInfo {
  list: string[]; // e.g. ["2025‑Fall", "2024‑Spring", …]
  active: string | null; // e.g. "2025‑Fall"  (null if none)
}

/* GViz wire format */
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

// src/lib/semesters.ts  (patch)
export async function fetchSemesters(): Promise<SemesterInfo> {
  const url = import.meta.env.VITE_GOOGLE_SHEET3 as string;
  if (!url) throw new Error("VITE_GOOGLE_SHEET2 is not set");

  /* 1 – build a proper gviz URL (works with share links or direct) */
  const idMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  const gidMatch = url.match(/[?&]gid=(\d+)/);
  const sheetId = idMatch ? idMatch[1] : url;
  const gid = gidMatch ? gidMatch[1] : "0";

  const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}&headers=1`;

  /* 1 – fetch & unwrap */
  const raw = await fetch(gvizUrl).then((r) => r.text());
  if (!raw.startsWith("/*O_o*/")) {
    throw new Error("Unexpected response format from Google Sheets");
  }
  const jsonText = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  const { table } = JSON.parse(jsonText) as GVizResp;

  console.log("Fetched semesters from:", table);

  /* 2 – try normal lookup first */
  const norm = (s: string | undefined) => (s ?? "").trim().toLowerCase();
  let semIdx = table.cols.findIndex((c) => norm(c.label) === "semester");
  let actIdx = table.cols.findIndex((c) => norm(c.label) === "active");

  /* 3 – if labels are empty → treat first row as header */
  let dataRows = table.rows;
  if (semIdx === -1 || actIdx === -1) {
    const first = table.rows[0]?.c.map((cell) => norm(cell?.v as string));
    semIdx = first.indexOf("semester");
    actIdx = first.indexOf("active");
    if (semIdx === -1 || actIdx === -1) {
      throw new Error("Sheet must contain 'semester' and 'active' columns");
    }
    dataRows = table.rows.slice(1); // skip header row
  }

  /* 4 – build list + active */
  const list: string[] = [];
  let active: string | null = null;

  dataRows.forEach((r) => {
    const sem = r.c[semIdx]?.v as string | undefined;
    if (!sem) return;
    list.push(sem);

    const flag = String(r.c[actIdx]?.v ?? "")
      .trim()
      .toLowerCase();
    if (!active && flag === "yes") active = sem;
  });

  return { list, active };
}
