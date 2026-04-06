import { useState, useCallback, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { loadTasks, saveTasks, type Task } from '@/lib/data';
import DashboardView from '@/components/StudyFlow/DashboardView';
import ScheduleView from '@/components/StudyFlow/ScheduleView';
import TasksView from '@/components/StudyFlow/TasksView';
import AIAssistant from '@/components/StudyFlow/AIAssistant';
import { sendLocalNotification } from '@/lib/notifications';
import { Home, CalendarDays, ListChecks, Sun, Moon, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SUBJECTS, SUBJECT_COLOR } from '@/lib/data';

type Tab = 'dashboard' | 'schedule' | 'tasks';

export default function Index() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks());
  const { theme, setTheme } = useTheme();
  const [fabOpen, setFabOpen] = useState(false);

  // Quick add form state
  const [qTitle, setQTitle] = useState('');
  const [qDesc, setQDesc] = useState('');
  const [qDue, setQDue] = useState('');
  const [qPriority, setQPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [qSubject, setQSubject] = useState<string>(SUBJECTS[0]);
  const [aiGreeting, setAiGreeting] = useState<string>('');

  useEffect(() => {
    // Fetch AI insight
    const fetchInsight = async () => {
      try {
        const response = await fetch('/api/insight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tasks: tasks.slice(0, 5),
            time: new Date().toLocaleTimeString(),
            userName: 'Miki'
          })
        });
        const data = await response.json();
        setAiGreeting(data.greeting);
      } catch (e) {
        console.error('Failed to fetch AI insight');
      }
    };
    fetchInsight();
  }, []);

  const updateTasks = useCallback((updater: (prev: Task[]) => Task[]) => {
    setTasks(prev => {
      const next = updater(prev);
      saveTasks(next);
      return next;
    });
  }, []);

  const toggleTask = useCallback((id: string) => {
    updateTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  }, [updateTasks]);

  const addTask = useCallback((task: Omit<Task, 'id' | 'createdAt' | 'completed'>) => {
    updateTasks(prev => [...prev, { ...task, id: crypto.randomUUID(), createdAt: new Date().toISOString(), completed: false }]);
  }, [updateTasks]);

  const deleteTask = useCallback((id: string) => {
    updateTasks(prev => prev.filter(t => t.id !== id));
  }, [updateTasks]);

  const handleSaveSession = useCallback((taskId: string, duration: number) => {
    updateTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const session = { startTime: new Date().toISOString(), duration };
        return {
          ...t,
          totalTimeSpent: (t.totalTimeSpent || 0) + duration,
          sessions: [...(t.sessions || []), session]
        };
      }
      return t;
    }));
  }, [updateTasks]);

  const handleAICommand = useCallback((cmd: string, arg?: string) => {
    if (cmd === 'add_task' && arg) {
      addTask({
        title: arg,
        description: 'Added via StudyFlow AI',
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        priority: 'medium',
        subject: SUBJECTS[0]
      });
      sendLocalNotification("Task Added", `AI added: ${arg}`);
      setTab('tasks');
    } else if (cmd === 'complete_task' && arg) {
      toggleTask(arg);
      sendLocalNotification("Task Completed", "AI marked a task as complete.");
    } else if (cmd === 'show_tasks') {
      setTab('tasks');
    }
  }, [addTask, toggleTask]);

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qTitle.trim() || !qDue) return;
    addTask({ title: qTitle.trim(), description: qDesc.trim(), dueDate: new Date(qDue).toISOString(), priority: qPriority, subject: qSubject });
    setQTitle(''); setQDesc(''); setQDue(''); setQPriority('medium'); setQSubject(SUBJECTS[0]);
    setFabOpen(false);
  };

  const tabs: { key: Tab; label: string; icon: typeof Home }[] = [
    { key: 'dashboard', label: 'Home', icon: Home },
    { key: 'schedule', label: 'Schedule', icon: CalendarDays },
    { key: 'tasks', label: 'Tasks', icon: ListChecks },
  ];

  return (
    <div className="app-bg">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 px-4 pt-3 pb-2 flex items-center justify-between">
        <h1 className="text-lg font-bold font-display tracking-tight">
          Study<span className="text-primary">Flow</span>
        </h1>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-9 h-9 rounded-xl glass-card flex items-center justify-center hover:bg-secondary transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </header>

      {/* Content */}
      <main className="px-4 pb-24 max-w-lg mx-auto">
        {tab === 'dashboard' && <DashboardView tasks={tasks} onToggleTask={toggleTask} aiGreeting={aiGreeting} />}
        {tab === 'schedule' && <ScheduleView />}
        {tab === 'tasks' && <TasksView tasks={tasks} onToggleTask={toggleTask} onAddTask={addTask} onDeleteTask={deleteTask} onSaveSession={handleSaveSession} />}
      </main>

      <AIAssistant onCommand={handleAICommand} />

      {/* FAB */}
      <Dialog open={fabOpen} onOpenChange={setFabOpen}>
        <DialogTrigger asChild>
          <button className="fixed bottom-24 right-5 z-50 w-14 h-14 rounded-2xl bg-primary text-primary-foreground shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform">
            <Plus className="w-6 h-6" />
          </button>
        </DialogTrigger>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Quick Add Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleQuickAdd} className="space-y-3 mt-2">
            <Input placeholder="Task title" value={qTitle} onChange={e => setQTitle(e.target.value)} className="rounded-xl" required />
            <Textarea placeholder="Description (optional)" value={qDesc} onChange={e => setQDesc(e.target.value)} className="rounded-xl resize-none" rows={2} />
            <Input type="datetime-local" value={qDue} onChange={e => setQDue(e.target.value)} className="rounded-xl" required />
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setQPriority(p)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold uppercase tracking-wide transition-colors ${
                    qPriority === p ? `priority-${p} ring-2 ring-current/20` : 'bg-secondary text-secondary-foreground'
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
                  onClick={() => setQSubject(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                    qSubject === s ? `${SUBJECT_COLOR[s]} ring-1 ring-current/20` : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  {s.split(' ')[0]}
                </button>
              ))}
            </div>
            <Button type="submit" className="w-full rounded-xl">Add Task</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 glass-card rounded-t-2xl border-t border-border/50 px-6 pb-safe">
        <div className="flex items-center justify-around max-w-lg mx-auto h-16">
          {tabs.map(t => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-colors ${
                  active ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform ${active ? 'scale-110' : ''}`} />
                <span className="text-[10px] font-semibold uppercase tracking-wider">{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
