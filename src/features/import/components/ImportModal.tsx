import { useEffect, useMemo, useRef, useState } from "react";
import { Drawer } from "@/components/Drawer";
import { EmptyState } from "@/components/EmptyState";
import { parseMatterImportCsv } from "@/features/import/lib/importCsv";
import type { MatterImportSummary } from "@/types/api";
import type { ParsedImportError, ParsedImportPreview, StageAliasMap } from "@/types/import";
import { IMPORT_TEMPLATE_HEADERS } from "@/types/import";
import type { MatterStage } from "@/types/matter";
import { DEFAULT_STAGE_LABELS } from "@/utils/stages";

type ImportModalProps = {
  boardName: string;
  stageLabels: Record<MatterStage, string>;
  onImport: (preview: ParsedImportPreview) => Promise<MatterImportSummary>;
  onClose: () => void;
};

function createStageAliasMap(
  stageLabels: Record<MatterStage, string>
): StageAliasMap {
  const aliases: StageAliasMap = {};

  for (const [stage, label] of Object.entries(DEFAULT_STAGE_LABELS)) {
    aliases[stage.toLowerCase()] = stage as MatterStage;
    aliases[label.toLowerCase()] = stage as MatterStage;
  }

  for (const [stage, label] of Object.entries(stageLabels)) {
    aliases[stage.toLowerCase()] = stage as MatterStage;
    aliases[label.toLowerCase()] = stage as MatterStage;
  }

  return aliases;
}

export function ImportModal({
  boardName,
  stageLabels,
  onImport,
  onClose
}: ImportModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<ParsedImportPreview | null>(null);
  const [parsingError, setParsingError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<MatterImportSummary | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const stageAliases = useMemo(() => createStageAliasMap(stageLabels), [stageLabels]);
  const templateHref =
    "data:text/csv;charset=utf-8," +
    encodeURIComponent(
      [
        IMPORT_TEMPLATE_HEADERS.join(","),
        'John Doe,Jane Doe,26 E 000321-950,Intake,2026-03-01T13:40:00.000Z,2026-03-16T09:20:00.000Z',
        'Mary Roe,Thomas Roe,EP-2026-0007,Qualified / Opened,2026-01-15T10:00:00.000Z,'
      ].join("\n")
    );

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setImportSummary(null);
    setImportError(null);
    setParsingError(null);
    setPreview(null);

    if (!file) {
      setFileName("");
      return;
    }

    setFileName(file.name);

    try {
      const nextPreview = await parseMatterImportCsv(file, stageAliases);
      setPreview(nextPreview);
    } catch (error) {
      setParsingError(error instanceof Error ? error.message : "Unable to read CSV.");
    } finally {
      event.target.value = "";
    }
  }

  async function handleImport() {
    if (!preview || preview.rows.length === 0) {
      return;
    }

    setIsImporting(true);
    setImportError(null);

    try {
      const summary = await onImport(preview);
      setImportSummary(summary);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Unable to import cases.");
    } finally {
      setIsImporting(false);
    }
  }

  const localErrors: ParsedImportError[] = preview?.errors ?? [];

  return (
    <div className="drawer-overlay" role="presentation" onClick={onClose}>
      <div
        className="drawer-modal import-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Import cases"
        onClick={(event) => event.stopPropagation()}
      >
        <Drawer
          title="Import Cases"
          subtitle={`Upload a CSV to add matters into ${boardName}. Existing file numbers will be skipped.`}
          actions={
            <button
              ref={closeButtonRef}
              type="button"
              className="button button--ghost"
              onClick={onClose}
            >
              Close
            </button>
          }
        >
          <section className="stack">
            <div className="callout import-modal__callout">
              <div className="section-heading">
                <h3>CSV template</h3>
                <p>
                  Required headers: {IMPORT_TEMPLATE_HEADERS.slice(0, 4).join(", ")}. Optional
                  headers: {IMPORT_TEMPLATE_HEADERS.slice(4).join(", ")}.
                </p>
              </div>
              <div className="button-row">
                <a
                  className="button button--ghost"
                  href={templateHref}
                  download="caseflow-import-template.csv"
                >
                  Download sample CSV
                </a>
                <span className="field-hint">
                  Use stage labels such as {stageLabels.intake} or {stageLabels.qualified_opened}.
                </span>
              </div>
            </div>

            <label className="field">
              <span>CSV file</span>
              <input type="file" accept=".csv,text/csv" onChange={handleFileChange} />
            </label>

            {fileName ? <p className="field-hint">Loaded file: {fileName}</p> : null}
            {parsingError ? <p className="stats-empty">{parsingError}</p> : null}
            {importError ? <p className="stats-empty">{importError}</p> : null}

            {preview ? (
              <section className="stack">
                <div className="stats-list">
                  <div className="stats-row">
                    <dt>Ready to import</dt>
                    <dd>{preview.rows.length}</dd>
                  </div>
                  <div className="stats-row">
                    <dt>Blocked rows</dt>
                    <dd>{localErrors.length}</dd>
                  </div>
                </div>

                <div className="button-row">
                  <button
                    type="button"
                    className="button"
                    onClick={() => void handleImport()}
                    disabled={isImporting || preview.rows.length === 0}
                  >
                    {isImporting ? "Importing..." : "Import valid rows"}
                  </button>
                </div>

                {localErrors.length > 0 ? (
                  <div className="stack">
                    <div className="section-heading">
                      <h3>Rows blocked before import</h3>
                      <p>Fix these rows in the CSV and upload it again if you want them imported.</p>
                    </div>
                    <ol className="task-list">
                      {localErrors.map((error) => (
                        <li key={`${error.rowNumber}-${error.fileNumber}`} className="task-card">
                          <div className="task-card__header">
                            <div>
                              <h3>Row {error.rowNumber}</h3>
                              <p>{error.fileNumber || "No file number"}</p>
                            </div>
                          </div>
                          <p className="task-card__body">{error.message}</p>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}
              </section>
            ) : (
              <EmptyState
                title="No CSV loaded"
                message="Choose a CSV file to review importable rows before anything is added to the board."
              />
            )}

            {importSummary ? (
              <section className="stack">
                <div className="section-heading">
                  <h3>Import summary</h3>
                  <p>The board has been refreshed with any newly imported matters.</p>
                </div>
                <div className="stats-list">
                  <div className="stats-row">
                    <dt>Imported</dt>
                    <dd>{importSummary.importedCount}</dd>
                  </div>
                  <div className="stats-row">
                    <dt>Skipped duplicates</dt>
                    <dd>{importSummary.skippedCount}</dd>
                  </div>
                  <div className="stats-row">
                    <dt>Rejected rows</dt>
                    <dd>{importSummary.invalidCount}</dd>
                  </div>
                </div>

                {importSummary.skippedRows.length > 0 ? (
                  <div className="stack">
                    <div className="section-heading">
                      <h3>Skipped duplicates</h3>
                    </div>
                    <ol className="task-list">
                      {importSummary.skippedRows.map((issue) => (
                        <li key={`skip-${issue.rowNumber}-${issue.fileNumber}`} className="task-card">
                          <p className="task-card__body">
                            Row {issue.rowNumber} ({issue.fileNumber}): {issue.message}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}
              </section>
            ) : null}
          </section>
        </Drawer>
      </div>
    </div>
  );
}
