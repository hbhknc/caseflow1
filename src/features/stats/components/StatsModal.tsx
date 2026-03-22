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
          subtitle="Simple matter volume and lifecycle summary for the current dataset."
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
              <section className="stats-chart-panel" aria-labelledby="stats-opened-by-month">
                <div className="section-heading">
                  <h3 id="stats-opened-by-month">Cases Added by Month</h3>
                  <p>Opened matters for {chartRangeLabel}.</p>
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
            </div>
          ) : null}
        </Drawer>
      </div>
    </div>
  );
}
