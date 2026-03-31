import { SCHEDULE, DAY_NAMES, DAY_SHORT, formatTime12 } from '@/lib/data';

const DAYS_WITH_CLASSES = [1, 2, 3, 4, 5, 6]; // Mon to Sat

export default function ScheduleView() {
  const today = new Date().getDay();

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="glass-card p-5">
        <h2 className="text-xl font-bold font-display">Weekly Schedule</h2>
        <p className="text-sm text-muted-foreground mt-1">Your class timetable</p>
      </div>

      {DAYS_WITH_CLASSES.map(day => {
        const classes = SCHEDULE.filter(s => s.day === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
        const isToday = day === today;

        if (classes.length === 0) return null;

        return (
          <div key={day} className={`glass-card p-4 ${isToday ? 'ring-2 ring-primary/40' : ''}`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                isToday ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
              }`}>
                {DAY_SHORT[day]}
              </div>
              <div>
                <p className="font-semibold text-sm">{DAY_NAMES[day]}</p>
                {isToday && <p className="text-[10px] text-primary font-medium uppercase tracking-wider">Today</p>}
              </div>
            </div>
            
            {classes.length === 0 ? (
              <div className="p-3 text-center rounded-xl bg-secondary/50 border border-border/50">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">No Classes</p>
              </div>
            ) : (
              <div className="space-y-2">
                {classes.map(c => (
                  <div key={c.id} className={`${c.colorClass} rounded-xl p-3 flex justify-between items-center`}>
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
            )}
          </div>
        );
      })}
    </div>
  );
}
