type AccessRequiredScreenProps = {
  error: string | null;
  isLoading: boolean;
  onRetry: () => void;
};

export function AccessRequiredScreen({
  error,
  isLoading,
  onRetry
}: AccessRequiredScreenProps) {
  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-card__brand">
          <h1>
            <span>Case</span>
            <span className="app-header__flow">Flow</span>
            <span className="app-header__version">v1.0</span>
          </h1>
          <p>
            CaseFlow requires a validated Cloudflare Access identity before the app can
            load.
          </p>
        </div>

        <div className="stack">
          <p>{error ?? "Authentication is required."}</p>
          <button type="button" className="button" onClick={onRetry} disabled={isLoading}>
            {isLoading ? "Checking access..." : "Retry"}
          </button>
        </div>
      </div>
    </div>
  );
}
