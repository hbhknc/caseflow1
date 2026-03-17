type SearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

export function SearchField({ value, onChange }: SearchFieldProps) {
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
    </label>
  );
}
