import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  SUBJECTS,
  SUBJECT_COLOR,
  DAY_NAMES,
  DAY_SHORT,
  PERIOD_PRESETS,
  type ClassSession,
} from '@/lib/data';
import { useSchedule } from '@/context/ScheduleContext';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

interface ClassFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingSession: ClassSession | null;
}

export default function ClassFormModal({
  open,
  onOpenChange,
  editingSession,
}: ClassFormModalProps) {
  const { addClass, updateClass, deleteClass } = useSchedule();

  const [day, setDay] = useState<number>(1); // Default to Monday
  const [selectedPeriod, setSelectedPeriod] = useState<string>('Period 4');
  const [startTime, setStartTime] = useState<string>('14:00');
  const [endTime, setEndTime] = useState<string>('15:30');
  const [subject, setSubject] = useState<string>(SUBJECTS[0]);
  const [customSubject, setCustomSubject] = useState<string>('');
  const [isCustomSubject, setIsCustomSubject] = useState<boolean>(false);
  const [room, setRoom] = useState<string>('LR 301');
  const [isLab, setIsLab] = useState<boolean>(false);
  const [labGroup, setLabGroup] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Sync form when opening or editingSession changes
  useEffect(() => {
    if (editingSession) {
      setDay(editingSession.day);
      setStartTime(editingSession.startTime);
      setEndTime(editingSession.endTime);
      setRoom(editingSession.room || '');
      setIsLab(Boolean(editingSession.isLab));
      setLabGroup(editingSession.labGroup || '');

      const isPresetSubject = (SUBJECTS as readonly string[]).includes(editingSession.subject);
      if (isPresetSubject) {
        setSubject(editingSession.subject);
        setIsCustomSubject(false);
        setCustomSubject('');
      } else {
        setIsCustomSubject(true);
        setCustomSubject(editingSession.subject);
      }

      // Check if matches preset period
      const matchedPreset = PERIOD_PRESETS.find(
        p => p.startTime === editingSession.startTime && p.endTime === editingSession.endTime
      );
      setSelectedPeriod(matchedPreset ? matchedPreset.name : 'Custom');
    } else {
      // Reset for new class
      setDay(1);
      setSelectedPeriod('Period 4');
      setStartTime('14:00');
      setEndTime('15:30');
      setSubject(SUBJECTS[0]);
      setIsCustomSubject(false);
      setCustomSubject('');
      setRoom('LR 301');
      setIsLab(false);
      setLabGroup('');
      setIsDeleting(false);
    }
  }, [editingSession, open]);

  const handlePeriodChange = (periodName: string) => {
    setSelectedPeriod(periodName);
    const preset = PERIOD_PRESETS.find(p => p.name === periodName);
    if (preset) {
      setStartTime(preset.startTime);
      setEndTime(preset.endTime);
    }
  };

  const handleCustomTimeChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') {
      setStartTime(value);
    } else {
      setEndTime(value);
    }

    // Check if new times match any preset
    const newStart = type === 'start' ? value : startTime;
    const newEnd = type === 'end' ? value : endTime;
    const matched = PERIOD_PRESETS.find(p => p.startTime === newStart && p.endTime === newEnd);
    setSelectedPeriod(matched ? matched.name : 'Custom');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalSubject = (isCustomSubject ? customSubject.trim() : subject) || 'Untitled Class';
    if (!finalSubject) {
      toast.error('Please enter a class subject');
      return;
    }

    if (!startTime || !endTime) {
      toast.error('Please specify start and end times');
      return;
    }

    if (startTime >= endTime) {
      toast.error('End time must be after start time');
      return;
    }

    const colorClass = SUBJECT_COLOR[finalSubject] || 'subject-web';

    const payload: Omit<ClassSession, 'id'> = {
      subject: finalSubject,
      day,
      startTime,
      endTime,
      colorClass,
      room: room.trim() || undefined,
      isLab: isLab || undefined,
      labGroup: isLab && labGroup.trim() ? labGroup.trim() : undefined,
    };

    if (editingSession) {
      const res = updateClass(editingSession.id, payload);
      if (!res.success) {
        toast.error(res.error || 'Failed to update class');
        return;
      }
      toast.success('Class updated successfully');
    } else {
      const res = addClass(payload);
      if (!res.success) {
        toast.error(res.error || 'Failed to add class');
        return;
      }
      toast.success('Class added successfully');
    }

    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!editingSession) return;
    deleteClass(editingSession.id);
    toast.success('Class removed from schedule');
    setIsDeleting(false);
    onOpenChange(false);
  };

  // 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 0=Sun
  const selectableDays = [1, 2, 3, 4, 5, 6, 0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            {editingSession ? 'Edit Class Session' : 'Add New Class'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Day Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Day of Week
            </Label>
            <div className="grid grid-cols-7 gap-1">
              {selectableDays.map(d => {
                const isSelected = day === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDay(d)}
                    className={`py-2 text-xs font-medium rounded-xl text-center transition-all ${
                      isSelected
                        ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                        : 'bg-secondary/60 hover:bg-secondary text-secondary-foreground'
                    }`}
                  >
                    {DAY_SHORT[d]}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Selected: <span className="font-semibold text-foreground">{DAY_NAMES[day]}</span>
            </p>
          </div>

          {/* Period Presets */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Period / Time Slot
            </Label>
            <div className="grid grid-cols-3 gap-1.5">
              {PERIOD_PRESETS.map(p => {
                const isSelected = selectedPeriod === p.name;
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => handlePeriodChange(p.name)}
                    className={`px-2 py-1.5 text-xs rounded-xl font-medium transition-all text-center ${
                      isSelected
                        ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                        : 'bg-secondary/60 hover:bg-secondary text-secondary-foreground'
                    }`}
                  >
                    {p.name}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setSelectedPeriod('Custom')}
                className={`px-2 py-1.5 text-xs rounded-xl font-medium transition-all text-center ${
                  selectedPeriod === 'Custom'
                    ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                    : 'bg-secondary/60 hover:bg-secondary text-secondary-foreground'
                }`}
              >
                Custom
              </button>
            </div>
          </div>

          {/* Time Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Start Time</Label>
              <Input
                type="time"
                value={startTime}
                onChange={e => handleCustomTimeChange('start', e.target.value)}
                className="rounded-xl font-mono text-sm"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">End Time</Label>
              <Input
                type="time"
                value={endTime}
                onChange={e => handleCustomTimeChange('end', e.target.value)}
                className="rounded-xl font-mono text-sm"
                required
              />
            </div>
          </div>

          {/* Subject Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Subject
            </Label>
            {!isCustomSubject ? (
              <div className="space-y-2">
                <select
                  value={subject}
                  onChange={e => {
                    if (e.target.value === '__custom__') {
                      setIsCustomSubject(true);
                    } else {
                      setSubject(e.target.value);
                    }
                  }}
                  className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  {SUBJECTS.map(s => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  <option value="__custom__">+ Enter Custom Subject...</option>
                </select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. SE2205 (Computer Organization & Architecture)"
                    value={customSubject}
                    onChange={e => setCustomSubject(e.target.value)}
                    className="rounded-xl text-sm"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCustomSubject(false);
                      setSubject(SUBJECTS[0]);
                    }}
                    className="rounded-xl text-xs"
                  >
                    Preset
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Room */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Room / Location
            </Label>
            <Input
              placeholder="e.g. LR 301, LR 202, Lab 501"
              value={room}
              onChange={e => setRoom(e.target.value)}
              className="rounded-xl text-sm"
            />
          </div>

          {/* Lab details (optional) */}
          <div className="space-y-2 pt-1 border-t border-border/40">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isLabToggle"
                checked={isLab}
                onChange={e => setIsLab(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary"
              />
              <Label htmlFor="isLabToggle" className="text-xs font-medium cursor-pointer">
                This is a Practical / Lab Session
              </Label>
            </div>
            {isLab && (
              <div className="pl-6 pt-1">
                <Input
                  placeholder="Lab Group (e.g. Grp 1, Grp 2)"
                  value={labGroup}
                  onChange={e => setLabGroup(e.target.value)}
                  className="rounded-xl text-sm"
                />
              </div>
            )}
          </div>

          {/* Form Actions */}
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
            {editingSession && (
              <>
                {!isDeleting ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsDeleting(true)}
                    className="text-destructive hover:bg-destructive/10 rounded-xl flex items-center gap-1.5 text-xs mr-auto"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </Button>
                ) : (
                  <div className="flex items-center gap-1.5 mr-auto">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleDelete}
                      className="rounded-xl text-xs"
                    >
                      Confirm Delete
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsDeleting(false)}
                      className="rounded-xl text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button type="submit" className="rounded-xl text-xs font-semibold">
              {editingSession ? 'Save Changes' : 'Add Class'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
