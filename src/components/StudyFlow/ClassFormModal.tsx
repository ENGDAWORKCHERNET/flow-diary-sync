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
  getSubjectColor,
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
  const { addClass, updateClass, deleteClass, schedule } = useSchedule();

  const [day, setDay] = useState<number>(1); // Default to Monday
  const [selectedPeriod, setSelectedPeriod] = useState<string>('Period 1');
  const [startTime, setStartTime] = useState<string>('08:00');
  const [endTime, setEndTime] = useState<string>('09:30');
  const [subject, setSubject] = useState<string>('');
  const [room, setRoom] = useState<string>('');
  const [isLab, setIsLab] = useState<boolean>(false);
  const [labGroup, setLabGroup] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [showSubjectDropdown, setShowSubjectDropdown] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  // Available subject suggestions: subjects in schedule first, then default subjects
  const scheduleSubjects = Array.from(
    new Set(
      schedule
        .map(s => s.subject?.trim())
        .filter((s): s is string => Boolean(s && s.length > 0))
    )
  );

  const allKnownSubjects = Array.from(
    new Set([
      ...scheduleSubjects,
      ...SUBJECTS,
    ])
  );

  const query = subject.trim().toLowerCase();

  const filteredSuggestions = allKnownSubjects
    .filter(s => {
      if (!query) return true;
      return s.toLowerCase().includes(query);
    })
    .sort((a, b) => {
      if (!query) {
        // Prioritize existing schedule classes over default subjects
        const aInSchedule = scheduleSubjects.includes(a);
        const bInSchedule = scheduleSubjects.includes(b);
        if (aInSchedule && !bInSchedule) return -1;
        if (!aInSchedule && bInSchedule) return 1;
        return 0;
      }

      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();

      // Words in subject
      const aWords = aLower.split(/[\s\-&/:]+/).filter(Boolean);
      const bWords = bLower.split(/[\s\-&/:]+/).filter(Boolean);

      const aWordStarts = aWords.some(w => w.startsWith(query));
      const bWordStarts = bWords.some(w => w.startsWith(query));

      // Classes already in user's schedule take highest priority
      const aInSchedule = scheduleSubjects.includes(a);
      const bInSchedule = scheduleSubjects.includes(b);
      if (aInSchedule && !bInSchedule && (aWordStarts || aLower.includes(query))) return -1;
      if (!aInSchedule && bInSchedule && (bWordStarts || bLower.includes(query))) return 1;

      // 1. Any word starts with query (e.g. "Data" in "SE2231 - Data Structures" or "Computer" in "SE2205 - Computer Org")
      if (aWordStarts && !bWordStarts) return -1;
      if (!aWordStarts && bWordStarts) return 1;

      // 2. Starts with query
      const aStarts = aLower.startsWith(query);
      const bStarts = bLower.startsWith(query);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      return a.localeCompare(b);
    });

  // Sync form when opening or editingSession changes
  useEffect(() => {
    if (editingSession) {
      setDay(editingSession.day);
      setStartTime(editingSession.startTime);
      setEndTime(editingSession.endTime);
      setSubject(editingSession.subject || '');
      setRoom(editingSession.room || '');
      setIsLab(Boolean(editingSession.isLab));
      setLabGroup(editingSession.labGroup || '');

      const matchedPreset = PERIOD_PRESETS.find(
        p => p.startTime === editingSession.startTime && p.endTime === editingSession.endTime
      );
      setSelectedPeriod(matchedPreset ? matchedPreset.name : 'Custom');
    } else {
      // Reset for new blank class
      setDay(1);
      setSelectedPeriod('Period 1');
      setStartTime('08:00');
      setEndTime('09:30');
      setSubject('');
      setRoom('');
      setIsLab(false);
      setLabGroup('');
      setIsDeleting(false);
    }
    setShowSubjectDropdown(false);
    setHighlightedIndex(-1);
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

    const newStart = type === 'start' ? value : startTime;
    const newEnd = type === 'end' ? value : endTime;
    const matched = PERIOD_PRESETS.find(p => p.startTime === newStart && p.endTime === newEnd);
    setSelectedPeriod(matched ? matched.name : 'Custom');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalSubject = subject.trim();
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

    const colorClass = getSubjectColor(finalSubject);

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
      toast.success('Class added to your schedule');
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
                className="rounded-xl font-mono"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">End Time</Label>
              <Input
                type="time"
                value={endTime}
                onChange={e => handleCustomTimeChange('end', e.target.value)}
                className="rounded-xl font-mono"
                required
              />
            </div>
          </div>

          {/* Subject Input & Autofill Suggestions */}
          <div className="space-y-1.5 relative">
            <Label htmlFor="class-subject-input" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Subject Name
            </Label>
            <div className="relative">
              <Input
                id="class-subject-input"
                placeholder="e.g. Mathematics, Biology 101, Web Development..."
                value={subject}
                onChange={e => {
                  setSubject(e.target.value);
                  setShowSubjectDropdown(true);
                  setHighlightedIndex(-1);
                }}
                onFocus={() => setShowSubjectDropdown(true)}
                onBlur={() => {
                  setTimeout(() => setShowSubjectDropdown(false), 200);
                }}
                onKeyDown={e => {
                  if (!showSubjectDropdown || filteredSuggestions.length === 0) return;
                  const maxIndex = Math.min(filteredSuggestions.length, 6) - 1;
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setHighlightedIndex(prev => (prev < maxIndex ? prev + 1 : 0));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setHighlightedIndex(prev => (prev > 0 ? prev - 1 : maxIndex));
                  } else if (e.key === 'Enter') {
                    if (highlightedIndex >= 0 && highlightedIndex <= maxIndex) {
                      e.preventDefault();
                      setSubject(filteredSuggestions[highlightedIndex]);
                      setShowSubjectDropdown(false);
                    }
                  } else if (e.key === 'Escape') {
                    setShowSubjectDropdown(false);
                  }
                }}
                className="rounded-xl"
                autoComplete="off"
                required
              />

              {/* Floating Autofill Dropdown when typing */}
              {showSubjectDropdown && query.length > 0 && filteredSuggestions.length > 0 && (
                <div
                  role="listbox"
                  className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-popover text-popover-foreground border border-border/80 rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto"
                >
                  <div className="p-1">
                    <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Autofill Suggestions
                    </div>
                    {filteredSuggestions.slice(0, 6).map((item, idx) => {
                      const isScheduleItem = scheduleSubjects.includes(item);
                      const isHighlighted = highlightedIndex === idx;
                      const isExactMatch = subject.trim().toLowerCase() === item.toLowerCase();
                      return (
                        <button
                          key={item}
                          type="button"
                          onMouseDown={e => {
                            e.preventDefault();
                            setSubject(item);
                            setShowSubjectDropdown(false);
                          }}
                          onClick={() => {
                            setSubject(item);
                            setShowSubjectDropdown(false);
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                            isHighlighted || isExactMatch
                              ? 'bg-primary/15 text-primary font-medium'
                              : 'hover:bg-accent hover:text-accent-foreground text-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${getSubjectColor(item)}`} />
                            <span className="truncate">{item}</span>
                          </div>
                          {isScheduleItem ? (
                            <span className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded font-normal shrink-0 ml-2">
                              Your Class
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                              Default
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Suggestions Chips Part */}
            {filteredSuggestions.length > 0 && (
              <div className="flex gap-1.5 flex-wrap pt-1 items-center">
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {query.length > 0 ? 'Matching:' : 'Suggestions:'}
                </span>
                {filteredSuggestions.slice(0, 6).map(s => {
                  const isSelected = subject.trim().toLowerCase() === s.toLowerCase();
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setSubject(s);
                        setShowSubjectDropdown(false);
                      }}
                      className={`text-[11px] px-2.5 py-0.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-primary/20 text-primary border-primary/40 font-semibold shadow-xs'
                          : 'bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground border-border/50'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${getSubjectColor(s)}`} />
                      <span>{s}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Room */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Room / Location (Optional)
            </Label>
            <Input
              placeholder="e.g. Room 101, Hall B, Science Lab, Online..."
              value={room}
              onChange={e => setRoom(e.target.value)}
              className="rounded-xl"
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
                  className="rounded-xl"
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
