import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Board", end: true },
  { to: "/settings", label: "Settings" }
];

export function AppShell() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Matter Operations Workspace</p>
          <h1>CaseFlow</h1>
          <p className="subtitle">
            Clear movement from intake through probate closing.
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
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

