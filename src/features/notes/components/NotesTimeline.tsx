import { EmptyState } from "@/components/EmptyState";
import { formatDateTime } from "@/lib/dates";
import type { MatterNote } from "@/types/matter";

type NotesTimelineProps = {
  notes: MatterNote[];
};

export function NotesTimeline({ notes }: NotesTimelineProps) {
  if (notes.length === 0) {
    return (
      <EmptyState
        title="No activity yet"
        message="Add the first note to begin the matter activity log."
      />
    );
  }

  return (
    <ol className="notes-list">
      {notes.map((note) => (
        <li key={note.id} className="note-card">
          <div className="note-card__meta">
            <strong>{note.createdBy ?? "Firm staff"}</strong>
            <span>{formatDateTime(note.createdAt)}</span>
          </div>
          <p>{note.body}</p>
        </li>
      ))}
    </ol>
  );
}

