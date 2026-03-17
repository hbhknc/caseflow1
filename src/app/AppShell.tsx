import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Board", end: true },
  { to: "/settings", label: "Settings" }
];

export function AppShell() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="window-controls" aria-hidden="true">
          <span className="window-dot window-dot--close" />
          <span className="window-dot window-dot--minimize" />
          <span className="window-dot window-dot--zoom" />
        </div>
        <div className="app-header__body">
          <div className="app-header__identity">
            <p className="eyebrow">Private Probate Workspace</p>
            <div className="title-row">
              <h1>CaseFlow</h1>
              <span className="app-badge">Internal</span>
            </div>
            <p className="subtitle">
              Matter management for firm probate workflow, from intake through closing.
            </p>
          </div>
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
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
