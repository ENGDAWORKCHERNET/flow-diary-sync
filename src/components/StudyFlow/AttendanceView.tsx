import { useState } from 'react';
import { useAttendance } from '@/context/AttendanceContext';
import { useSchedule } from '@/context/ScheduleContext';
import {
  type SubjectAttendanceStat,
  type AttendanceRecord,
} from '@/lib/attendance';
import SubjectDetailModal from './SubjectDetailModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Settings2,
  Trash2,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Flame,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Calendar,
  UserX,
  ExternalLink,
  RotateCcw,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AttendanceView() {
  const {
    records,
    settings,
    stats,
    overall,
    updateMaxAbsences,
    deleteRecord,
    clearAllRecords,
    undoLastAbsence,
    recordMissedClass,
  } = useAttendance();

  const { schedule } = useSchedule();
  const [showSettings, setShowSettings] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [selectedSubjectStat, setSelectedSubjectStat] = useState<SubjectAttendanceStat | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  // Scheduled unique subjects
  const scheduledSubjects = Array.from(new Set(schedule.map(s => s.subject).filter(Boolean)));

  const handleDefaultChange = (val: string) => {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n > 0) updateMaxAbsences('__default__', n);
  };

  const handleSubjectChange = (subject: string, val: string) => {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n > 0) updateMaxAbsences(subject, n);
  };

  const handleClearAll = () => {
    clearAllRecords();
    setConfirmClearAll(false);
    toast.success('All attendance records cleared.');
  };

  const handleOpenSubjectModal = (stat: SubjectAttendanceStat) => {
    setSelectedSubjectStat(stat);
    setModalOpen(true);
  };

  const sortedRecords = [...records].sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
  );

  return (
    <div className="space-y-4 animate-fade-in pb-10">
      {/* Header */}
      <div className="glass-card p-5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold font-display">Attendance Hub</h2>
            {overall.totalRecorded > 0 && overall.currentStreak > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span>{overall.currentStreak} streak</span>
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor absences, set course allowances & stay on track
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowSettings(s => !s)}
          className={`w-10 h-10 rounded-2xl glass-card flex items-center justify-center transition-all ${
            showSettings ? 'bg-primary text-primary-foreground shadow-md' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
          }`}
          title="Attendance Settings"
        >
          <Settings2 className="w-4 h-4" />
        </button>
      </div>

      {/* Motivational / Status Ribbon */}
      <div className="glass-card-solid rounded-2xl p-4 border border-border/50 bg-gradient-to-r from-primary/10 via-secondary/40 to-primary/5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4" />
        </div>
        <p className="text-xs font-medium text-foreground/90 leading-relaxed">
          {overall.motivationalMessage}
        </p>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="glass-card p-5 space-y-4 animate-fade-in border border-primary/20 shadow-lg">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm">Absence Limit Configuration</h3>
            <span className="text-[10px] text-muted-foreground">Applies per semester/term</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Define how many classes can be missed before critical alerts trigger. Defaults to 5.
          </p>

          {/* Global default */}
          <div className="flex items-center justify-between gap-4 p-3 rounded-2xl bg-secondary/50">
            <div>
              <p className="text-xs font-semibold">Global Default</p>
              <p className="text-[10px] text-muted-foreground">Used for courses without an override</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min={1}
                max={50}
                value={settings.defaultMaxAbsences}
                onChange={e => handleDefaultChange(e.target.value)}
                className="w-16 h-8 rounded-xl text-center text-xs font-bold"
              />
              <span className="text-[10px] text-muted-foreground">classes</span>
            </div>
          </div>

          {/* Per-subject overrides */}
          {scheduledSubjects.length > 0 && (
            <div className="space-y-2 pt-1">
              <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">
                Per-Subject Overrides
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {scheduledSubjects.map(subject => (
                  <div
                    key={subject}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-secondary/30 text-xs"
                  >
                    <span className="truncate flex-1 font-medium" title={subject}>
                      {subject}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        placeholder={String(settings.defaultMaxAbsences)}
                        value={settings.perSubject[subject] ?? ''}
                        onChange={e => handleSubjectChange(subject, e.target.value)}
                        className="w-16 h-8 rounded-xl text-center text-xs font-semibold"
                      />
                      <span className="text-[10px] text-muted-foreground">classes</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Overview Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Attendance Rate */}
        <div className="glass-card p-4 rounded-2xl space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-bold uppercase tracking-wider">Attendance</span>
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-extrabold font-display tabular-nums ${
              overall.overallRate >= 85
                ? 'text-emerald-500'
                : overall.overallRate >= 70
                ? 'text-amber-500'
                : 'text-red-500'
            }`}>
              {overall.overallRate}%
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {overall.totalAttended} of {overall.totalRecorded} logged
          </p>
        </div>

        {/* Total Missed */}
        <div className="glass-card p-4 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Missed</span>
            <UserX className="w-3.5 h-3.5 text-red-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-extrabold font-display text-red-500 tabular-nums">
              {overall.totalMissed}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium">classes</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Recorded absences</p>
        </div>

        {/* Allowed Absences Remaining */}
        <div className="glass-card p-4 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-bold uppercase tracking-wider">Allowance Left</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-extrabold font-display tabular-nums ${
              overall.totalRemainingAbsences <= 2 ? 'text-amber-500' : 'text-emerald-500'
            }`}>
              {overall.totalRemainingAbsences}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium">remaining</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Across all subjects</p>
        </div>

        {/* Subjects At Risk */}
        <div className="glass-card p-4 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-bold uppercase tracking-wider">At Risk</span>
            <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-extrabold font-display tabular-nums ${
              overall.subjectsAtRiskCount > 0 ? 'text-red-500' : 'text-foreground'
            }`}>
              {overall.subjectsAtRiskCount}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium">subjects</span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {overall.subjectsAtRiskCount > 0 ? 'Near or over limit' : 'All within limits'}
          </p>
        </div>
      </div>

      {/* Empty Schedule State */}
      {schedule.length === 0 && stats.length === 0 && (
        <div className="glass-card p-8 text-center space-y-3">
          <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/40" />
          <h3 className="font-semibold text-sm">No Courses Found</h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Add your subjects in the Schedule tab to start tracking your attendance and absences automatically.
          </p>
        </div>
      )}

      {/* Subject Attendance Cards Section */}
      {stats.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Courses & Subjects ({stats.length})
            </h3>
            <span className="text-[10px] text-muted-foreground">Tap any card for details</span>
          </div>

          <div className="space-y-3">
            {stats.map(s => {
              const isLimitReached = s.status === 'limit_reached';
              const isCritical = s.status === 'critical';
              const isWarning = s.status === 'warning';

              const progressPercent = Math.min(
                100,
                Math.round((s.absent / Math.max(1, s.maxAbsences)) * 100)
              );

              return (
                <div
                  key={s.subject}
                  onClick={() => handleOpenSubjectModal(s)}
                  role="button"
                  tabIndex={0}
                  className={`glass-card p-4.5 rounded-2xl space-y-3 cursor-pointer hover:border-primary/40 transition-all hover:scale-[1.01] active:scale-[0.99] border ${
                    isLimitReached
                      ? 'border-red-500/40 bg-red-500/5'
                      : isCritical
                      ? 'border-amber-500/40 bg-amber-500/5'
                      : isWarning
                      ? 'border-yellow-500/30'
                      : 'border-border/50'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm text-foreground truncate" title={s.subject}>
                          {s.subject}
                        </p>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.warning.badgeClass}`}
                        >
                          {s.warning.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {s.absent} missed · {s.attended} attended · {s.total} logged
                      </p>
                    </div>

                    {/* Circular / Badge Percentage */}
                    <div className="shrink-0 text-right">
                      <div className="flex items-baseline justify-end gap-0.5">
                        <span
                          className={`text-lg font-black font-display tabular-nums ${
                            s.attendanceRate >= 85
                              ? 'text-emerald-500'
                              : s.attendanceRate >= 70
                              ? 'text-amber-500'
                              : 'text-red-500'
                          }`}
                        >
                          {s.attendanceRate}%
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground block">
                        rate
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Absence Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground font-medium">
                        Absences Used: <strong className="text-foreground">{s.absent}</strong> of {s.maxAbsences}
                      </span>
                      <span className={`font-semibold ${
                        s.absencesLeft <= 1 ? 'text-red-500' : 'text-emerald-500'
                      }`}>
                        {s.absencesLeft} left
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isLimitReached
                            ? 'bg-red-500'
                            : isCritical
                            ? 'bg-amber-500'
                            : isWarning
                            ? 'bg-yellow-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Helpful Context Warning message */}
                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <p className="text-[11px] text-muted-foreground truncate max-w-[80%]">
                      {s.warning.message}
                    </p>
                    <span className="text-[11px] font-semibold text-primary inline-flex items-center gap-1 shrink-0">
                      Details <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Attendance Activity Log Accordion */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setShowLog(l => !l)}
          className="w-full glass-card p-4 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground hover:bg-secondary/40 transition-colors rounded-2xl"
        >
          <span>Recent Activity Log ({sortedRecords.length} entries)</span>
          {showLog ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showLog && (
          <div className="space-y-2 animate-fade-in">
            {sortedRecords.length === 0 ? (
              <div className="glass-card p-6 text-center text-xs text-muted-foreground rounded-2xl">
                No activity recorded yet. Click "Missed Class" on your schedule to begin logging.
              </div>
            ) : (
              <>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {sortedRecords.map(r => (
                    <div
                      key={r.id}
                      className="glass-card px-4 py-3 rounded-2xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {r.attended ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{r.subject}</p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            <span>{r.date}</span>
                            <span>•</span>
                            <span>{r.attended ? 'Attended' : 'Missed'}</span>
                            {r.note && (
                              <>
                                <span>•</span>
                                <span className="italic truncate">{r.note}</span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      {confirmDeleteId === r.id ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              deleteRecord(r.id);
                              setConfirmDeleteId(null);
                              toast.info('Record deleted');
                            }}
                            className="h-7 px-2 text-[10px] rounded-lg"
                          >
                            Delete
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setConfirmDeleteId(null)}
                            className="h-7 px-2 text-[10px] rounded-lg"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(r.id)}
                          className="text-muted-foreground/40 hover:text-red-500 p-1.5 rounded-lg hover:bg-secondary transition-colors"
                          title="Delete record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="pt-1">
                  {confirmClearAll ? (
                    <div className="flex items-center gap-2 p-2 rounded-2xl bg-red-500/10 border border-red-500/20">
                      <p className="text-xs text-red-500 flex-1 pl-2 font-medium">
                        Clear all {sortedRecords.length} records?
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={handleClearAll}
                        className="rounded-xl text-xs h-8"
                      >
                        Yes, Clear All
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirmClearAll(false)}
                        className="rounded-xl text-xs h-8"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmClearAll(true)}
                      className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-2xl text-xs h-9"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Clear all attendance records
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Subject Detail & History Modal */}
      <SubjectDetailModal
        stat={selectedSubjectStat}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
