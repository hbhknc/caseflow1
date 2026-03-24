import {
  PROBATE_ACCOUNTING_ASSET_TYPE_LABELS,
  PROBATE_ACCOUNTING_ENTRY_TYPE_LABELS,
  PROBATE_ACCOUNTING_STATUS_LABELS,
  PROBATE_ACCOUNTING_TYPE_LABELS,
  formatCurrencyFromCents
} from "@/lib/accounting";
import { formatDateOnly, formatDateTime } from "@/lib/dates";
import type {
  ProbateAccountingDetail,
  ProbateAccountingEntryType
} from "@/types/accounting";

type AccountingPrintDocumentProps = {
  accounting: ProbateAccountingDetail;
};

function renderEntryRows(
  accounting: ProbateAccountingDetail,
  entryType: ProbateAccountingEntryType
) {
  const rows = accounting.entries.filter((entry) => entry.entryType === entryType);

  if (rows.length === 0) {
    return (
      <tr>
        <td colSpan={5} className="accounting-print__empty-row">
          No {PROBATE_ACCOUNTING_ENTRY_TYPE_LABELS[entryType].toLowerCase()} rows added.
        </td>
      </tr>
    );
  }

  return rows.map((entry) => (
    <tr key={entry.id}>
      <td>{formatDateOnly(entry.entryDate)}</td>
      <td>{entry.partyName || "Not provided"}</td>
      <td>{entry.description || "Not provided"}</td>
      <td>{entry.proofReference || "Not provided"}</td>
      <td>{formatCurrencyFromCents(entry.amountCents)}</td>
    </tr>
  ));
}

