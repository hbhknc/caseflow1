import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { AccountingPrintDocument } from "@/features/accounting/components/AccountingPrintDocument";
import {
  getProbateAccounting,
  getProbateAccountingOfficialFormUrl
} from "@/services/accountings";
import type { ProbateAccountingDetail } from "@/types/accounting";

export function AccountingPrintPage() {
  const { accountingId } = useParams();
  const [accounting, setAccounting] = useState<ProbateAccountingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accountingId) {
      setError("Accounting id is required.");
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    setIsLoading(true);
    setError(null);

    void getProbateAccounting(accountingId)
      .then((loaded) => {
        if (!cancelled) {
          setAccounting(loaded);
          setIsLoading(false);
        }
      })
      .catch((nextError) => {
        if (!cancelled) {
          setAccounting(null);
          setError(nextError instanceof Error ? nextError.message : "Unable to load worksheet.");
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accountingId]);

  return (
    <div className="accounting-print-page">
      <div className="accounting-print-page__actions">
        <Link
          to={accountingId ? `/accounting/${accountingId}` : "/accounting"}
          className="button button--ghost"
        >
          Back to Accounting
        </Link>
        {accountingId ? (
          <a
            href={getProbateAccountingOfficialFormUrl(accountingId)}
            target="_blank"
            rel="noreferrer"
            className="button button--ghost"
          >
            Official AOC-E-506 PDF
          </a>
        ) : null}
        <button type="button" className="button" onClick={() => window.print()}>
          Print
        </button>
      </div>

      {isLoading ? (
        <section className="panel accounting-print-page__panel">
          <EmptyState title="Loading worksheet" message="Loading printable accounting output." />
        </section>
      ) : error || !accounting ? (
        <section className="panel accounting-print-page__panel">
          <EmptyState title="Unable to load worksheet" message={error ?? "Accounting not found."} />
        </section>
      ) : (
        <AccountingPrintDocument accounting={accounting} />
      )}
    </div>
  );
}
