import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useTheme } from "@/app/ThemeContext";
import { StatusPill } from "@/components/StatusPill";
import type { AppStatus, BoardSettings } from "@/types/api";
import type {
  DeadlineAnchorType,
  DeadlinePriority,
  DeadlineTemplateItemConfig,
  DeadlineTemplateSettings
} from "@/types/deadlines";
import type { MatterStage } from "@/types/matter";
import { STAGES, getStageLabel } from "@/utils/stages";

type SettingsPanelProps = {
  status: AppStatus | null;
  boardSettings: BoardSettings | null;
  deadlineTemplateSettings: DeadlineTemplateSettings | null;
  onOpenImport: () => void;
  onSaveBoardSettings: (settings: BoardSettings) => Promise<BoardSettings>;
  onSaveDeadlineTemplateSettings: (
    settings: DeadlineTemplateSettings
  ) => Promise<DeadlineTemplateSettings>;
};

type SettingsDraft = {
  boardSettings: BoardSettings | null;
  deadlineTemplateSettings: DeadlineTemplateSettings | null;
};

const AUTO_SAVE_DELAY_MS = 500;

function cloneBoardSettings(boardSettings: BoardSettings): BoardSettings {
  return {
    columnCount: boardSettings.columnCount,
    stageLabels: { ...boardSettings.stageLabels }
  };
}

function cloneDeadlineTemplateSettings(
  deadlineTemplateSettings: DeadlineTemplateSettings
): DeadlineTemplateSettings {
  return {
    templates: deadlineTemplateSettings.templates.map((template) => ({
      ...template,
      items: template.items.map((item) => ({ ...item }))
    }))
  };
}

function buildDraft(
  boardSettings: BoardSettings | null,
  deadlineTemplateSettings: DeadlineTemplateSettings | null
): SettingsDraft {
  return {
    boardSettings: boardSettings ? cloneBoardSettings(boardSettings) : null,
    deadlineTemplateSettings: deadlineTemplateSettings
      ? cloneDeadlineTemplateSettings(deadlineTemplateSettings)
      : null
  };
}

function serializeDraft(draft: SettingsDraft | null) {
  return draft ? JSON.stringify(draft) : null;
}

