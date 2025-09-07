import { IconButton, Tooltip } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import type { MRT_ColumnDef } from "material-react-table";
import type { SheetRow } from "@/src/lib/googleSheet";

interface Props {
  rows: SheetRow[];
  columns: MRT_ColumnDef<SheetRow>[];
  semester: string;
}

export default function CommonSlotDownloadButton({
  rows,
  columns,
  semester,
}: Props) {
  const disabled = rows.length === 0;

  const handleDownload = () => {
    if (!rows.length) return;

    const headers = columns.map((c) => c.header as string);
    const accessors = columns.map((c) => c.accessorKey as keyof SheetRow);

    const escape = (v: unknown): string => {
      if (v == null) return "";
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const lines: string[] = [];
    lines.push(headers.map(escape).join(","));
    for (const r of rows) {
      lines.push(
        accessors
          .map((k) => {
            const val = r[k];
            return escape(val instanceof Date ? val.toISOString() : val);
          })
          .join(",")
      );
    }

    const csv = lines.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const fileName = `common_slot_${semester || "all"}_${rows.length}rows.csv`;

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  };

  return (
    <Tooltip
      title={
        disabled
          ? "No rows to download"
          : `Download ${rows.length} row${rows.length === 1 ? "" : "s"} (CSV)`
      }
      arrow
    >
      <span>
        <IconButton
          size="small"
          color="primary"
          disabled={disabled}
          onClick={handleDownload}
          aria-label="download filtered rows as csv"
        >
          <DownloadIcon fontSize="small" />
        </IconButton>
      </span>
    </Tooltip>
  );
}
