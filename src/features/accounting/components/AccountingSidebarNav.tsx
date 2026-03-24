import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type AccountingSidebarNavProps = {
  current: "accounting" | "board" | "settings";
};

function renderNavItem(
  current: AccountingSidebarNavProps["current"],
  target: AccountingSidebarNavProps["current"],
  to: string,
  label: string,
  icon: ReactNode
) {
  if (current === target) {
    return (
      <div className="sidebar-menu__item sidebar-menu__item--primary" aria-current="page">
        <span className="sidebar-menu__icon" aria-hidden="true">
          {icon}
        </span>
        <span>{label}</span>
      </div>
    );
  }

  return (
    <Link to={to} className="sidebar-menu__item" title={label}>
      <span className="sidebar-menu__icon" aria-hidden="true">
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  );
}

export function AccountingSidebarNav({ current }: AccountingSidebarNavProps) {
  return (
    <nav className="sidebar-menu" aria-label="Accounting navigation">
      <section className="sidebar-menu__section" aria-label="Workspace">
        <p className="sidebar-menu__section-label">Workspace</p>
        {renderNavItem(
          current,
          "board",
          "/",
          "Board",
          <svg viewBox="0 0 18 18" fill="none">
            <path
              d="M3.5 4.5h4.5v4.5H3.5zm6 0h4.5v4.5H9.5zm-6 6h4.5v4.5H3.5zm6 0h4.5v4.5H9.5z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {renderNavItem(
          current,
          "accounting",
          "/accounting",
          "Accounting",
          <svg viewBox="0 0 18 18" fill="none">
            <path
              d="M4 4.5h10M4 8.75h10M4 13h6.5M4.75 3.75h8.5a1 1 0 0 1 1 1v8.5a1 1 0 0 1-1 1h-8.5a1 1 0 0 1-1-1v-8.5a1 1 0 0 1 1-1Z"
              stroke="currentColor"
              strokeWidth="1.35"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </section>
      <section className="sidebar-menu__section" aria-label="Admin">
        <p className="sidebar-menu__section-label">Admin</p>
        {renderNavItem(
          current,
          "settings",
          "/settings",
          "Settings",
          <svg viewBox="0 0 18 18" fill="none">
            <path
              d="M9 4.25a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8Zm0 7.1a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8ZM4.25 9a.9.9 0 1 0 1.8 0 .9.9 0 0 0-1.8 0Zm7.7 0a.9.9 0 1 0 1.8 0 .9.9 0 0 0-1.8 0Z"
              fill="currentColor"
            />
            <path
              d="M9 2.75v1.2M9 14.05v1.2M2.75 9h1.2M14.05 9h1.2M4.58 4.58l.85.85M12.57 12.57l.85.85M4.58 13.42l.85-.85M12.57 5.43l.85-.85"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
            />
          </svg>
        )}
      </section>
    </nav>
  );
}
