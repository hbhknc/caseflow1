import { useEffect, useState } from "react";
import { useTheme } from "@/app/ThemeContext";
import { StatusPill } from "@/components/StatusPill";
import type { AppStatus, BoardSettings } from "@/types/api";
import type { MatterStage } from "@/types/matter";
import { STAGES, getStageLabel } from "@/utils/stages";

type SettingsPanelProps = {
  status: AppStatus | null;
  boardSettings: BoardSettings | null;
  isSaving: boolean;
  saveMessage: string | null;
  onOpenImport: () => void;
  onSave: (settings: BoardSettings) => Promise<void>;
};

export function SettingsPanel({
  status,
  boardSettings,
  isSaving,
  saveMessage,
  onOpenImport,
  onSave
}: SettingsPanelProps) {
  const { theme, setTheme } = useTheme();
  const [draft, setDraft] = useState<BoardSettings | null>(() =>
    boardSettings
      ? {
          columnCount: boardSettings.columnCount,
          stageLabels: { ...boardSettings.stageLabels }
        }
      : null
  );

  useEffect(() => {
    if (!draft && boardSettings) {
      setDraft({
        columnCount: boardSettings.columnCount,
        stageLabels: { ...boardSettings.stageLabels }
      });
    }
  }, [boardSettings, draft]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft) {
      return;
    }

    await onSave(draft);
  }

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
      <form className="stack" onSubmit={handleSubmit}>
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

        <div className="button-row">
          <button type="submit" className="button" disabled={!draft || isSaving}>
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
          {saveMessage ? <StatusPill tone="success">{saveMessage}</StatusPill> : null}
        </div>
      </form>

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
