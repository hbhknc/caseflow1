import { useEffect, useMemo, useRef, useState } from "react";
import type { BoardSortDirection, BoardSortField } from "@/types/matter";

type BoardSortMenuProps = {
  field: BoardSortField;
  direction: BoardSortDirection;
  onChange: (field: BoardSortField, direction: BoardSortDirection) => void;
};

const SORT_FIELD_OPTIONS: Array<{ value: BoardSortField; label: string }> = [
  { value: "manual", label: "Manual order" },
  { value: "name", label: "Name" },
  { value: "days_in_stage", label: "Days in stage" },
  { value: "inactive_days", label: "Inactive days" },
  { value: "interactions", label: "Interactions" }
];

const SORT_DIRECTION_OPTIONS: Array<{ value: BoardSortDirection; label: string }> = [
  { value: "asc", label: "Ascending" },
  { value: "desc", label: "Descending" }
];

function getSortLabel(field: BoardSortField) {
  return SORT_FIELD_OPTIONS.find((option) => option.value === field)?.label ?? "Sort";
}

export function BoardSortMenu({
  field,
  direction,
  onChange
}: BoardSortMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeLabel = useMemo(() => getSortLabel(field), [field]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  return (
    <div className="board-sort" ref={containerRef}>
      <button
        type="button"
        className="button button--secondary button--small board-sort__trigger"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="button__icon" aria-hidden="true">
          <svg viewBox="0 0 18 18" fill="none">
            <path
              d="M4.5 5.25h9M6 8.75h6M7.5 12.25h3"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span>{field === "manual" ? "Sort" : activeLabel}</span>
      </button>

      {isOpen ? (
        <div className="board-sort__menu" role="dialog" aria-label="Sort board">
          <div className="board-sort__menu-header">
            <strong>Sort board</strong>
            {field !== "manual" ? (
              <button
                type="button"
                className="button button--ghost button--small"
                onClick={() => onChange("manual", "asc")}
              >
                Reset
              </button>
            ) : null}
          </div>
          <div className="board-sort__menu-grid">
            <label className="field">
              <span>Sort by</span>
              <select
                value={field}
                onChange={(event) =>
                  onChange(event.target.value as BoardSortField, direction)
                }
              >
                {SORT_FIELD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Direction</span>
              <select
                value={direction}
                disabled={field === "manual"}
                onChange={(event) =>
                  onChange(field, event.target.value as BoardSortDirection)
                }
              >
                {SORT_DIRECTION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      ) : null}
    </div>
  );
}
