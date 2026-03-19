import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAppChrome } from "@/app/AppChrome";
import { SettingsPanel } from "@/features/settings/components/SettingsPanel";
import { getSettingsOverview, saveBoardSettings } from "@/services/settings";
import type { AppStatus, BoardSettings } from "@/types/api";

export function SettingsPage() {
  const { setHeaderToolbar, setSidebarContent } = useAppChrome();
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [boardSettings, setBoardSettings] = useState<BoardSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    void getSettingsOverview()
      .then((response) => {
        setStatus(response.status);
        setBoardSettings(response.boardSettings);
      })
      .catch(() => {
        setStatus(null);
        setBoardSettings(null);
      });
  }, []);

  useEffect(() => {
    setHeaderToolbar(null);
    setSidebarContent(
      <nav className="sidebar-menu" aria-label="Settings actions">
        <Link to="/" className="sidebar-menu__item" aria-label="Board" title="Board">
          <span className="sidebar-menu__icon" aria-hidden="true">
            <svg viewBox="0 0 18 18" fill="none">
              <path
                d="M3.5 4.5h4.5v4.5H3.5zm6 0h4.5v4.5H9.5zm-6 6h4.5v4.5H3.5zm6 0h4.5v4.5H9.5z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span>Board</span>
        </Link>
        <div
          className="sidebar-menu__item sidebar-menu__item--primary"
          aria-current="page"
          title="Settings"
        >
          <span className="sidebar-menu__icon" aria-hidden="true">
            <svg viewBox="0 0 18 18" fill="none">
              <path
                d="M9 4.25a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8Zm0 7.1a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8ZM4.25 9a.9.9 0 1 0 1.8 0 .9.9 0 0 0-1.8 0Zm7.7 0a.9.9 0 1 0 1.8 0 .9.9 0 0 0-1.8 0Z"
                fill="currentColor"
              />
              <path
                d="M9 2.75v1.2M9 14.05v1.2M2.75 9h1.2M14.05 9h1.2M4.58 4.58l.85.85M12.57 12.57l.85.85M4.58 13.42l.85-.85M12.57 5.43l.85-.85"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span>Settings</span>
        </div>
        <Link to="/" className="sidebar-menu__item" aria-label="Back to Board" title="Back to Board">
          <span className="sidebar-menu__icon" aria-hidden="true">
            <svg viewBox="0 0 18 18" fill="none">
              <path
                d="M11.5 4.5 6 9l5.5 4.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span>Back to Board</span>
        </Link>
      </nav>
    );

    return () => setSidebarContent(null);
  }, [setHeaderToolbar, setSidebarContent]);

  async function handleSave(nextSettings: BoardSettings) {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const saved = await saveBoardSettings(nextSettings);
      setBoardSettings(saved);
      setSaveMessage("Settings saved");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="section-heading">
          <h1>Settings</h1>
          <p>
            Operational scaffolding for environment details, future admin controls, and
            Cloudflare Access integration work.
          </p>
        </div>
      </section>
      <SettingsPanel
        status={status}
        boardSettings={boardSettings}
        isSaving={isSaving}
        saveMessage={saveMessage}
        onOpenImport={() => undefined}
        onSave={handleSave}
      />
    </div>
  );
}
