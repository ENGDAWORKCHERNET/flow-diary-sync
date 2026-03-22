import { useState } from 'react';
import { type Task, SUBJECTS, SUBJECT_COLOR, isOverdue } from '@/lib/data';
import { CheckCircle2, Plus, Trash2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type Filter = 'all' | 'active' | 'overdue' | 'completed';
type SubjectName = (typeof SUBJECTS)[number];

interface Props {
  tasks: Task[];
  onToggleTask: (id: string) => void;
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'completed'>) => void;
  onDeleteTask: (id: string) => void;
}

export default function TasksView({ tasks, onToggleTask, onAddTask, onDeleteTask }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [subject, setSubject] = useState(SUBJECTS[0]);

  const filtered = tasks.filter(t => {
    if (filter === 'active') return !t.completed;
    if (filter === 'overdue') return isOverdue(t);
    if (filter === 'completed') return t.completed;
    return true;
  }).sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;
    onAddTask({ title: title.trim(), description: description.trim(), dueDate: new Date(dueDate).toISOString(), priority, subject });
    setTitle(''); setDescription(''); setDueDate(''); setPriority('medium'); setSubject(SUBJECTS[0]);
    setDialogOpen(false);
  };

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'completed', label: 'Done' },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="glass-card p-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display">Tasks</h2>
          <p className="text-sm text-muted-foreground mt-1">{tasks.filter(t => !t.completed).length} remaining</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-xl gap-1.5">
              <Plus className="w-4 h-4" /> Add
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-display">New Task</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3 mt-2">
              <Input placeholder="Task title" value={title} onChange={e => setTitle(e.target.value)} className="rounded-xl" required />
              <Textarea placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} className="rounded-xl resize-none" rows={2} />
              <Input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} className="rounded-xl" required />
              <div className="flex gap-2">
                {(['low', 'medium', 'high'] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold uppercase tracking-wide transition-colors ${
                      priority === p ? `priority-${p} ring-2 ring-current/20` : 'bg-secondary text-secondary-foreground'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 flex-wrap">
                {SUBJECTS.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSubject(s)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                      subject === s ? `${SUBJECT_COLOR[s]} ring-1 ring-current/20` : 'bg-secondary text-secondary-foreground'
                    }`}
                  >
                    {s.split(' ')[0]}
                  </button>
                ))}
              </div>
              <Button type="submit" className="w-full rounded-xl">Create Task</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 px-1">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              filter === f.key
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'glass-card text-muted-foreground hover:text-foreground'
            }`}
          >
            {f.label}
            {f.key === 'overdue' && tasks.filter(isOverdue).length > 0 && (
              <span className="ml-1.5 bg-destructive text-destructive-foreground rounded-full px-1.5 text-[10px]">
                {tasks.filter(isOverdue).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="glass-card p-8 text-center text-muted-foreground text-sm">
            No tasks found
          </div>
        )}
        {filtered.map(t => (
          <div
            key={t.id}
            className={`glass-card p-4 flex items-start gap-3 transition-opacity ${t.completed ? 'opacity-60' : ''}`}
          >
            <button onClick={() => onToggleTask(t.id)} className="mt-0.5 shrink-0">
              <CheckCircle2 className={`w-5 h-5 transition-colors ${t.completed ? 'text-primary' : 'text-muted-foreground/30'}`} />
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${t.completed ? 'line-through text-muted-foreground' : ''}`}>{t.title}</p>
              {t.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{t.description}</p>}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={`${SUBJECT_COLOR[t.subject] || ''} text-[10px] font-medium px-2 py-0.5 rounded-full`}>
                  {t.subject.split(' ')[0]}
                </span>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  isOverdue(t) ? 'priority-high' : `priority-${t.priority}`
                }`}>
                  {isOverdue(t) ? 'OVERDUE' : t.priority.toUpperCase()}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(t.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
            </div>
            <button onClick={() => onDeleteTask(t.id)} className="shrink-0 text-muted-foreground/40 hover:text-destructive transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
