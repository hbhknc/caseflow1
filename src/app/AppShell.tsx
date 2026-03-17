import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Board", end: true },
  { to: "/settings", label: "Settings" }
];

export function AppShell() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__body">
          <div className="app-header__identity">
            <h1>CaseFlow</h1>
            <p className="subtitle">Matters Managed.</p>
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
