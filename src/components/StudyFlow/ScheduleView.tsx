import { useState } from 'react';
import { DAY_NAMES, DAY_SHORT, formatTime12, type ClassSession } from '@/lib/data';
import { useSchedule } from '@/context/ScheduleContext';
import ClassFormModal from './ClassFormModal';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

const DAYS_WITH_CLASSES = [1, 2, 3, 4, 5, 6, 0]; // Mon to Sun

export default function ScheduleView() {
  const { schedule } = useSchedule();
  const today = new Date().getDay();

  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editingSession, setEditingSession] = useState<ClassSession | null>(null);

  const handleOpenAdd = () => {
    setEditingSession(null);
    setFormOpen(true);
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

      <ClassFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        editingSession={editingSession}
      />
    </div>
  );
}
