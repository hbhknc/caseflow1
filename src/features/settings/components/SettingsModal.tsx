import { useEffect, useRef, useState } from "react";
import { Drawer } from "@/components/Drawer";
import { SettingsPanel } from "@/features/settings/components/SettingsPanel";
import { getAppStatus } from "@/services/settings";
import type { AppStatus, BoardSettings } from "@/types/api";

type SettingsModalProps = {
  boardSettings: BoardSettings;
  onOpenImport: () => void;
  onSave: (settings: BoardSettings) => Promise<BoardSettings>;
  onClose: () => void;
};

export function SettingsModal({
  boardSettings,
  onOpenImport,
  onSave,
  onClose
}: SettingsModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [status, setStatus] = useState<AppStatus | null>(null);

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
          subtitle="Adjust the interface theme, board layout, visible stage titles, and data tools."
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
            onOpenImport={onOpenImport}
            onSave={onSave}
          />
        </Drawer>
      </div>
    </div>
  );
}
