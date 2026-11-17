import { hasNonAscii, toAscii } from "../../../lib/ascii";
import type { SubscriptionRow } from "../../subscriptions/api/subscription-row";

/**
 * Export CSV unique : séparateur virgule, TOUT converti sans accent.
 * (Les anciennes variantes sont archivées dans ../legacy/.)
 */

export const CSV_HEADERS = [
  "name",
  "postal_code",
  "line1",
  "line2",
  "city",
  "state",
  "country",
] as const;

type CsvHeader = (typeof CSV_HEADERS)[number];
type CsvRecord = Record<CsvHeader, string>;

const SEPARATOR = ",";

/** Pays anglo-saxons : la ville est suivie de l'état/région. */
const CITY_WITH_STATE_COUNTRIES = ["US", "CA", "AU", "GB", "NZ"];

const formatCityName = (row: SubscriptionRow) => {
  if (CITY_WITH_STATE_COUNTRIES.includes(row.country) && row.city && row.state) {
    return `${row.city} ${row.state}`;
  }
  return row.city;
};

/** Valeurs brutes (avec accents), dans l'ordre des colonnes. */
const getRawRecord = (row: SubscriptionRow): CsvRecord => ({
  name: row.shipName,
  postal_code: row.postalCode,
  line1: row.line1,
  line2: row.line2,
  city: formatCityName(row),
  state: row.state,
  country: row.country,
});

const toAsciiRecord = (raw: CsvRecord): CsvRecord =>
  Object.fromEntries(
    CSV_HEADERS.map((h) => [h, toAscii(raw[h])])
  ) as CsvRecord;

const escapeCsvValue = (value: string): string => {
  if (
    value.includes(SEPARATOR) ||
    value.includes('"') ||
    value.includes("\n")
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

/* ------------------------------------------------------------------ */
/* Analyse avant export (affichée dans la fenêtre de confirmation)     */
/* ------------------------------------------------------------------ */

export interface AccentChange {
  id: string;
  before: string;
  after: string;
}

export interface ExportAnalysis {
  records: CsvRecord[];
  /** Lignes dont au moins un champ a été modifié par la suppression d'accents */
  changedCount: number;
  /** Quelques exemples avant → après */
  samples: AccentChange[];
  /** Lignes où il reste des caractères non latins (cyrillique, chinois…) */
  nonAscii: AccentChange[];
}

export const analyzeExport = (rows: SubscriptionRow[]): ExportAnalysis => {
  const records: CsvRecord[] = [];
  const samples: AccentChange[] = [];
  const nonAscii: AccentChange[] = [];
  let changedCount = 0;

  for (const row of rows) {
    const raw = getRawRecord(row);
    const clean = toAsciiRecord(raw);
    records.push(clean);

    const before = CSV_HEADERS.map((h) => raw[h]).filter(Boolean).join(", ");
    const after = CSV_HEADERS.map((h) => clean[h]).filter(Boolean).join(", ");
    if (CSV_HEADERS.some((h) => raw[h].trim() !== clean[h])) {
      changedCount++;
      if (samples.length < 5 && before !== after) {
        samples.push({ id: row.id, before, after });
      }
    }
    if (hasNonAscii(after)) {
      nonAscii.push({ id: row.id, before, after });
    }
  }

  return { records, changedCount, samples, nonAscii };
};

/* ------------------------------------------------------------------ */
/* Génération + téléchargement                                         */
/* ------------------------------------------------------------------ */

export const buildCsv = (records: CsvRecord[]): string =>
  [
    CSV_HEADERS.join(SEPARATOR),
    ...records.map((r) =>
      CSV_HEADERS.map((h) => escapeCsvValue(r[h])).join(SEPARATOR)
    ),
  ].join("\n");

const triggerDownload = (content: string, filename: string): void => {
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const defaultExportFilename = (count: number) => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}h${pad(d.getMinutes())}`;
  return `abonnes_${stamp}_${count}.csv`;
};

export const downloadCsv = (records: CsvRecord[], filename: string) => {
  triggerDownload(buildCsv(records), filename);
};
