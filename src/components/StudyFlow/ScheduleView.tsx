import { useRef, useState } from 'react';
import {
  DAY_NAMES,
  DAY_SHORT,
  formatTime12,
  getSubjectColor,
  checkScheduleOverlap,
  type ClassSession,
} from '@/lib/data';
import { useSchedule } from '@/context/ScheduleContext';
import ClassFormModal from './ClassFormModal';
import AddClassChoiceModal from './AddClassChoiceModal';
import ScheduleImagePreviewModal from './ScheduleImagePreviewModal';
import { parseScheduleImage, type ParsedClass } from '@/lib/groqSchedule';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LoaderCircle, Plus, UserX, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAttendance } from '@/context/AttendanceContext';

const DAYS_WITH_CLASSES = [1, 2, 3, 4, 5, 6, 0]; // Mon to Sun

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Could not read the selected image'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the selected image'));
    reader.readAsDataURL(file);
  });
}

function isValidTime(value: string): boolean {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return false;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours <= 23 && minutes <= 59;
}

export default function ScheduleView() {
  const { schedule, addClass } = useSchedule();
  const { recordMissedClass, getSubjectStat, undoLastAbsence } = useAttendance();
  const today = new Date().getDay();

  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editingSession, setEditingSession] = useState<ClassSession | null>(null);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [loadingSubject, setLoadingSubject] = useState<string | null>(null);

  const handleRecordMissed = (e: React.MouseEvent, session: ClassSession) => {
    e.stopPropagation();
    if (loadingSubject === session.id) return;

    setLoadingSubject(session.id);
    try {
      const record = recordMissedClass(session.subject, session.id, 'Schedule quick action');
      const stat = getSubjectStat(session.subject);
      const newMissed = (stat?.absent ?? 0) + 1;
      const maxAllowed = stat?.maxAbsences ?? 5;
      const remaining = Math.max(0, maxAllowed - newMissed);

      toast.error(`Missed class recorded for ${session.subject}`, {
        description: `Missed: ${newMissed}/${maxAllowed} (${remaining} remaining)`,
        action: {
          label: 'Undo',
          onClick: () => {
            undoLastAbsence(session.subject);
            toast.info(`Undid missed class for ${session.subject}`);
          },
        },
      });
    } finally {
      setTimeout(() => setLoadingSubject(null), 350);
    }
  };
  const [previewOpen, setPreviewOpen] = useState(false);
  const [parsedClasses, setParsedClasses] = useState<ParsedClass[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenManual = () => {
    setChoiceOpen(false);
    setEditingSession(null);
    setFormOpen(true);
  };

  const handleOpenAdd = () => setChoiceOpen(true);

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsParsing(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const classes = await parseScheduleImage(dataUrl);
      if (classes.length === 0) {
        throw new Error('No classes were found in the selected schedule');
      }
      setParsedClasses(classes);
      setPreviewOpen(true);
    } catch (error) {
      console.error('[Schedule upload] Failed to parse schedule image:', error);
      toast.error('Our AI is taking a quick break. Please try again in a minute.');
      setChoiceOpen(true);
    } finally {
      setIsParsing(false);
    }
  };

  const updateParsedClass = (index: number, updates: Partial<ParsedClass>) => {
    setParsedClasses(current =>
      current.map((classItem, itemIndex) =>
        itemIndex === index ? { ...classItem, ...updates } : classItem
      )
    );
  };

  const handleSaveAll = () => {
    if (parsedClasses.length === 0) {
      toast.error('Add at least one class before saving');
      return;
    }

    const unsaved: ParsedClass[] = [];
    const pendingSessions: ClassSession[] = [];
    let savedCount = 0;

    parsedClasses.forEach((classItem, index) => {
      const subject = classItem.name.trim();
      if (
        !subject ||
        !isValidTime(classItem.startTime) ||
        !isValidTime(classItem.endTime) ||
        classItem.startTime >= classItem.endTime
      ) {
        unsaved.push(classItem);
        return;
      }

      const day = DAY_NAMES.indexOf(classItem.day);
      const payload = {
        subject,
        day,
        startTime: classItem.startTime,
        endTime: classItem.endTime,
        colorClass: getSubjectColor(subject),
        room: classItem.location?.trim() || undefined,
      };

      const overlap = checkScheduleOverlap([...schedule, ...pendingSessions], payload);
      if (overlap.hasOverlap) {
        unsaved.push(classItem);
        return;
      }

      const result = addClass(payload);

      if (result.success) {
        savedCount += 1;
        pendingSessions.push({ ...payload, id: result.id ?? `import-${index}` });
      } else {
        unsaved.push(classItem);
      }
    });

    if (unsaved.length > 0) {
      setParsedClasses(unsaved);
      toast.error(`${unsaved.length} class${unsaved.length === 1 ? '' : 'es'} could not be saved. Check the details or schedule conflicts.`);
      return;
    }

    setParsedClasses([]);
    setPreviewOpen(false);
    toast.success(`${savedCount} class${savedCount === 1 ? '' : 'es'} added to your schedule`);
  };

  const handleOpenEdit = (session: ClassSession) => {
    setEditingSession(session);
    setFormOpen(true);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="glass-card p-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display">Weekly Schedule</h2>
          <p className="text-sm text-muted-foreground mt-1">Your class timetable</p>
        </div>
        <Button
          onClick={handleOpenAdd}
          size="sm"
          className="rounded-xl flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Class</span>
        </Button>
      </div>

      {schedule.length === 0 ? (
        <div className="glass-card p-8 text-center space-y-4 animate-fade-in my-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
            <Plus className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg">No Classes Scheduled Yet</h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1 leading-relaxed">
              Your timetable is completely blank and ready for your schedule. Tap below to add your first lecture or lab session.
            </p>
          </div>
          <Button
            onClick={handleOpenAdd}
            size="sm"
            className="rounded-xl gap-1.5 shadow-md font-semibold px-4 py-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Your First Class</span>
          </Button>
        </div>
      ) : (
        DAYS_WITH_CLASSES.map(day => {
          const classes = schedule
            .filter(s => s.day === day)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
          const isToday = day === today;

          if (classes.length === 0) return null;

        return (
          <div key={day} className={`glass-card p-4 ${isToday ? 'ring-2 ring-primary/40' : ''}`}>
            <div className="flex items-center gap-2 mb-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                  isToday ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                }`}
              >
                {DAY_SHORT[day]}
              </div>
              <div>
                <p className="font-semibold text-sm">{DAY_NAMES[day]}</p>
                {isToday && (
                  <p className="text-[10px] text-primary font-medium uppercase tracking-wider">Today</p>
                )}
              </div>
            </div>

            <div className="space-y-2.5">
              {classes.map(c => {
                const stat = getSubjectStat(c.subject);
                const missed = stat?.absent ?? 0;
                const max = stat?.maxAbsences ?? 5;
                const remaining = Math.max(0, max - missed);
                const isCritical = remaining <= 1;
                const isLimitReached = missed >= max;

                return (
                  <div
                    key={c.id}
                    onClick={() => handleOpenEdit(c)}
                    role="button"
                    tabIndex={0}
                    title="Click to edit or remove class"
                    className={`${c.colorClass} rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer hover:opacity-95 active:scale-[0.99] transition-all shadow-sm border border-black/5 dark:border-white/5`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm leading-snug">{c.subject}</span>
                        {c.isLab && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-black/25 text-white px-2 py-0.5 rounded-md shadow-sm">
                            LAB • {c.labGroup}
                          </span>
                        )}
                        {missed > 0 && (
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                              isLimitReached
                                ? 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/40'
                                : isCritical
                                ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40'
                                : 'bg-black/15 dark:bg-white/15 text-foreground border-transparent'
                            }`}
                          >
                            {missed}/{max} missed
                          </span>
                        )}
                      </div>
                      <p className="text-xs opacity-80 mt-1 flex items-center gap-1.5">
                        <span>{formatTime12(c.startTime)} – {formatTime12(c.endTime)}</span>
                        {c.room && (
                          <>
                            <span className="opacity-50">•</span>
                            <span>Room {c.room}</span>
                          </>
                        )}
                      </p>
                    </div>

                    {/* Attendance Action */}
                    <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={loadingSubject === c.id}
                        onClick={e => handleRecordMissed(e, c)}
                        className={`h-8 px-2.5 rounded-xl text-xs font-semibold shadow-sm transition-transform active:scale-95 flex items-center gap-1.5 ${
                          isLimitReached
                            ? 'bg-red-500/20 hover:bg-red-500/30 text-red-700 dark:text-red-300 border border-red-500/30'
                            : isCritical
                            ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 border border-amber-500/30'
                            : 'bg-background/80 hover:bg-background text-foreground'
                        }`}
                        title="Record a missed class for this subject"
                      >
                        {loadingSubject === c.id ? (
                          <LoaderCircle className="w-3.5 h-3.5 animate-spin text-red-500" />
                        ) : (
                          <UserX className="w-3.5 h-3.5 text-red-500" />
                        )}
                        <span>Missed Class</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })
    )}

      <AddClassChoiceModal
        open={choiceOpen}
        onClose={() => setChoiceOpen(false)}
        onManual={handleOpenManual}
        onUpload={() => {
          setChoiceOpen(false);
          fileInputRef.current?.click();
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelected}
      />
      <Dialog open={isParsing}>
        <DialogContent className="rounded-2xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Reading your schedule</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center gap-3 py-6 text-muted-foreground">
            <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
            <span>Finding your classes...</span>
          </div>
        </DialogContent>
      </Dialog>
      <ScheduleImagePreviewModal
        open={previewOpen}
        classes={parsedClasses}
        onClose={() => setPreviewOpen(false)}
        onUpdate={updateParsedClass}
        onRemove={index => setParsedClasses(current => current.filter((_, itemIndex) => itemIndex !== index))}
        onSaveAll={handleSaveAll}
      />
      <ClassFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        editingSession={editingSession}
      />
    </div>
  );
}
