import type { TimeRecord } from "../types/timeRecord";
import { formatDisplay, formatDurationHours } from "../lib/datetime";

interface TimeRecordListProps {
  records: TimeRecord[];
  onEdit: (record: TimeRecord) => void;
  onDelete: (id: string) => void;
}

export function TimeRecordList({ records, onEdit, onDelete }: TimeRecordListProps) {
  if (records.length === 0) {
    return <p className="empty-state">No time records yet.</p>;
  }

  return (
    <table className="time-record-table">
      <thead>
        <tr>
          <th>Start</th>
          <th>End</th>
          <th>Duration</th>
          <th>Category</th>
          <th>Notes</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {records.map((record) => (
          <tr key={record.id}>
            <td>{formatDisplay(record.startTime)}</td>
            <td>{formatDisplay(record.endTime)}</td>
            <td>{formatDurationHours(record.startTime, record.endTime)}</td>
            <td>{record.category}</td>
            <td className="notes-cell">{record.notes}</td>
            <td className="actions-cell">
              <button type="button" onClick={() => onEdit(record)}>
                Edit
              </button>
              <button type="button" onClick={() => onDelete(record.id)}>
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
