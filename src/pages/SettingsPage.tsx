import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAppChrome } from "@/app/AppChrome";
import { SettingsPanel } from "@/features/settings/components/SettingsPanel";
import { getAppStatus } from "@/services/settings";
import type { AppStatus } from "@/types/api";

export function SettingsPage() {
  const { setHeaderToolbar, setSidebarContent } = useAppChrome();
  const [status, setStatus] = useState<AppStatus | null>(null);

  useEffect(() => {
    void getAppStatus().then(setStatus).catch(() => setStatus(null));
  }, []);

  useEffect(() => {
    setHeaderToolbar(null);
    setSidebarContent(
      <nav className="sidebar-menu" aria-label="Settings actions">
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
      <SettingsPanel status={status} />
    </div>
  );
}
