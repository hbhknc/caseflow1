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
        message="Add a note to start the matter history."
      />
    );
  }

  return (
    <ol className="notes-list">
      {notes.map((note) => (
        <li key={note.id} className="note-card">
          <div className="note-card__meta">
            <span className="note-card__author">{note.createdBy ?? "Firm staff"}</span>
            <span>{formatDateTime(note.createdAt)}</span>
          </div>
          <p>{note.body}</p>
        </li>
      ))}
    </ol>
  );
}
