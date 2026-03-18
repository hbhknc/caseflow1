import { useState } from "react";
import type { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { AppChromeContext } from "@/app/AppChrome";

export function AppShell() {
  const [headerToolbar, setHeaderToolbar] = useState<ReactNode>(null);

  return (
    <AppChromeContext.Provider value={{ headerToolbar, setHeaderToolbar }}>
      <div className="app-shell">
        <header className="app-header">
          <div className="app-header__body">
            <div className="app-header__identity">
              <h1>CaseFlow v1.0</h1>
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
    </AppChromeContext.Provider>
  );
}
