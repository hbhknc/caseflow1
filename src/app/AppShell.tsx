import { useState } from "react";
import type { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { AppChromeContext } from "@/app/AppChrome";

export function AppShell() {
  const [headerToolbar, setHeaderToolbar] = useState<ReactNode>(null);
  const [sidebarContent, setSidebarContent] = useState<ReactNode>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <AppChromeContext.Provider
      value={{ headerToolbar, setHeaderToolbar, sidebarContent, setSidebarContent }}
    >
      <div
        className={
          isSidebarCollapsed ? "app-shell app-shell--sidebar-collapsed" : "app-shell"
        }
      >
        <header className="app-header">
          <div className="app-header__body">
            <div className="app-header__lead">
              <button
                type="button"
                className="sidebar-toggle"
                aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-pressed={isSidebarCollapsed}
                onClick={() => setIsSidebarCollapsed((current) => !current)}
              >
                <svg viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path
                    d="M3.5 4.5h11M3.5 9h11M3.5 13.5h11"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <div className="app-header__identity">
                <h1>
                  <span>Case</span>
                  <span className="app-header__flow">Flow</span>
                  <span className="app-header__version">v1.0</span>
                </h1>
              </div>
            </div>
            <div className="app-header__actions">
              {headerToolbar ? <div className="header-toolbar">{headerToolbar}</div> : null}
            </div>
          </div>
        </header>
        <aside className="app-sidebar">
          <div className="app-sidebar__content">{sidebarContent}</div>
        </aside>
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </AppChromeContext.Provider>
  );
}
