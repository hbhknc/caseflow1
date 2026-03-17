import { useEffect, useState } from "react";
import { SettingsPanel } from "@/features/settings/components/SettingsPanel";
import { getAppStatus } from "@/services/settings";
import type { AppStatus } from "@/types/api";

export function SettingsPage() {
  const [status, setStatus] = useState<AppStatus | null>(null);

  useEffect(() => {
    void getAppStatus().then(setStatus).catch(() => setStatus(null));
  }, []);

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="section-heading">
          <h1>Settings</h1>
          <p>
            Operational scaffolding for environment details, future admin controls, and
            Cloudflare Access integration work.
          </p>
        </div>
      </section>
      <SettingsPanel status={status} />
    </div>
  );
}
