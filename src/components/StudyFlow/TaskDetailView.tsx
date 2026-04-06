import { type Task, formatTime12 } from '@/lib/data';
import { useTaskTimer } from '@/lib/useTaskTimer';
import { Play, Pause, Square, Clock, CalendarDays, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  task: Task;
  onSaveSession: (taskId: string, duration: number) => void;
  onToggleComplete: (id: string) => void;
}

function formatDuration(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function padTimer(val: number) {
  return val.toString().padStart(2, '0');
}

export default function TaskDetailView({ task, onSaveSession, onToggleComplete }: Props) {
  const { elapsed, start, pause, stop, isRunning, isPaused } = useTaskTimer(task.id);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;

  const handleStop = () => {
    const duration = stop();
    if (duration > 0 || elapsed > 0) {
      onSaveSession(task.id, duration > 0 ? duration : elapsed);
    }
  };

  return (
    <div className="space-y-6">
      {/* Priority & Subject Badges */}
      <div className="flex gap-2">
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full priority-${task.priority}`}>
          {task.priority.toUpperCase()}
        </span>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground`}>
          {task.subject}
        </span>
      </div>

      <div>
        <h2 className="text-xl font-bold font-display leading-tight">{task.title}</h2>
        {task.description && (
          <p className="text-sm text-muted-foreground mt-2">{task.description}</p>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <CalendarDays className="w-4 h-4" />
        Due: {new Date(task.dueDate).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
      </div>

      {/* Timer Section */}
      <div className="glass-card p-5 rounded-2xl flex flex-col items-center justify-center border-primary/20">
        <div className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">Focus Session</div>
        <div className={`text-5xl font-display font-light tracking-widest tabular-nums transition-colors ${isRunning ? 'text-primary' : isPaused ? 'text-primary/70' : 'text-foreground'}`}>
          {h > 0 && <>{padTimer(h)}:</>}
          {padTimer(m)}:{padTimer(s)}
        </div>
        
        <div className="flex items-center gap-3 mt-6">
          {!isRunning ? (
            <Button size="icon" onClick={() => start(task.id)} className="w-12 h-12 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-transform bg-primary text-primary-foreground">
              <Play className="w-5 h-5 ml-1" />
            </Button>
          ) : (
            <Button size="icon" onClick={pause} className="w-12 h-12 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-transform bg-amber-500 hover:bg-amber-600 text-white">
              <Pause className="w-5 h-5" />
            </Button>
          )}

          {(isRunning || isPaused || elapsed > 0) && (
            <Button size="icon" variant="destructive" onClick={handleStop} className="w-12 h-12 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-transform">
              <Square className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Completion Details */}
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Clock className="w-4 h-4 text-primary" />
            Total Time Spent
          </div>
          <span className="font-display font-bold">
            {formatDuration(task.totalTimeSpent || 0)}
          </span>
        </div>

        <Button 
          variant={task.completed ? "outline" : "default"} 
          className={`w-full justify-start gap-2 ${task.completed ? 'text-muted-foreground' : ''}`}
          onClick={() => onToggleComplete(task.id)}
        >
          <CheckCircle2 className={`w-5 h-5 ${task.completed ? 'text-primary' : ''}`} />
          {task.completed ? 'Mark as Incomplete' : 'Complete Task'}
        </Button>
      </div>

      {/* Sessions History */}
      {task.sessions && task.sessions.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Session History</h3>
          <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
            {task.sessions.slice().reverse().map((session, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl glass-card text-sm">
                <span className="text-muted-foreground">
                  {new Date(session.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </span>
                <span className="font-semibold">{formatDuration(session.duration)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
