import Papa from "papaparse";
import type { MatterImportRowInput } from "@/types/api";
import type {
  ParsedImportError,
  ParsedImportPreview,
  ParsedImportRow,
  StageAliasMap
} from "@/types/import";
import { IMPORT_TEMPLATE_HEADERS } from "@/types/import";

type CsvRecord = Partial<Record<(typeof IMPORT_TEMPLATE_HEADERS)[number], string>>;

function normalizeHeader(value: string) {
  return value.trim().toLowerCase();
}

function normalizeCell(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isIsoDate(value: string) {
  return !value || !Number.isNaN(Date.parse(value));
}

function toParsedRow(
  rowNumber: number,
  record: CsvRecord
): ParsedImportRow {
  return {
    rowNumber,
    decedentName: normalizeCell(record.decedentName),
    clientName: normalizeCell(record.clientName),
    fileNumber: normalizeCell(record.fileNumber),
    stage: normalizeCell(record.stage),
    createdAt: normalizeCell(record.createdAt),
    lastActivityAt: normalizeCell(record.lastActivityAt)
  };
}

function mapStage(rawStage: string, stageAliases: StageAliasMap) {
  const normalized = rawStage.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  return stageAliases[normalized] ?? null;
}

export function parseMatterImportCsv(
  file: File,
  stageAliases: StageAliasMap
): Promise<ParsedImportPreview> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      complete: (results) => {
        const headers = (results.meta.fields ?? []).map(normalizeHeader);
        const requiredHeaders = IMPORT_TEMPLATE_HEADERS.slice(0, 4);
        const missingHeaders = requiredHeaders.filter(
          (header) => !headers.includes(normalizeHeader(header))
        );

        if (missingHeaders.length > 0) {
          reject(
            new Error(
              `CSV is missing required headers: ${missingHeaders.join(", ")}.`
            )
          );
          return;
        }

        const rows: MatterImportRowInput[] = [];
        const errors: ParsedImportError[] = [];
        const fileNumbers = new Set<string>();

        results.data.forEach((rawRecord, index) => {
          const record = rawRecord as CsvRecord;
          const row = toParsedRow(index + 2, record);
          const normalizedStage = mapStage(row.stage, stageAliases);

          if (row.stage && !normalizedStage) {
            errors.push({
              rowNumber: row.rowNumber,
              fileNumber: row.fileNumber,
              message: `Stage "${row.stage}" does not match an available CaseFlow stage.`
            });
            return;
          }

          if (!isIsoDate(row.createdAt) || !isIsoDate(row.lastActivityAt)) {
            errors.push({
              rowNumber: row.rowNumber,
              fileNumber: row.fileNumber,
              message: "Dates must be blank or parseable by the browser."
            });
            return;
          }

          if (row.fileNumber && fileNumbers.has(row.fileNumber.toLowerCase())) {
            errors.push({
              rowNumber: row.rowNumber,
              fileNumber: row.fileNumber,
              message: "Duplicate file number appears more than once in the CSV."
            });
            return;
          }

          if (row.fileNumber) {
            fileNumbers.add(row.fileNumber.toLowerCase());
          }
          rows.push({
            rowNumber: row.rowNumber,
            decedentName: row.decedentName,
            clientName: row.clientName,
            fileNumber: row.fileNumber,
            stage: normalizedStage ?? stageAliases.intake,
            createdAt: row.createdAt || undefined,
            lastActivityAt: row.lastActivityAt || undefined
          });
        });

        resolve({ rows, errors });
      },
      error: (error) => reject(error)
    });
  });
}
