import { useEffect, useRef, useState } from "react";
import { Drawer } from "@/components/Drawer";
import { SettingsPanel } from "@/features/settings/components/SettingsPanel";
import { getSettingsOverview } from "@/services/settings";
import type { AppStatus, BoardSettings } from "@/types/api";
import type { DeadlineTemplateSettings } from "@/types/deadlines";

type SettingsModalProps = {
  boardSettings: BoardSettings;
  onOpenImport: () => void;
  onSaveBoardSettings: (settings: BoardSettings) => Promise<BoardSettings>;
  onSaveDeadlineTemplateSettings: (
    settings: DeadlineTemplateSettings
  ) => Promise<DeadlineTemplateSettings>;
  onClose: () => void;
};

export function SettingsModal({
  boardSettings,
  onOpenImport,
  onSaveBoardSettings,
  onSaveDeadlineTemplateSettings,
  onClose
}: SettingsModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [deadlineTemplateSettings, setDeadlineTemplateSettings] =
    useState<DeadlineTemplateSettings | null>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    void getSettingsOverview()
      .then((response) => {
        setStatus(response.status);
        setDeadlineTemplateSettings(response.deadlineTemplateSettings);
      })
      .catch(() => {
        setStatus(null);
        setDeadlineTemplateSettings(null);
      });
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

  return (
    <div className="drawer-overlay" role="presentation" onClick={onClose}>
      <div
        className="drawer-modal task-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        onClick={(event) => event.stopPropagation()}
      >
        <Drawer
          title="Settings"
          subtitle="Adjust the interface theme, board layout, visible stage titles, deadline templates, and data tools."
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
          <SettingsPanel
            status={status}
            boardSettings={boardSettings}
            deadlineTemplateSettings={deadlineTemplateSettings}
            onOpenImport={onOpenImport}
            onSaveBoardSettings={onSaveBoardSettings}
            onSaveDeadlineTemplateSettings={async (settings) => {
              const saved = await onSaveDeadlineTemplateSettings(settings);
              setDeadlineTemplateSettings(saved);
              return saved;
            }}
          />
        </Drawer>
      </div>
    </div>
  );
}
