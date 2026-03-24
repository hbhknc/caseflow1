import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppChrome } from "@/app/AppChrome";
import { EmptyState } from "@/components/EmptyState";
import { AccountingSidebarNav } from "@/features/accounting/components/AccountingSidebarNav";
import { createProbateAccounting } from "@/services/accountings";

export function AccountingNewPage() {
  const navigate = useNavigate();
  const { setHeaderToolbar, setSidebarContent } = useAppChrome();
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

    void createProbateAccounting()
      .then((accounting) => {
        if (!cancelled) {
          navigate(`/accounting/${accounting.id}`, { replace: true });
        }
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Unable to create accounting.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="page-stack">
      <section className="panel">
        <EmptyState
          title={error ? "Unable to create accounting" : "Creating accounting"}
          message={
            error ??
            "Creating a new blank accounting draft and opening the editor."
          }
        />
      </section>
    </div>
  );
}
