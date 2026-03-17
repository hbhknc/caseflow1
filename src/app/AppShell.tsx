import { useState } from "react";
import type { ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { AppChromeContext } from "@/app/AppChrome";

const navItems = [
  { to: "/", label: "Board", end: true },
  { to: "/settings", label: "Settings" }
];

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
              <nav className="top-nav" aria-label="Primary">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      isActive ? "nav-link nav-link--active" : "nav-link"
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
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
