import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useTheme } from "@/app/ThemeContext";
import { StatusPill } from "@/components/StatusPill";
import type { AppStatus, BoardSettings } from "@/types/api";
import type { MatterStage } from "@/types/matter";
import { STAGES, getStageLabel } from "@/utils/stages";

type SettingsPanelProps = {
  status: AppStatus | null;
  boardSettings: BoardSettings | null;
  onOpenImport: () => void;
  onSave: (settings: BoardSettings) => Promise<BoardSettings>;
};

const AUTO_SAVE_DELAY_MS = 500;

function cloneBoardSettings(boardSettings: BoardSettings): BoardSettings {
  return {
    columnCount: boardSettings.columnCount,
    stageLabels: { ...boardSettings.stageLabels }
  };
}

function serializeBoardSettings(boardSettings: BoardSettings | null): string | null {
  return boardSettings ? JSON.stringify(boardSettings) : null;
}

export function SettingsPanel({
  status,
  boardSettings,
  onOpenImport,
  onSave
}: SettingsPanelProps) {
  const { theme, setTheme } = useTheme();
  const [draft, setDraft] = useState<BoardSettings | null>(() =>
    boardSettings ? cloneBoardSettings(boardSettings) : null
  );
  const [saveTone, setSaveTone] = useState<"neutral" | "success" | "warn">("neutral");
  const [saveMessage, setSaveMessage] = useState("Changes save automatically.");
  const draftRef = useRef(draft);
  const saveTimerRef = useRef<number | null>(null);
  const isSavingRef = useRef(false);
  const shouldSaveAgainRef = useRef(false);
  const lastSavedSnapshotRef = useRef<string | null>(serializeBoardSettings(boardSettings));

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    if (!boardSettings) {
      setDraft(null);
      draftRef.current = null;
      lastSavedSnapshotRef.current = null;
      setSaveTone("neutral");
      setSaveMessage("Changes save automatically.");
      return;
    }

    const nextDraft = cloneBoardSettings(boardSettings);
    const incomingSerialized = serializeBoardSettings(nextDraft);
    const currentSerialized = serializeBoardSettings(draftRef.current);
    const shouldSyncDraft =
      currentSerialized === null || currentSerialized === lastSavedSnapshotRef.current;

    lastSavedSnapshotRef.current = incomingSerialized;

    if (shouldSyncDraft && currentSerialized !== incomingSerialized) {
      setDraft(nextDraft);
      draftRef.current = nextDraft;
    }
  }, [boardSettings]);

  const runAutoSave = useEffectEvent(async () => {
    const nextDraft = draftRef.current;
    const serializedDraft = serializeBoardSettings(nextDraft);

    if (!nextDraft || !serializedDraft || serializedDraft === lastSavedSnapshotRef.current) {
      return;
    }

    if (isSavingRef.current) {
      shouldSaveAgainRef.current = true;
      return;
    }

    isSavingRef.current = true;
    setSaveTone("neutral");
    setSaveMessage("Saving changes...");

    try {
      const savedSettings = await onSave(nextDraft);
      const syncedDraft = cloneBoardSettings(savedSettings);
      const savedSerialized = serializeBoardSettings(syncedDraft);
      const currentSerialized = serializeBoardSettings(draftRef.current);

      lastSavedSnapshotRef.current = savedSerialized;

      if (currentSerialized === serializedDraft) {
        setDraft(syncedDraft);
        draftRef.current = syncedDraft;
        setSaveTone("success");
        setSaveMessage("All changes saved.");
      } else {
        shouldSaveAgainRef.current = true;
        setSaveTone("neutral");
        setSaveMessage("Saving changes...");
      }
    } catch {
      setSaveTone("warn");
      setSaveMessage("Unable to save settings.");
    } finally {
      isSavingRef.current = false;

      if (shouldSaveAgainRef.current) {
        shouldSaveAgainRef.current = false;
        void runAutoSave();
      }
    }
  });

  useEffect(() => {
    if (!draft) {
      return;
    }

    const serializedDraft = serializeBoardSettings(draft);

    if (!serializedDraft || serializedDraft === lastSavedSnapshotRef.current) {
      return;
    }

    saveTimerRef.current = window.setTimeout(() => {
      void runAutoSave();
    }, AUTO_SAVE_DELAY_MS);

    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [draft]);

  useEffect(
    () => () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
    },
    []
  );

  function handleLabelChange(stage: MatterStage, value: string) {
    setDraft((current) =>
      current
        ? {
            ...current,
            stageLabels: {
              ...current.stageLabels,
              [stage]: value
            }
          }
        : current
    );
  }

  return (
    <section className="settings-panel">
      <div className="stack">
        <div className="section-heading">
          <h2>Board Settings</h2>
          <p>Adjust the board layout and rename the visible stage columns.</p>
        </div>

        <div className="settings-section">
          <div className="settings-form-grid">
            <label className="field">
              <span>Theme</span>
              <select
                value={theme}
                onChange={(event) => setTheme(event.target.value as "dark" | "light")}
              >
                <option value="dark">Dark mode</option>
                <option value="light">Light mode</option>
              </select>
              <small className="field-hint">
                Applies to the full CaseFlow interface and stays saved in this browser.
              </small>
            </label>
            <label className="field">
              <span>Columns per row</span>
              <select
                value={draft?.columnCount ?? 5}
                disabled={!draft}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          columnCount: Number(event.target.value)
                        }
                      : current
                  )
                }
              >
                {[1, 2, 3, 4, 5].map((count) => (
                  <option key={count} value={count}>
                    {count} {count === 1 ? "column" : "columns"}
                  </option>
                ))}
              </select>
              <small className="field-hint">
                Controls how many stage columns appear in each board row.
              </small>
            </label>
          </div>

          <div className="settings-stage-grid">
            {STAGES.map((stage) => (
              <label key={stage} className="field">
                <span>{getStageLabel(stage)}</span>
                <input
                  value={draft?.stageLabels[stage] ?? ""}
                  disabled={!draft}
                  onChange={(event) => handleLabelChange(stage, event.target.value)}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <div className="section-heading">
            <h2>Data Tools</h2>
            <p>Import matters into the current board from a spreadsheet export.</p>
          </div>
          <div className="button-row">
            <button type="button" className="button button--ghost" onClick={onOpenImport}>
              Import Cases
            </button>
          </div>
        </div>

        {draft ? (
          <div className="button-row" aria-live="polite">
            <StatusPill tone={saveTone}>{saveMessage}</StatusPill>
          </div>
        ) : null}
      </div>

      <div className="section-heading">
        <h2>Environment</h2>
        <p>Operational notes for the current deployment footprint.</p>
      </div>

      <div className="info-grid">
        <div>
          <span>Application</span>
          <strong>{status?.appName ?? "CaseFlow v1.0"}</strong>
        </div>
        <div>
          <span>API mode</span>
          <strong>{status?.runtime ?? "Demo fallback"}</strong>
        </div>
        <div>
          <span>Authentication</span>
          <strong>Planned for Cloudflare Access + Microsoft Entra</strong>
        </div>
        <div>
          <span>Primary data store</span>
          <strong>D1</strong>
        </div>
      </div>
    </section>
  );
}
