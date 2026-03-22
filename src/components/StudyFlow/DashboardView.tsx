import { useState, useEffect, useMemo } from 'react';
import {
  getGreeting, getDailyQuote, getTodayClasses, getNextClass,
  getCurrentClass, formatTime12, formatCountdown, loadTasks,
  saveTasks, isOverdue, getWeekProgress, type Task
} from '@/lib/data';
import { Clock, BookOpen, Sparkles, TrendingUp, CheckCircle2 } from 'lucide-react';

export default function DashboardView({ tasks, onToggleTask }: { tasks: Task[]; onToggleTask: (id: string) => void }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const todayClasses = getTodayClasses();
  const nextClass = getNextClass();
  const currentClass = getCurrentClass();
  const quote = getDailyQuote();
  const progress = getWeekProgress(tasks);

  const todayTasks = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    return tasks.filter(t => !t.completed && new Date(t.dueDate) <= todayEnd);
  }, [tasks]);

  const overdueTasks = tasks.filter(t => isOverdue(t));

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="glass-card p-5">
        <p className="text-sm text-muted-foreground">{dateStr}</p>
        <div className="flex items-end justify-between mt-1">
          <div>
            <h1 className="text-2xl font-bold font-display">
              {getGreeting()}, Miki {now.getHours() >= 17 || now.getHours() < 5 ? '🌙' : '👋'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Let's make today productive</p>
          </div>
          <div className="flex items-center gap-1.5 text-primary">
            <Clock className="w-4 h-4" />
            <span className="text-lg font-semibold font-display tabular-nums">{timeStr}</span>
          </div>
        </div>
      </div>

      {/* Next Class Countdown */}
      {nextClass && (
        <div className="glass-card p-4 animate-slide-up stagger-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-primary" />
            </div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {currentClass ? 'Currently in class' : 'Next Class'}
            </span>
          </div>
          {currentClass ? (
            <div className={`${currentClass.colorClass} rounded-xl p-3`}>
              <p className="font-semibold text-sm">{currentClass.subject}</p>
              <p className="text-xs opacity-80">{formatTime12(currentClass.startTime)} – {formatTime12(currentClass.endTime)}</p>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{nextClass.session.subject}</p>
                <p className="text-xs text-muted-foreground">
                  {formatTime12(nextClass.session.startTime)} – {formatTime12(nextClass.session.endTime)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold font-display text-primary tabular-nums">
                  {formatCountdown(nextClass.minutesUntil)}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">until start</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Today's Classes */}
      <div className="glass-card p-4 animate-slide-up stagger-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Today's Classes</h3>
        {todayClasses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No classes today 🎉</p>
        ) : (
          <div className="space-y-2">
            {todayClasses.map(c => (
              <div key={c.id} className={`${c.colorClass} rounded-xl p-3 flex justify-between items-center`}>
                <span className="font-medium text-sm">{c.subject}</span>
                <span className="text-xs opacity-80">{formatTime12(c.startTime)} – {formatTime12(c.endTime)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Week Progress */}
      <div className="glass-card p-4 animate-slide-up stagger-3">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Weekly Progress</h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-primary tabular-nums">
            {progress.completed}/{progress.total}
          </span>
        </div>
      </div>

      {/* Today's Tasks */}
      <div className="glass-card p-4 animate-slide-up stagger-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Today's Focus {overdueTasks.length > 0 && <span className="text-destructive ml-1">({overdueTasks.length} overdue)</span>}
        </h3>
        {todayTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">All caught up! 🎯</p>
        ) : (
          <div className="space-y-2">
            {todayTasks.slice(0, 4).map(t => (
              <button
                key={t.id}
                onClick={() => onToggleTask(t.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors text-left"
              >
                <CheckCircle2 className={`w-5 h-5 shrink-0 ${t.completed ? 'text-primary' : 'text-muted-foreground/40'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.subject}</p>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  isOverdue(t) ? 'priority-high' : `priority-${t.priority}`
                }`}>
                  {isOverdue(t) ? 'OVERDUE' : t.priority.toUpperCase()}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Motivational Quote */}
      <div className="glass-card p-4 animate-slide-up stagger-5">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-accent shrink-0 mt-0.5" />
          <p className="text-sm italic text-muted-foreground leading-relaxed">{quote}</p>
        </div>
      </div>
    </div>
  );
}
