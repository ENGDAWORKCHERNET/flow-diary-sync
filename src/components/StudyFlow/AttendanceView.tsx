import { useState } from 'react';
import { useAttendance } from '@/context/AttendanceContext';
import { useSchedule } from '@/context/ScheduleContext';
import {
  CheckCircle2, XCircle, AlertTriangle, Settings2,
  Trash2, ChevronDown, ChevronUp, BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function AttendanceView() {
  const { stats, settings, records, updateMaxAbsences, deleteRecord, clearAllRecords } = useAttendance();
  const { schedule } = useSchedule();
  const [showSettings, setShowSettings] = useState(false);
  const [showLog, setShowLog] = useState(false);

  // Unique subjects currently in the schedule
  const scheduledSubjects = [...new Set(schedule.map(s => s.subject))];

  const handleDefaultChange = (val: string) => {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 0) updateMaxAbsences('__default__', n);
  };

  const handleSubjectChange = (subject: string, val: string) => {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 0) updateMaxAbsences(subject, n);
  };

  const handleClearAll = () => {
    clearAllRecords();
    toast.success('All attendance records cleared.');
  };

  const sortedRecords = [...records].sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
  );

  const totalAttended = records.filter(r => r.attended).length;
  const totalAbsent = records.filter(r => !r.attended).length;
  const total = records.length;
  const overallRate = total === 0 ? 100 : Math.round((totalAttended / total) * 100);

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Header */}
      <div className="glass-card p-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display">Attendance</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Track your class attendance</p>
        </div>
        <button
          onClick={() => setShowSettings(s => !s)}
          className="w-9 h-9 rounded-xl glass-card flex items-center justify-center hover:bg-secondary transition-colors"
          title="Attendance settings"
        >
          <Settings2 className="w-4 h-4" />
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="glass-card p-5 space-y-4 animate-fade-in">
          <h3 className="font-semibold text-sm">Absence Limits</h3>
          <p className="text-xs text-muted-foreground">
            Set how many classes you're allowed to skip before a warning appears.
          </p>

          {/* Global default */}
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium">Default (all subjects)</span>
            <Input
              type="number"
              min={0}
              max={50}
              value={settings.defaultMaxAbsences}
              onChange={e => handleDefaultChange(e.target.value)}
              className="w-20 h-9 rounded-xl text-center text-sm"
            />
          </div>

          {/* Per-subject overrides */}
          {scheduledSubjects.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Per-subject overrides
              </p>
              {scheduledSubjects.map(subject => (
                <div key={subject} className="flex items-center justify-between gap-4">
                  <span className="text-xs flex-1 truncate" title={subject}>
                    {subject.length > 30 ? `${subject.slice(0, 28)}…` : subject}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    placeholder={String(settings.defaultMaxAbsences)}
                    value={settings.perSubject[subject] ?? ''}
                    onChange={e => handleSubjectChange(subject, e.target.value)}
                    className="w-20 h-9 rounded-xl text-center text-sm"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* No classes scheduled */}
      {schedule.length === 0 && (
        <div className="glass-card p-8 text-center space-y-3">
          <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Add classes to your schedule first so attendance can be tracked automatically.
          </p>
        </div>
      )}

      {/* No records yet */}
      {schedule.length > 0 && records.length === 0 && (
        <div className="glass-card p-8 text-center space-y-3 animate-fade-in">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-primary" />
          </div>
          <div>
            <p className="font-semibold">No records yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">
              After a class ends, a prompt will ask if you attended.
              Your attendance will be tracked automatically from there.
            </p>
          </div>
        </div>
      )}

      {/* Overall summary */}
      {records.length > 0 && (
        <>
          <div className="glass-card p-5 space-y-3 animate-fade-in stagger-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Overall
            </p>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                {/* Progress bar */}
                <div className="w-full h-3 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      overallRate >= 80 ? 'bg-emerald-500' :
                      overallRate >= 60 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${overallRate}%` }}
                  />
                </div>
              </div>
              <span className="text-xl font-bold font-display tabular-nums">
                {overallRate}%
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-secondary/50 rounded-xl p-2">
                <p className="text-base font-bold text-emerald-500">{totalAttended}</p>
                <p className="text-[10px] text-muted-foreground">Attended</p>
              </div>
              <div className="bg-secondary/50 rounded-xl p-2">
                <p className="text-base font-bold text-red-500">{totalAbsent}</p>
                <p className="text-[10px] text-muted-foreground">Skipped</p>
              </div>
              <div className="bg-secondary/50 rounded-xl p-2">
                <p className="text-base font-bold">{total}</p>
                <p className="text-[10px] text-muted-foreground">Total</p>
              </div>
            </div>
          </div>

          {/* Per-subject cards */}
          <div className="space-y-3">
            {stats.map(s => (
              <div
                key={s.subject}
                className={`glass-card p-4 space-y-2 animate-fade-in ${
                  s.atRisk ? 'border border-red-400/50 bg-red-500/5' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" title={s.subject}>
                      {s.subject}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {s.attended} attended · {s.absent} skipped · {s.total} total
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={`text-lg font-bold tabular-nums ${
                      s.attendanceRate >= 80 ? 'text-emerald-500' :
                      s.attendanceRate >= 60 ? 'text-amber-500' : 'text-red-500'
                    }`}>
                      {s.attendanceRate}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      s.attendanceRate >= 80 ? 'bg-emerald-500' :
                      s.attendanceRate >= 60 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${s.attendanceRate}%` }}
                  />
                </div>

                {/* Absence limit indicator */}
                <div className="flex items-center gap-1.5 text-xs">
                  {s.atRisk ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span className="text-red-500 font-semibold">
                        Absence limit reached! ({s.absent}/{s.maxAbsences})
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="text-muted-foreground">
                        {s.absencesLeft} skip{s.absencesLeft !== 1 ? 's' : ''} remaining
                        <span className="opacity-60"> ({s.absent}/{s.maxAbsences} used)</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Recent log toggle */}
          <button
            onClick={() => setShowLog(l => !l)}
            className="w-full glass-card p-4 flex items-center justify-between text-sm font-medium hover:bg-secondary/30 transition-colors rounded-2xl"
          >
            <span>Recent Log ({sortedRecords.length} entries)</span>
            {showLog ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showLog && (
            <div className="space-y-2 animate-fade-in">
              {sortedRecords.slice(0, 30).map(r => (
                <div
                  key={r.id}
                  className="glass-card px-4 py-3 flex items-center gap-3"
                >
                  {r.attended
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    : <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{r.subject}</p>
                    <p className="text-[10px] text-muted-foreground">{r.date}</p>
                  </div>
                  <button
                    onClick={() => deleteRecord(r.id)}
                    className="text-muted-foreground/50 hover:text-red-500 transition-colors p-1"
                    title="Delete record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl text-xs mt-1"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Clear all records
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
