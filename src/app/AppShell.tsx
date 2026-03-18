import { useState } from "react";
import type { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { AppChromeContext } from "@/app/AppChrome";

export function AppShell() {
  const [headerToolbar, setHeaderToolbar] = useState<ReactNode>(null);
  const [sidebarContent, setSidebarContent] = useState<ReactNode>(null);

  return (
    <AppChromeContext.Provider
      value={{ headerToolbar, setHeaderToolbar, sidebarContent, setSidebarContent }}
    >
      <div className="app-shell">
        <aside className="app-sidebar">
          <div className="app-sidebar__content">{sidebarContent}</div>
        </aside>
        <div className="app-workspace">
          <header className="app-header">
            <div className="app-header__body">
              <div className="app-header__identity">
                <h1>
                  <span>Case</span>
                  <span className="app-header__flow">Flow</span>
                  <span className="app-header__version">v1.0</span>
                </h1>
              </div>
              <div className="app-header__actions">
                {headerToolbar ? <div className="header-toolbar">{headerToolbar}</div> : null}
              </div>
            </div>
          </header>
          <main className="app-main">
            <Outlet />
          </main>
        </div>
      </div>
    </AppChromeContext.Provider>
  );
}
