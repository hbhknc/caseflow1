import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAppChrome } from "@/app/AppChrome";
import { EmptyState } from "@/components/EmptyState";
import { AccountingEditor } from "@/features/accounting/components/AccountingEditor";
import { AccountingSidebarNav } from "@/features/accounting/components/AccountingSidebarNav";
import { getProbateAccounting } from "@/services/accountings";
import type { ProbateAccountingDetail } from "@/types/accounting";

export function AccountingEditorPage() {
  const { accountingId } = useParams();
  const { setHeaderToolbar, setSidebarContent } = useAppChrome();
  const [accounting, setAccounting] = useState<ProbateAccountingDetail | null>(null);
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
    if (!accountingId) {
      setAccounting(null);
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
          setError(nextError instanceof Error ? nextError.message : "Unable to load accounting.");
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accountingId]);

  if (isLoading) {
    return (
      <div className="page-stack">
        <section className="panel">
          <EmptyState title="Loading accounting" message="Loading the saved accounting detail." />
        </section>
      </div>
    );
  }

  if (error || !accounting) {
    return (
      <div className="page-stack">
        <section className="panel">
          <EmptyState title="Unable to load accounting" message={error ?? "Accounting not found."} />
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <AccountingEditor accounting={accounting} onSaved={setAccounting} />
    </div>
  );
}
