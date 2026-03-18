import { useEffect, useRef, useState } from "react";
import { Drawer } from "@/components/Drawer";
import { SettingsPanel } from "@/features/settings/components/SettingsPanel";
import { getAppStatus } from "@/services/settings";
import type { AppStatus, BoardSettings } from "@/types/api";

type SettingsModalProps = {
  boardSettings: BoardSettings;
  onSave: (settings: BoardSettings) => Promise<void>;
  onClose: () => void;
};

export function SettingsModal({
  boardSettings,
  onSave,
  onClose
}: SettingsModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    void getAppStatus().then(setStatus).catch(() => setStatus(null));
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

  async function handleSave(nextSettings: BoardSettings) {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      await onSave(nextSettings);
      setSaveMessage("Settings saved");
    } finally {
      setIsSaving(false);
    }
  }

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
          subtitle="Adjust the board layout and visible stage titles."
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
            isSaving={isSaving}
            saveMessage={saveMessage}
            onSave={handleSave}
          />
        </Drawer>
      </div>
    </div>
  );
}
