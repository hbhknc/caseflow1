import type { PropsWithChildren, ReactNode } from "react";

type DrawerProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}>;

export function Drawer({ title, subtitle, actions, children }: DrawerProps) {
  return (
    <aside className="drawer">
      <header className="drawer__header">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actions ? <div className="drawer__actions">{actions}</div> : null}
      </header>
      <div className="drawer__body">{children}</div>
    </aside>
  );
}

