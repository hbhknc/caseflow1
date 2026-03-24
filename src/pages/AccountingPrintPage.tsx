import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/app/AuthContext";
import { EmptyState } from "@/components/EmptyState";
import { AccessRequiredScreen } from "@/features/auth/components/AccessRequiredScreen";
import { formatCurrency } from "@/features/accounting/lib/accountingUi";
import { getAccountingEntryTypeLabel, getHeldAssetTypeLabel } from "@/lib/accountingRules";
import { formatDateOnly, formatDateTime } from "@/lib/dates";
import { getAccountingPeriod } from "@/services/accounting";
import type {
  AccountingPeriodDetail,
  AccountingWorksheetEntryPage
} from "@/types/accounting";

function renderEntryPages(pages: AccountingWorksheetEntryPage[]) {
  if (pages.length === 0) {
    return <p className="accounting-print__empty">No entries in this section.</p>;
  }

  return pages.map((page) => (
    <section key={`${page.entryType}-${page.pageNumber}`} className="accounting-print__subsection">
      <div className="section-heading section-heading--split">
        <div>
          <h3>{page.sectionTitle}</h3>
          <p>
            {page.pageNumber === 1
              ? "Primary worksheet page"
              : `Continuation page ${page.pageNumber}`}
          </p>
        </div>
        <strong className="accounting-print__page-total">
          Page total {formatCurrency(page.pageTotal)}
        </strong>
      </div>

      <table className="accounting-print-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Party</th>
            <th>Description</th>
            <th>Category</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {page.lines.map((line) => (
            <tr key={line.id}>
              <td>{formatDateOnly(line.entryDate)}</td>
              <td>{line.partyName ?? "Not set"}</td>
              <td>{line.description ?? "Not set"}</td>
              <td>{line.category ?? "Not set"}</td>
              <td>{formatCurrency(line.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  ));
}

export function AccountingPrintPage() {
  const auth = useAuth();
  const { periodId } = useParams();
  const [detail, setDetail] = useState<AccountingPeriodDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.isAuthenticated || !periodId) {
      setDetail(null);
      setIsLoading(false);
      return;
    }

    const resolvedPeriodId = periodId;
    let isCancelled = false;

    async function loadAccountingPeriod() {
      try {
        setIsLoading(true);
        const response = await getAccountingPeriod(resolvedPeriodId);

        if (isCancelled) {
          return;
        }

        setDetail(response);
        setError(null);
      } catch (caughtError) {
        if (isCancelled) {
          return;
        }

        setDetail(null);
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load the accounting worksheet."
        );
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadAccountingPeriod();

    return () => {
      isCancelled = true;
    };
  }, [auth.isAuthenticated, periodId]);

  useEffect(() => {
    if (!detail) {
      return;
    }

    const previousTitle = document.title;
    document.title = `${detail.worksheet.fileNumber ?? detail.worksheet.matterName ?? "Accounting"} worksheet`;

    return () => {
      document.title = previousTitle;
    };
  }, [detail]);

  if (auth.isLoading) {
    return <div className="login-shell login-shell--loading">Loading access identity...</div>;
  }

  if (!auth.isAuthenticated) {
    return (
      <AccessRequiredScreen
        error={auth.error}
        isLoading={auth.isLoading}
        onRetry={() => void auth.refresh()}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="accounting-print-page">
        <div className="accounting-print-shell">
          <EmptyState title="Loading worksheet" message="Preparing the accounting worksheet." />
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="accounting-print-page">
        <div className="accounting-print-shell">
          <EmptyState
            title="Unable to load worksheet"
            message={error ?? "The accounting period could not be loaded."}
          />
        </div>
      </div>
    );
  }

  const worksheet = detail.worksheet;
  const heldAssetGroups = worksheet.heldAssetGroups.filter((group) => group.items.length > 0);

  return (
    <div className="accounting-print-page">
      <header className="accounting-print-toolbar accounting-print-screen-only">
        <div className="button-row">
          <Link to="/" className="button button--ghost button--small">
            Back to board
          </Link>
        </div>
        <div className="button-row">
          <button
            type="button"
            className="button button--secondary button--small"
            onClick={() => window.print()}
          >
            Print
          </button>
        </div>
      </header>

      <main className="accounting-print-shell">
        <section className="accounting-print-sheet">
          <header className="accounting-print-header">
            <div className="accounting-print-header__title">
              <span>{worksheet.formNumber}</span>
              <h1>North Carolina Estate Accounting Worksheet</h1>
              <p>{worksheet.formVersionLabel}</p>
            </div>
            <div className="accounting-print-header__meta">
              <div>
                <span>Account type</span>
                <strong>{worksheet.accountType === "annual" ? "Annual account" : "Final account"}</strong>
              </div>
              <div>
                <span>Generated</span>
                <strong>{formatDateTime(detail.period.updatedAt)}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{detail.period.isLocked ? "Finalized" : "Draft"}</strong>
              </div>
            </div>
          </header>

          <section className="accounting-print-section">
            <div className="accounting-print-grid">
              <div>
                <span>Matter</span>
                <strong>{worksheet.matterName ?? "Not set"}</strong>
              </div>
              <div>
                <span>File number</span>
                <strong>{worksheet.fileNumber ?? "Not set"}</strong>
              </div>
              <div>
                <span>County</span>
                <strong>{worksheet.county ?? "Not set"}</strong>
              </div>
              <div>
                <span>Date of death</span>
                <strong>{formatDateOnly(worksheet.dateOfDeath)}</strong>
              </div>
              <div>
                <span>Accounting period</span>
                <strong>
                  {formatDateOnly(worksheet.accountingPeriodStart)} -{" "}
                  {formatDateOnly(worksheet.accountingPeriodEnd)}
                </strong>
              </div>
              <div>
                <span>Estate type</span>
                <strong>{worksheet.estateType ?? "Not set"}</strong>
              </div>
            </div>
          </section>

          {worksheet.formVersionWarning ? (
            <section className="accounting-print-section accounting-print-section--warning">
              <strong>Form version warning</strong>
              <p>{worksheet.formVersionWarning}</p>
            </section>
          ) : null}

          <section className="accounting-print-section">
            <div className="section-heading">
              <h2>Summary math</h2>
              <p>Internal review totals aligned to the AOC-E-506 accounting structure.</p>
            </div>
            <div className="accounting-print-summary">
              <div>
                <span>Beginning balance</span>
                <strong>{formatCurrency(worksheet.summary.beginningBalance)}</strong>
              </div>
              <div>
                <span>Loss from sale</span>
                <strong>{formatCurrency(worksheet.summary.lossFromSaleAmount)}</strong>
              </div>
              <div>
                <span>Subtotal after loss</span>
                <strong>{formatCurrency(worksheet.summary.subtotalAfterLoss)}</strong>
              </div>
              <div>
                <span>Total receipts</span>
                <strong>{formatCurrency(worksheet.summary.totalReceipts)}</strong>
              </div>
              <div>
                <span>Total assets</span>
                <strong>{formatCurrency(worksheet.summary.totalAssets)}</strong>
              </div>
              <div>
                <span>Total disbursements</span>
                <strong>{formatCurrency(worksheet.summary.totalDisbursements)}</strong>
              </div>
              <div>
                <span>Subtotal before distributions</span>
                <strong>{formatCurrency(worksheet.summary.subtotalBeforeDistributions)}</strong>
              </div>
              <div>
                <span>Total distributions</span>
                <strong>{formatCurrency(worksheet.summary.totalDistributions)}</strong>
              </div>
              <div>
                <span>Ending balance</span>
                <strong>{formatCurrency(worksheet.summary.endingBalance)}</strong>
              </div>
              <div>
                <span>Total held assets</span>
                <strong>{formatCurrency(worksheet.summary.totalHeldAssets)}</strong>
              </div>
              <div>
                <span>Reconciliation delta</span>
                <strong>{formatCurrency(worksheet.summary.reconciliationDelta)}</strong>
              </div>
              <div>
                <span>Reconciled</span>
                <strong>{worksheet.summary.isReconciled ? "Yes" : "No"}</strong>
              </div>
            </div>
          </section>

          <section className="accounting-print-section">
            {renderEntryPages(worksheet.receiptsPages)}
          </section>

          <section className="accounting-print-section">
            {renderEntryPages(worksheet.disbursementsPages)}
          </section>

          <section className="accounting-print-section">
            {renderEntryPages(worksheet.distributionsPages)}
          </section>

          <section className="accounting-print-section">
            <div className="section-heading">
              <h2>Held assets</h2>
              <p>Assets remaining on hand at the close of the accounting period.</p>
            </div>

            {heldAssetGroups.length === 0 ? (
              <p className="accounting-print__empty">No held assets recorded.</p>
            ) : (
              heldAssetGroups.map((group) => (
                <section key={group.assetType} className="accounting-print__subsection">
                  <div className="section-heading section-heading--split">
                    <div>
                      <h3>{getHeldAssetTypeLabel(group.assetType)}</h3>
                      <p>{group.items.length} item(s)</p>
                    </div>
                    <strong className="accounting-print__page-total">
                      Total {formatCurrency(group.totalValue)}
                    </strong>
                  </div>

                  <table className="accounting-print-table">
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>Value</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((item) => (
                        <tr key={item.id}>
                          <td>{item.institutionOrDescription ?? "Not set"}</td>
                          <td>{formatCurrency(item.value)}</td>
                          <td>{item.notes ?? "Not set"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              ))
            )}
          </section>

          <section className="accounting-print-section">
            <div className="section-heading">
              <h2>Review issues</h2>
              <p>Carry these forward into attorney review before filing or finalizing.</p>
            </div>
            {detail.validationIssues.length === 0 ? (
              <p className="accounting-print__empty">No review issues were detected.</p>
            ) : (
              <ul className="accounting-print-issues">
                {detail.validationIssues.map((issue) => (
                  <li key={issue.id}>
                    <strong>{issue.severity === "critical" ? "Critical" : "Warning"}:</strong>{" "}
                    {issue.message}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <footer className="accounting-print-footer">
            <p>
              Worksheet prepared in CaseFlow for review against{" "}
              {getAccountingEntryTypeLabel("receipt").toLowerCase()},
              disbursements, distributions, and balances held or invested.
            </p>
          </footer>
        </section>
      </main>
    </div>
  );
}
