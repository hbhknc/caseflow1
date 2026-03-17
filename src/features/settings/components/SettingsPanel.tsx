import { StatusPill } from "@/components/StatusPill";
import type { AppStatus } from "@/types/api";

type SettingsPanelProps = {
  status: AppStatus | null;
};

export function SettingsPanel({ status }: SettingsPanelProps) {
  return (
    <section className="settings-panel">
      <div className="section-heading">
        <h2>Environment</h2>
        <p>Starter operational notes for the internal deployment footprint.</p>
      </div>

      <div className="info-grid">
        <div>
          <span>Application</span>
          <strong>{status?.appName ?? "CaseFlow"}</strong>
        </div>
        <div>
          <span>API mode</span>
          <strong>{status?.runtime ?? "Demo fallback"}</strong>
        </div>
        <div>
          <span>Authentication</span>
          <strong>Planned for Cloudflare Access + Microsoft Entra</strong>
        </div>
        <div>
          <span>Primary data store</span>
          <strong>D1</strong>
        </div>
      </div>

      <div className="callout">
        <StatusPill tone="success">Starter repository ready for private firm use</StatusPill>
        <p>
          This page is intentionally light for v1. It gives the next developer a safe place
          to add app settings, Access claims mapping, or administrative controls later.
        </p>
      </div>
    </section>
  );
}
