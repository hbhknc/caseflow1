import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAppChrome } from "@/app/AppChrome";
import { EmptyState } from "@/components/EmptyState";
import { AccountingSidebarNav } from "@/features/accounting/components/AccountingSidebarNav";
import {
  PROBATE_ACCOUNTING_STATUS_LABELS,
  PROBATE_ACCOUNTING_TYPE_LABELS,
  formatCurrencyFromCents
} from "@/lib/accounting";
import { formatDateOnly, formatDateTime } from "@/lib/dates";
import {
  listProbateAccountings,
  type ProbateAccountingListFilters
} from "@/services/accountings";
import type {
  ProbateAccountingStatus,
  ProbateAccountingSummary,
  ProbateAccountingType
} from "@/types/accounting";

export function AccountingHubPage() {
  const { setHeaderToolbar, setSidebarContent } = useAppChrome();
  const [filters, setFilters] = useState<Required<ProbateAccountingListFilters>>({
    search: "",
    status: "all",
    accountType: "all"
  });
  const [accountings, setAccountings] = useState<ProbateAccountingSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHeaderToolbar(null);
    setSidebarContent(<AccountingSidebarNav current="accounting" />);

    return () => {
      setHeaderToolbar(null);
      setSidebarContent(null);
    };
  }, [setHeaderToolbar, setSidebarContent]);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    setError(null);

    void listProbateAccountings(filters)
      .then((items) => {
        if (!cancelled) {
          setAccountings(items);
          setIsLoading(false);
        }
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load accountings.");
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [filters]);

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="section-heading section-heading--split">
          <div>
            <h1>Accounting</h1>
            <p>
              Create separate ledger-based probate accountings without changing board workflow
              state, then generate a review-ready worksheet output.
            </p>
          </div>
          <Link to="/accounting/new" className="button">
            New Accounting
          </Link>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <h2>Filters</h2>
          <p>Search by estate, file number, county, or fiduciary.</p>
        </div>
        <div className="accounting-filters">
          <label className="field accounting-filters__search">
            <span>Search</span>
            <input
              value={filters.search}
              onChange={(event) =>
                setFilters((current) => ({ ...current, search: event.target.value }))
              }
              placeholder="Lucille Carver, PR-2026-0021, Wake..."
            />
          </label>
          <label className="field">
            <span>Status</span>
            <select
              value={filters.status}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  status: event.target.value as ProbateAccountingStatus | "all"
                }))
              }
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="review_ready">Review Ready</option>
            </select>
          </label>
          <label className="field">
            <span>Type</span>
            <select
              value={filters.accountType}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  accountType: event.target.value as ProbateAccountingType | "all"
                }))
              }
            >
              <option value="all">All types</option>
              <option value="annual">Annual</option>
              <option value="final">Final</option>
            </select>
          </label>
        </div>
      </section>

      {isLoading ? (
        <section className="panel">
          <EmptyState title="Loading accountings" message="Loading saved probate accountings." />
        </section>
      ) : error ? (
        <section className="panel">
          <EmptyState title="Unable to load accountings" message={error} />
        </section>
      ) : accountings.length === 0 ? (
        <section className="panel">
          <EmptyState
            title="No accountings yet"
            message="Create the first ledger-based accounting to start preparing AOC-E-506 review worksheets."
          />
        </section>
      ) : (
        <section className="accounting-card-grid">
          {accountings.map((accounting) => (
            <Link
              key={accounting.id}
              to={`/accounting/${accounting.id}`}
              className="panel accounting-card"
            >
              <div className="accounting-card__header">
                <div>
                  <p className="accounting-card__eyebrow">
                    {PROBATE_ACCOUNTING_TYPE_LABELS[accounting.accountType]}
                  </p>
                  <h2>{accounting.decedentName || "Untitled accounting"}</h2>
                </div>
                <span className={`accounting-status accounting-status--${accounting.status}`}>
                  {PROBATE_ACCOUNTING_STATUS_LABELS[accounting.status]}
                </span>
              </div>
              <div className="accounting-card__meta">
                <span>{accounting.fileNumber || "No file number"}</span>
                <span>{accounting.county || "No county"}</span>
                <span>{accounting.fiduciaryName || "No fiduciary"}</span>
              </div>
              <div className="accounting-card__details">
                <div>
                  <span>Period</span>
                  <strong>
                    {formatDateOnly(accounting.periodStart)} to {formatDateOnly(accounting.periodEnd)}
                  </strong>
                </div>
                <div>
                  <span>Line 9 Balance</span>
                  <strong>{formatCurrencyFromCents(accounting.line9BalanceCents)}</strong>
                </div>
                <div>
                  <span>Linked Matter</span>
                  <strong>{accounting.linkedMatterLabel || "Standalone"}</strong>
                </div>
                <div>
                  <span>Updated</span>
                  <strong>{formatDateTime(accounting.updatedAt)}</strong>
                </div>
              </div>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
