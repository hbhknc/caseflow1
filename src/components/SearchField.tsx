type SearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

export function SearchField({ value, onChange }: SearchFieldProps) {
  return (
    <label className="search-field">
      <span className="search-field__label">Search matters</span>
      <input
        type="search"
        placeholder="Decedent, client, or file number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

