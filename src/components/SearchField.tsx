type SearchFieldResult = {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  tone?: "archived";
  onSelect: () => void;
};

type SearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  results: SearchFieldResult[];
};

export function SearchField({ value, onChange, results }: SearchFieldProps) {
  const isOpen = value.trim().length > 0;

  return (
    <label className="search-field">
      <span className="sr-only">Search matters</span>
      <span className="search-field__icon" aria-hidden="true">
        <svg viewBox="0 0 20 20" fill="none">
          <path
            d="M8.75 14.5a5.75 5.75 0 1 0 0-11.5 5.75 5.75 0 0 0 0 11.5Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="m13 13.25 4 4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <input
        type="search"
        placeholder="Decedent, client, or file number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {isOpen ? (
        <div className="search-dropdown" role="listbox" aria-label="Matching matters">
          {results.length > 0 ? (
            <ul className="search-results">
              {results.map((result) => (
                <li key={result.id}>
                  <button
                    type="button"
                    className={
                      result.tone === "archived"
                        ? "search-result search-result--archived"
                        : "search-result"
                    }
                    onClick={result.onSelect}
                  >
                    <span className="search-result__body">
                      <strong>{result.title}</strong>
                      <span>{result.subtitle}</span>
                    </span>
                    <span className="search-result__meta">{result.meta}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="search-empty">No matching matters.</div>
          )}
        </div>
      ) : null}
    </label>
  );
}
