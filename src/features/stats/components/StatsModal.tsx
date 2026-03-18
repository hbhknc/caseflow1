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
        </Drawer>
      </div>
    </div>
  );
}
