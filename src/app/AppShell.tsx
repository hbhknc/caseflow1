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
          <div className="app-sidebar__content">
            <button
              type="button"
              className="sidebar-toggle"
              aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-pressed={isSidebarCollapsed}
              onClick={() => setIsSidebarCollapsed((current) => !current)}
            >
              <span className="sidebar-toggle__panel" aria-hidden="true">
                <span className="sidebar-toggle__rail" />
                <span className="sidebar-toggle__body" />
              </span>
            </button>
            {sidebarContent}
          </div>
        </aside>
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </AppChromeContext.Provider>
  );
}
