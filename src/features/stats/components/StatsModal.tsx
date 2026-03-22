import { useEffect, useRef } from "react";
import { Drawer } from "@/components/Drawer";
import type { MatterStats } from "@/types/api";

type StatsModalProps = {
  stats: MatterStats | null;
  error: string | null;
  onClose: () => void;
};

function formatAverage(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

const monthTickFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  timeZone: "UTC"
});

const monthRangeFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  year: "numeric",
  timeZone: "UTC"
});

function formatMonthTick(monthStart: string) {
  return monthTickFormatter.format(new Date(monthStart));
}

function formatMonthRange(monthStart: string) {
  return monthRangeFormatter.format(new Date(monthStart));
}

export function StatsModal({ stats, error, onClose }: StatsModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const openedCasesByMonth = stats?.openedCasesByMonthLast12Months ?? [];
  const maxOpenedCount = openedCasesByMonth.reduce(
    (highest, point) => Math.max(highest, point.openedCount),
    0
  );
  const chartCeiling = Math.max(maxOpenedCount, 1);
  const firstMonth = openedCasesByMonth[0]?.monthStart ?? null;
  const lastMonth = openedCasesByMonth[openedCasesByMonth.length - 1]?.monthStart ?? null;
  const openedCasesLast12Months = openedCasesByMonth.reduce(
    (total, point) => total + point.openedCount,
    0
  );
  const currentMonthStat = openedCasesByMonth.at(-1) ?? null;
  const averageOpenedPerMonth =
    openedCasesByMonth.length === 0 ? 0 : openedCasesLast12Months / openedCasesByMonth.length;
  const busiestMonthStat = openedCasesByMonth.reduce<
    MatterStats["openedCasesByMonthLast12Months"][number] | null
  >((best, point) => {
    if (!best || point.openedCount > best.openedCount) {
      return point;
    }

    return best;
  }, null);
  const archiveRate =
    stats && stats.totalCasesOpened > 0
      ? Math.round((stats.totalCasesArchived / stats.totalCasesOpened) * 100)
      : null;
  const chartRangeLabel =
    firstMonth && lastMonth
      ? `${formatMonthRange(firstMonth)} through ${formatMonthRange(lastMonth)}`
      : "the last 12 months";

  return (
    <div className="drawer-overlay" role="presentation" onClick={onClose}>
      <div
        className="drawer-modal task-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Stats"
        onClick={(event) => event.stopPropagation()}
      >
        <Drawer
          title="Stats"
          subtitle="Annual and monthly matter summary for the current dataset."
          actions={
            <button
              ref={closeButtonRef}
              type="button"
              className="button button--ghost"
              onClick={onClose}
            >
              Close
            </button>
          }
        >
          {error ? <p className="stats-empty">{error}</p> : null}
          {!error && !stats ? <p className="stats-empty">Loading matter statistics.</p> : null}

          {stats ? (
            <div className="stats-panel">
              <section className="stats-section" aria-labelledby="stats-annual-summary">
                <div className="section-heading">
                  <h3 id="stats-annual-summary">Annual Stats</h3>
                  <p>Overall case volume, closure pace, and annual averages.</p>
                </div>

                <div className="stats-kpi-grid stats-kpi-grid--annual">
                  <article className="stats-kpi-card">
                    <span>Total Opened</span>
                    <strong>{stats.totalCasesOpened}</strong>
                  </article>
                  <article className="stats-kpi-card">
                    <span>Total Archived</span>
                    <strong>{stats.totalCasesArchived}</strong>
                  </article>
                  <article className="stats-kpi-card">
                    <span>Opened / Year</span>
                    <strong>{formatAverage(stats.averageCasesOpenedPerYear)}</strong>
                  </article>
                  <article className="stats-kpi-card">
                    <span>Archived / Year</span>
                    <strong>{formatAverage(stats.averageCasesArchivedPerYear)}</strong>
                  </article>
                  <article className="stats-kpi-card">
                    <span>Archive Rate</span>
                    <strong>{archiveRate === null ? "N/A" : `${archiveRate}%`}</strong>
                  </article>
                  <article className="stats-kpi-card">
                    <span>Avg Case Length</span>
                    <strong>
                      {stats.averageCaseLengthDays === null
                        ? "N/A"
                        : `${stats.averageCaseLengthDays}d`}
                    </strong>
                  </article>
                </div>
              </section>

              <section className="stats-section stats-chart-panel" aria-labelledby="stats-opened-by-month">
                <div className="section-heading">
                  <h3 id="stats-opened-by-month">Monthly Stats</h3>
                  <p>Opened matters for {chartRangeLabel}.</p>
                </div>

                <div className="stats-kpi-grid stats-kpi-grid--monthly">
                  <article className="stats-kpi-card">
                    <span>This Month</span>
                    <strong>{currentMonthStat?.openedCount ?? 0}</strong>
                    <small>
                      {currentMonthStat
                        ? formatMonthRange(currentMonthStat.monthStart)
                        : "Current month"}
                    </small>
                  </article>
                  <article className="stats-kpi-card">
                    <span>Last 12 Months</span>
                    <strong>{openedCasesLast12Months}</strong>
                  </article>
                  <article className="stats-kpi-card">
                    <span>Avg / Month</span>
                    <strong>{formatAverage(averageOpenedPerMonth)}</strong>
                  </article>
                  <article className="stats-kpi-card">
                    <span>Busiest Month</span>
                    <strong>{busiestMonthStat?.openedCount ?? 0}</strong>
                    <small>
                      {busiestMonthStat
                        ? formatMonthRange(busiestMonthStat.monthStart)
                        : "No activity recorded"}
                    </small>
                  </article>
                </div>

                <div
                  className="stats-chart"
                  role="img"
                  aria-label={`Bar chart showing cases added by month for ${chartRangeLabel}.`}
                >
                  {openedCasesByMonth.map((point) => {
                    const barHeight =
                      point.openedCount === 0
                        ? 0
                        : Math.max(8, Math.round((point.openedCount / chartCeiling) * 100));
                    const monthLabel = formatMonthTick(point.monthStart);

                    return (
                      <div
                        key={point.monthStart}
                        className="stats-chart__column"
                        title={`${monthLabel}: ${point.openedCount} case${
                          point.openedCount === 1 ? "" : "s"
                        } opened`}
                      >
                        <span className="stats-chart__value">{point.openedCount}</span>
                        <div className="stats-chart__track" aria-hidden="true">
                          <div
                            className="stats-chart__bar"
                            style={{ height: `${barHeight}%` }}
                          />
                        </div>
                        <span className="stats-chart__label">{monthLabel}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          ) : null}
        </Drawer>
      </div>
    </div>
  );
}
