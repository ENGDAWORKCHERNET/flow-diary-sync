import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2 } from 'lucide-react';
import type { ParsedClass } from '@/lib/groqSchedule';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

interface ScheduleImagePreviewModalProps {
  open: boolean;
  classes: ParsedClass[];
  onClose: () => void;
  onUpdate: (index: number, updates: Partial<ParsedClass>) => void;
  onRemove: (index: number) => void;
  onSaveAll: () => void;
}

export default function ScheduleImagePreviewModal({
  open,
  classes,
  onClose,
  onUpdate,
  onRemove,
  onSaveAll,
}: ScheduleImagePreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-5xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Review Schedule</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Check the details and make any corrections before adding these classes.
        </p>
        {classes.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No classes left to review.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Day</TableHead>
                <TableHead>Start time</TableHead>
                <TableHead>End time</TableHead>
                <TableHead>Location</TableHead>
                <TableHead><span className="sr-only">Remove</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.map((classItem, index) => (
                <TableRow key={`${classItem.name}-${index}`}>
                  <TableCell className="min-w-40">
                    <Input
                      aria-label={`Class ${index + 1} name`}
                      value={classItem.name}
                      onChange={event => onUpdate(index, { name: event.target.value })}
                    />
                  </TableCell>
                  <TableCell className="min-w-36">
                    <select
                      aria-label={`Class ${index + 1} day`}
                      className="h-10 w-full rounded-md border border-input bg-background px-2 text-base"
                      value={classItem.day}
                      onChange={event => onUpdate(index, { day: event.target.value as ParsedClass['day'] })}
                    >
                      {DAYS.map(day => <option key={day} value={day}>{day}</option>)}
                    </select>
                  </TableCell>
                  <TableCell className="min-w-28">
                    <Input
                      aria-label={`Class ${index + 1} start time`}
                      type="time"
                      value={classItem.startTime}
                      onChange={event => onUpdate(index, { startTime: event.target.value })}
                    />
                  </TableCell>
                  <TableCell className="min-w-28">
                    <Input
                      aria-label={`Class ${index + 1} end time`}
                      type="time"
                      value={classItem.endTime}
                      onChange={event => onUpdate(index, { endTime: event.target.value })}
                    />
                  </TableCell>
                  <TableCell className="min-w-36">
                    <Input
                      aria-label={`Class ${index + 1} location`}
                      value={classItem.location ?? ''}
                      onChange={event => onUpdate(index, { location: event.target.value || null })}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${classItem.name || `class ${index + 1}`}`}
                      onClick={() => onRemove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={onSaveAll} disabled={classes.length === 0}>
            Save All
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