export function AccountingPrintDocument({ accounting }: AccountingPrintDocumentProps) {
  const { totals, readinessIssues } = accounting.computed;

  return (
    <article className="accounting-print">
      <header className="accounting-print__header">
        <div>
          <p className="accounting-print__eyebrow">North Carolina Probate Accounting Worksheet</p>
          <h1>{PROBATE_ACCOUNTING_TYPE_LABELS[accounting.accountType]}</h1>
          <p className="accounting-print__subtitle">
            App-native AOC-E-506 review worksheet generated from the ledger.
          </p>
        </div>
        <div className="accounting-print__status-block">
          <span className={`accounting-status accounting-status--${accounting.status}`}>
            {PROBATE_ACCOUNTING_STATUS_LABELS[accounting.status]}
          </span>
          <small>Updated {formatDateTime(accounting.updatedAt)}</small>
        </div>
      </header>

      {readinessIssues.length ? (
        <section className="accounting-print__issues">
          <strong>Review issues still open</strong>
          <ul>
            {readinessIssues.map((issue, index) => (
              <li key={`${issue.code}-${index}`}>{issue.message}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="accounting-print__meta-grid">
        <div>
          <span>County</span>
          <strong>{accounting.county || "Not provided"}</strong>
        </div>
        <div>
          <span>File Number</span>
          <strong>{accounting.fileNumber || "Not provided"}</strong>
        </div>
        <div>
          <span>Decedent</span>
          <strong>{accounting.decedentName || "Not provided"}</strong>
        </div>
        <div>
          <span>Fiduciary</span>
          <strong>{accounting.fiduciaryName || "Not provided"}</strong>
        </div>
        <div>
          <span>Date Of Death</span>
          <strong>{formatDateOnly(accounting.dateOfDeath)}</strong>
        </div>
        <div>
          <span>Accounting Period</span>
          <strong>
            {formatDateOnly(accounting.periodStart)} to {formatDateOnly(accounting.periodEnd)}
          </strong>
        </div>
      </section>

      <section className="accounting-print__section">
        <div className="section-heading">
          <h2>Part I. Summary</h2>
          <p>Matches the AOC-E-506 order and line progression.</p>
        </div>
        <table className="accounting-print__table">
          <thead>
            <tr>
              <th>Line</th>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>Subtotal of personal property on inventory or prior account</td>
              <td>{formatCurrencyFromCents(totals.openingSubtotalCents)}</td>
            </tr>
            <tr>
              <td>2</td>
              <td>
                Loss from sale of personal property
                {accounting.lossExplanation ? `: ${accounting.lossExplanation}` : ""}
              </td>
              <td>{formatCurrencyFromCents(totals.lossFromSaleCents)}</td>
            </tr>
            <tr>
              <td>3</td>
              <td>Subtotal after loss adjustment</td>
              <td>{formatCurrencyFromCents(totals.line3SubtotalCents)}</td>
            </tr>
            <tr>
              <td>4</td>
              <td>Total receipts</td>
              <td>{formatCurrencyFromCents(totals.receiptsTotalCents)}</td>
            </tr>
            <tr>
              <td>5</td>
              <td>Total assets subject to accounting</td>
              <td>{formatCurrencyFromCents(totals.line5SubtotalCents)}</td>
            </tr>
            <tr>
              <td>6</td>
              <td>Total disbursements and credits</td>
              <td>{formatCurrencyFromCents(totals.disbursementsTotalCents)}</td>
            </tr>
            <tr>
              <td>7</td>
              <td>Balance after disbursements</td>
              <td>{formatCurrencyFromCents(totals.line7SubtotalCents)}</td>
            </tr>
            <tr>
              <td>8</td>
              <td>Total distributions</td>
              <td>{formatCurrencyFromCents(totals.distributionsTotalCents)}</td>
            </tr>
            <tr className="accounting-print__total-row">
              <td>9</td>
              <td>Balance at end of period</td>
              <td>{formatCurrencyFromCents(totals.line9BalanceCents)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {accounting.accountType === "annual" ? (
        <section className="accounting-print__section">
          <div className="section-heading">
            <h2>Part II. Balance Held Or Invested</h2>
            <p>Do not include account numbers in this worksheet.</p>
          </div>
          <table className="accounting-print__table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Description</th>
                <th>Proof Reference</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {accounting.assets.length ? (
                accounting.assets.map((asset) => (
                  <tr key={asset.id}>
                    <td>{PROBATE_ACCOUNTING_ASSET_TYPE_LABELS[asset.assetType]}</td>
                    <td>{asset.description || "Not provided"}</td>
                    <td>{asset.proofReference || "Not provided"}</td>
                    <td>{formatCurrencyFromCents(asset.amountCents)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="accounting-print__empty-row">
                    No Part II balance-held rows added.
                  </td>
                </tr>
              )}
              <tr className="accounting-print__total-row">
                <td colSpan={3}>Part II Total</td>
                <td>{formatCurrencyFromCents(totals.partIiTotalCents)}</td>
              </tr>
            </tbody>
          </table>
        </section>
      ) : null}

      <section className="accounting-print__section">
        <div className="section-heading">
          <h2>Part III. Receipts</h2>
          <p>Continuation-style ledger detail generated directly from receipt rows.</p>
        </div>
        <table className="accounting-print__table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Received From</th>
              <th>Description</th>
              <th>Proof Reference</th>
              <th>Amount Or Value</th>
            </tr>
          </thead>
          <tbody>{renderEntryRows(accounting, "receipt")}</tbody>
        </table>
      </section>

      <section className="accounting-print__section">
        <div className="section-heading">
          <h2>Part IV. Disbursements And Credits</h2>
          <p>Continuation-style ledger detail generated directly from disbursement rows.</p>
        </div>
        <table className="accounting-print__table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Paid To</th>
              <th>Description</th>
              <th>Proof Reference</th>
              <th>Amount Or Value</th>
            </tr>
          </thead>
          <tbody>{renderEntryRows(accounting, "disbursement")}</tbody>
        </table>
      </section>

      <section className="accounting-print__section">
        <div className="section-heading">
          <h2>Part V. Distributions</h2>
          <p>Continuation-style ledger detail generated directly from distribution rows.</p>
        </div>
        <table className="accounting-print__table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Distributed To</th>
              <th>Description</th>
              <th>Proof Reference</th>
              <th>Amount Or Value</th>
            </tr>
          </thead>
          <tbody>{renderEntryRows(accounting, "distribution")}</tbody>
        </table>
      </section>

      <footer className="accounting-print__footer">
        <p>
          Clerk-only audit, order, and signature fields remain intentionally blank in this
          worksheet output.
        </p>
      </footer>
    </article>
  );
}
