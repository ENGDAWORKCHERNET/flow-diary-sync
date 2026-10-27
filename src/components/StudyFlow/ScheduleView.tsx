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
import { LoaderCircle, Plus } from 'lucide-react';

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
  const today = new Date().getDay();

  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editingSession, setEditingSession] = useState<ClassSession | null>(null);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
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

            <div className="space-y-2">
              {classes.map(c => (
                <div
                  key={c.id}
                  onClick={() => handleOpenEdit(c)}
                  role="button"
                  tabIndex={0}
                  title="Click to edit or remove class"
                  className={`${c.colorClass} rounded-xl p-3 flex justify-between items-center cursor-pointer hover:opacity-90 active:scale-[0.99] transition-all`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{c.subject}</span>
                    {c.isLab && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-black/20 text-white px-2 py-0.5 rounded-md shadow-sm">
                        LAB • {c.labGroup}
                      </span>
                    )}
                  </div>
                  <span className="text-xs opacity-80 whitespace-nowrap ml-2">
                    {formatTime12(c.startTime)} – {formatTime12(c.endTime)}
                    {c.room && ` • ${c.room}`}
                  </span>
                </div>
              ))}
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
