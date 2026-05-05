export interface ExportTable {
  title: string;
  headers: string[];
  rows: (string | number | null)[][];
}

export interface ExportPayload {
  title: string;
  subtitle?: string;
  generated: string; // human-readable UTC string
  stats?: { label: string; value: string | number }[];
  tables: ExportTable[];
  notes?: string;
}
