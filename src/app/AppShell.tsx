import { useState } from "react";
import type { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "@/app/AuthContext";
import { AppChromeContext } from "@/app/AppChrome";
import { LoginScreen } from "@/features/auth/components/LoginScreen";

export function AppShell() {
  const auth = useAuth();
  const [headerToolbar, setHeaderToolbar] = useState<ReactNode>(null);
  const [sidebarContent, setSidebarContent] = useState<ReactNode>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  if (auth.isLoading) {
    return <div className="login-shell login-shell--loading">Loading session...</div>;
  }

  if (!auth.isAuthenticated) {
    return <LoginScreen />;
  }

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
          <div className="app-sidebar__footer">
            <div className="app-sidebar__user">{auth.currentUser?.username}</div>
            <button type="button" className="sidebar-menu__item" onClick={() => void auth.logout()}>
              <span className="sidebar-menu__icon" aria-hidden="true">
                <svg viewBox="0 0 18 18" fill="none">
                  <path
                    d="M7 4h-2.5A1.5 1.5 0 0 0 3 5.5v7A1.5 1.5 0 0 0 4.5 14H7M10 12.5 13.5 9 10 5.5M13.5 9H6.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span>Logout</span>
            </button>
          </div>
        </aside>
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </AppChromeContext.Provider>
  );
}