export function SettingsPanel({
  status,
  boardSettings,
  deadlineTemplateSettings,
  onOpenImport,
  onSaveBoardSettings,
  onSaveDeadlineTemplateSettings
}: SettingsPanelProps) {
  const { theme, setTheme } = useTheme();
  const [draft, setDraft] = useState<SettingsDraft | null>(() =>
    buildDraft(boardSettings, deadlineTemplateSettings)
  );
  const [saveTone, setSaveTone] = useState<"neutral" | "success" | "warn">("neutral");
  const [saveMessage, setSaveMessage] = useState("Changes save automatically.");
  const draftRef = useRef(draft);
  const saveTimerRef = useRef<number | null>(null);
  const isSavingRef = useRef(false);
  const shouldSaveAgainRef = useRef(false);
  const lastSavedSnapshotRef = useRef<string | null>(
    serializeDraft(buildDraft(boardSettings, deadlineTemplateSettings))
  );

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    const nextDraft = buildDraft(boardSettings, deadlineTemplateSettings);
    const incomingSerialized = serializeDraft(nextDraft);
    const currentSerialized = serializeDraft(draftRef.current);
    const shouldSyncDraft =
      currentSerialized === null || currentSerialized === lastSavedSnapshotRef.current;

    lastSavedSnapshotRef.current = incomingSerialized;

    if (shouldSyncDraft && currentSerialized !== incomingSerialized) {
      setDraft(nextDraft);
      draftRef.current = nextDraft;
    }

    setSaveTone("neutral");
    setSaveMessage("Changes save automatically.");
  }, [boardSettings, deadlineTemplateSettings]);

  const runAutoSave = useEffectEvent(async () => {
    const nextDraft = draftRef.current;
    const serializedDraft = serializeDraft(nextDraft);

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
      const previousDraft = JSON.parse(lastSavedSnapshotRef.current ?? "null") as SettingsDraft | null;
      const boardChanged =
        JSON.stringify(nextDraft.boardSettings) !== JSON.stringify(previousDraft?.boardSettings ?? null);
      const templatesChanged =
        JSON.stringify(nextDraft.deadlineTemplateSettings) !==
        JSON.stringify(previousDraft?.deadlineTemplateSettings ?? null);

      const savedBoardSettings =
        boardChanged && nextDraft.boardSettings
          ? await onSaveBoardSettings(nextDraft.boardSettings)
          : nextDraft.boardSettings;
      const savedDeadlineTemplateSettings =
        templatesChanged && nextDraft.deadlineTemplateSettings
          ? await onSaveDeadlineTemplateSettings(nextDraft.deadlineTemplateSettings)
          : nextDraft.deadlineTemplateSettings;

      const syncedDraft = buildDraft(savedBoardSettings, savedDeadlineTemplateSettings);
      const savedSerialized = serializeDraft(syncedDraft);
      const currentSerialized = serializeDraft(draftRef.current);

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

    const serializedDraft = serializeDraft(draft);

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
      current?.boardSettings
        ? {
            ...current,
            boardSettings: {
              ...current.boardSettings,
              stageLabels: {
                ...current.boardSettings.stageLabels,
                [stage]: value
              }
            }
          }
        : current
    );
  }

  function handleTemplateItemChange(
    templateKey: string,
    itemKey: string,
    patch: Partial<DeadlineTemplateItemConfig>
  ) {
    setDraft((current) =>
      current?.deadlineTemplateSettings
        ? {
            ...current,
            deadlineTemplateSettings: {
              templates: current.deadlineTemplateSettings.templates.map((template) =>
                template.key === templateKey
                  ? {
                      ...template,
                      items: template.items.map((item) =>
                        item.key === itemKey ? { ...item, ...patch } : item
                      )
                    }
                  : template
              )
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
                value={draft?.boardSettings?.columnCount ?? 5}
                disabled={!draft?.boardSettings}
                onChange={(event) =>
                  setDraft((current) =>
                    current?.boardSettings
                      ? {
                          ...current,
                          boardSettings: {
                            ...current.boardSettings,
                            columnCount: Number(event.target.value)
                          }
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
                  value={draft?.boardSettings?.stageLabels[stage] ?? ""}
                  disabled={!draft?.boardSettings}
                  onChange={(event) => handleLabelChange(stage, event.target.value)}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <div className="section-heading">
            <h2>Deadline Templates</h2>
            <p>Configure the generated probate deadlines used inside each matter.</p>
          </div>

          <div className="deadline-template-list">
            {(draft?.deadlineTemplateSettings?.templates ?? []).map((template) => (
              <section key={template.key} className="deadline-template-card">
                <div className="section-heading">
                  <h3>{template.label}</h3>
                  <p>{template.description}</p>
                </div>

                {template.items.length === 0 ? (
                  <p className="task-card__meta">
                    This template keeps the matter manual-only with no generated deadlines.
                  </p>
                ) : (
                  <div className="deadline-template-item-list">
                    {template.items.map((item) => (
                      <div key={item.key} className="deadline-template-item">
                        <div className="settings-form-grid deadline-template-item__grid">
                          <label className="field">
                            <span>Title</span>
                            <input
                              value={item.title}
                              onChange={(event) =>
                                handleTemplateItemChange(template.key, item.key, {
                                  title: event.target.value
                                })
                              }
                            />
                          </label>
                          <label className="field">
                            <span>Category</span>
                            <input
                              value={item.category}
                              onChange={(event) =>
                                handleTemplateItemChange(template.key, item.key, {
                                  category: event.target.value
                                })
                              }
                            />
                          </label>
                          <label className="field">
                            <span>Anchor</span>
                            <select
                              value={item.anchorType}
                              onChange={(event) =>
                                handleTemplateItemChange(template.key, item.key, {
                                  anchorType: event.target.value as DeadlineAnchorType
                                })
                              }
                            >
                              <option value="qualification_date">Qualification date</option>
                              <option value="publication_date">Publication date</option>
                            </select>
                          </label>
                          <label className="field">
                            <span>Offset days</span>
                            <input
                              type="number"
                              value={item.offsetDays}
                              onChange={(event) =>
                                handleTemplateItemChange(template.key, item.key, {
                                  offsetDays: Number(event.target.value)
                                })
                              }
                            />
                          </label>
                          <label className="field">
                            <span>Priority</span>
                            <select
                              value={item.defaultPriority}
                              onChange={(event) =>
                                handleTemplateItemChange(template.key, item.key, {
                                  defaultPriority: event.target.value as DeadlinePriority
                                })
                              }
                            >
                              <option value="high">High</option>
                              <option value="medium">Medium</option>
                              <option value="low">Low</option>
                            </select>
                          </label>
                          <label className="checkbox-field deadline-template-item__toggle">
                            <input
                              type="checkbox"
                              checked={item.enabled}
                              onChange={(event) =>
                                handleTemplateItemChange(template.key, item.key, {
                                  enabled: event.target.checked
                                })
                              }
                            />
                            <span className="checkbox-field__copy">
                              <strong>Enabled</strong>
                            </span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
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
