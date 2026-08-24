import { MoreHorizontal } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import type { TimeRecord } from '@/types/timeRecord';
import { formatDisplay, formatDurationHours } from '@/lib/datetime';
import { categoryChipClass } from '@/lib/categoryColor';
import { cn } from '@/lib/utils';

interface RecordsTableProps {
  records: TimeRecord[];
  onEdit: (record: TimeRecord) => void;
  onDelete: (record: TimeRecord) => void;
}

export function RecordsTable({ records, onEdit, onDelete }: RecordsTableProps) {
  if (records.length === 0) {
    return (
      <div className="rounded-lg border border-border py-16 text-center text-sm text-muted-foreground">
        No time records yet. Add your first one with "New record".
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface">
      <Table className="text-[15px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Start</TableHead>
            <TableHead>End</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead className="w-9" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => (
            <TableRow key={record.id}>
              <TableCell className="tabular-nums text-muted-foreground">
                {formatDisplay(record.startTime)}
              </TableCell>
              <TableCell className="tabular-nums text-muted-foreground">
                {record.endTime ? (
                  formatDisplay(record.endTime)
                ) : (
                  <span className="text-primary">In progress</span>
                )}
              </TableCell>
              <TableCell className="tabular-nums text-muted-foreground">
                {formatDurationHours(record.startTime, record.endTime)}
              </TableCell>
              <TableCell>
                <span
                  className={cn('chip', categoryChipClass(record.category))}
                >
                  {record.category}
                </span>
              </TableCell>
              <TableCell className="max-w-60 truncate text-muted-foreground">
                {record.notes ?? '—'}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground"
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(record)}>
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => onDelete(record)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
