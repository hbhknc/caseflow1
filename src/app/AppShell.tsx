import { useState } from "react";
import type { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "@/app/AuthContext";
import { AppChromeContext } from "@/app/AppChrome";
import { useTheme } from "@/app/ThemeContext";
import { AccessRequiredScreen } from "@/features/auth/components/AccessRequiredScreen";

export function AppShell() {
  const auth = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [headerToolbar, setHeaderToolbar] = useState<ReactNode>(null);
  const [sidebarContent, setSidebarContent] = useState<ReactNode>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  if (auth.isLoading) {
    return <div className="login-shell login-shell--loading">Loading access identity...</div>;
  }

  if (!auth.isAuthenticated) {
    return (
      <AccessRequiredScreen
        error={auth.error}
        isLoading={auth.isLoading}
        onRetry={() => void auth.refresh()}
      />
    );
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
        <aside className="app-sidebar">
          <div className="app-sidebar__content">
            <div className="app-sidebar__brand">
              <button
                type="button"
                className="sidebar-toggle"
                aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-pressed={isSidebarCollapsed}
                onClick={() => setIsSidebarCollapsed((current) => !current)}
              >
                <span className="sidebar-toggle__icon" aria-hidden="true">
                  <svg viewBox="0 0 18 18" fill="none">
                    <path
                      d="M3.25 4.25h11.5v9.5H3.25zM6.5 4.25v9.5"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinejoin="round"
                    />
                    <path
                      d={isSidebarCollapsed ? "10 9h3M11.75 7.25 13.5 9l-1.75 1.75" : "11 9H8M9.25 7.25 7.5 9l1.75 1.75"}
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>
            </div>
            {sidebarContent}
          </div>
          <div className="app-sidebar__footer">
            <div className="app-sidebar__user">
              <div className="app-sidebar__user-name">
                {auth.currentUser?.displayName ?? auth.currentUser?.email}
              </div>
              {auth.currentUser?.displayName ? (
                <div className="app-sidebar__user-email">{auth.currentUser.email}</div>
              ) : null}
            </div>
          </div>
        </aside>
        <header className="app-header">
          <div className="app-header__body">
            <div className="app-header__actions">
              <div className="header-toolbar">
                {headerToolbar}
                <div className="header-toolbar__utility-group">
                  <button
                    type="button"
                    className="button button--ghost button--icon"
                    aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                    title={theme === "dark" ? "Light mode" : "Dark mode"}
                    onClick={toggleTheme}
                  >
                    <span className="sidebar-menu__icon" aria-hidden="true">
                      {theme === "dark" ? (
                        <svg viewBox="0 0 18 18" fill="none">
                          <path
                            d="M9 3.25v1.5M9 13.25v1.5M4.76 4.76l1.06 1.06M12.18 12.18l1.06 1.06M3.25 9h1.5M13.25 9h1.5M4.76 13.24l1.06-1.06M12.18 5.82l1.06-1.06M9 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                          />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 18 18" fill="none">
                          <path
                            d="M13.75 10.27A5 5 0 1 1 7.73 4.25a4 4 0 0 0 6.02 6.02Z"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                  </button>
                </div>
              </div>
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
