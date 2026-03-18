import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAppChrome } from "@/app/AppChrome";
import { getMatterStats } from "@/services/stats";
import type { MatterStats } from "@/types/api";

function formatAverage(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

export function StatsPage() {
  const { setHeaderToolbar } = useAppChrome();
  const [stats, setStats] = useState<MatterStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHeaderToolbar(
      <Link to="/" className="button button--ghost">
        Back to Board
      </Link>
    );

    return () => setHeaderToolbar(null);
  }, [setHeaderToolbar]);

  useEffect(() => {
    void getMatterStats()
      .then((result) => {
        setStats(result);
        setError(null);
      })
      .catch((caughtError) => {
        setError(caughtError instanceof Error ? caughtError.message : "Unable to load stats.");
      });
  }, []);

  return (
    <div className="page-stack">
      <section className="panel stats-panel">
        <div className="section-heading">
          <h1>Stats</h1>
          <p>Simple matter volume and lifecycle summary for the current dataset.</p>
        </div>

        {error ? <p className="stats-empty">{error}</p> : null}
        {!error && !stats ? <p className="stats-empty">Loading matter statistics.</p> : null}

        {stats ? (
          <dl className="stats-list">
            <div className="stats-row">
              <dt>Total cases opened</dt>
              <dd>{stats.totalCasesOpened}</dd>
            </div>
            <div className="stats-row">
              <dt>Total cases closed / archived</dt>
              <dd>{stats.totalCasesArchived}</dd>
            </div>
            <div className="stats-row">
              <dt>Average cases opened per year</dt>
              <dd>{formatAverage(stats.averageCasesOpenedPerYear)}</dd>
            </div>
            <div className="stats-row">
              <dt>Average cases closed per year</dt>
              <dd>{formatAverage(stats.averageCasesArchivedPerYear)}</dd>
            </div>
            <div className="stats-row">
              <dt>Average case length</dt>
              <dd>
                {stats.averageCaseLengthDays === null
                  ? "N/A"
                  : `${stats.averageCaseLengthDays} days`}
              </dd>
            </div>
          </dl>
        ) : null}
      </section>
    </div>
  );
}
