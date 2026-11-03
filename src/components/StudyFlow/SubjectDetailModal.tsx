import { useState } from 'react';
import {
  type SubjectAttendanceStat,
  type AttendanceRecord,
} from '@/lib/attendance';
import { useAttendance } from '@/context/AttendanceContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Calendar,
  Trash2,
  UserX,
  UserCheck,
  Settings2,
  Clock,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';

interface SubjectDetailModalProps {
  stat: SubjectAttendanceStat | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SubjectDetailModal({
  stat,
  open,
  onOpenChange,
}: SubjectDetailModalProps) {
  const {
    records,
    settings,
    updateMaxAbsences,
    recordMissedClass,
    recordAttendedClass,
    deleteRecord,
  } = useAttendance();

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingLimit, setEditingLimit] = useState(false);
  const [limitInput, setLimitInput] = useState('');

  if (!stat) return null;

  // Real-time lookup of records for this subject
  const subjectRecords = records
    .filter(r => r.subject === stat.subject)
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());

  const currentMax = settings.perSubject[stat.subject] ?? settings.defaultMaxAbsences;
  const missedCount = subjectRecords.filter(r => !r.attended).length;
  const attendedCount = subjectRecords.filter(r => r.attended).length;
  const totalCount = subjectRecords.length;
  const remaining = Math.max(0, currentMax - missedCount);
  const rate = totalCount === 0 ? 100 : Math.round((attendedCount / totalCount) * 100);

  const isLimitReached = missedCount >= currentMax;
  const isCritical = remaining === 1;

  const handleSaveLimit = () => {
    const parsed = parseInt(limitInput, 10);
    if (!isNaN(parsed) && parsed > 0) {
      updateMaxAbsences(stat.subject, parsed);
      toast.success(`Absence limit updated to ${parsed} for ${stat.subject}`);
      setEditingLimit(false);
    } else {
      toast.error('Please enter a valid positive number');
    }
  };

  const handleQuickMissed = () => {
    recordMissedClass(stat.subject, undefined, 'Subject detail modal');
    toast.error(`Missed class recorded for ${stat.subject}`, {
      description: `${missedCount + 1}/${currentMax} missed (${Math.max(0, currentMax - missedCount - 1)} left)`,
    });
  };

  const handleQuickAttended = () => {
    recordAttendedClass(stat.subject, undefined, 'Subject detail modal');
    toast.success(`Attended class recorded for ${stat.subject}`);
  };

  const handleDeleteRecord = (id: string) => {
    deleteRecord(id);
    setConfirmDeleteId(null);
    toast.info('Attendance record removed');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto rounded-3xl p-6 glass-card-solid border border-border/60">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Subject Overview
            </span>
          </div>
          <DialogTitle className="text-xl font-display font-bold leading-tight">
            {stat.subject}
          </DialogTitle>
        </DialogHeader>

        {/* Status Alert Banner */}
        <div
          className={`rounded-2xl p-4 border flex items-start gap-3 transition-colors ${
            isLimitReached
              ? 'bg-red-500/15 border-red-500/30 text-red-700 dark:text-red-300'
              : isCritical
              ? 'bg-amber-500/15 border-amber-500/30 text-amber-800 dark:text-amber-300'
              : missedCount > 0
              ? 'bg-yellow-500/15 border-yellow-500/30 text-yellow-800 dark:text-yellow-300'
              : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
          }`}
        >
          {isLimitReached ? (
            <ShieldAlert className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
          ) : isCritical ? (
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5" />
          )}
          <div className="text-xs space-y-0.5">
            <p className="font-bold text-sm">
              {isLimitReached
                ? 'Maximum Absence Limit Reached'
                : isCritical
                ? 'Critical Warning — 1 Absence Left'
                : `${remaining} Allowed Absences Remaining`}
            </p>
            <p className="opacity-90 leading-relaxed">
              {stat.warning.message}
            </p>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="glass-card p-3 rounded-2xl text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Rate
            </p>
            <p className={`text-xl font-extrabold font-display tabular-nums mt-0.5 ${
              rate >= 85 ? 'text-emerald-500' : rate >= 70 ? 'text-amber-500' : 'text-red-500'
            }`}>
              {rate}%
            </p>
          </div>

          <div className="glass-card p-3 rounded-2xl text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Missed
            </p>
            <p className="text-xl font-extrabold font-display text-red-500 tabular-nums mt-0.5">
              {missedCount}
            </p>
          </div>

          <div className="glass-card p-3 rounded-2xl text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Limit
            </p>
            <p className="text-xl font-extrabold font-display tabular-nums mt-0.5">
              {currentMax}
            </p>
          </div>

          <div className="glass-card p-3 rounded-2xl text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Left
            </p>
            <p className={`text-xl font-extrabold font-display tabular-nums mt-0.5 ${
              remaining <= 1 ? 'text-red-500' : 'text-emerald-500'
            }`}>
              {remaining}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 glass-card p-3.5 rounded-2xl">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-muted-foreground">Absence Allowance Used</span>
            <span className="font-bold tabular-nums">
              {missedCount} / {currentMax} classes ({Math.round(Math.min(100, (missedCount / currentMax) * 100))}%)
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-secondary/80 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isLimitReached
                  ? 'bg-red-500'
                  : isCritical
                  ? 'bg-amber-500'
                  : missedCount > 0
                  ? 'bg-yellow-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, (missedCount / currentMax) * 100)}%` }}
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Quick Actions
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={handleQuickMissed}
              className="h-11 rounded-2xl flex items-center justify-center gap-2 border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 font-semibold text-xs active:scale-95 transition-all"
            >
              <UserX className="w-4 h-4 text-red-500" />
              <span>Record Missed</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleQuickAttended}
              className="h-11 rounded-2xl flex items-center justify-center gap-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-semibold text-xs active:scale-95 transition-all"
            >
              <UserCheck className="w-4 h-4 text-emerald-500" />
              <span>Record Attended</span>
            </Button>
          </div>
        </div>

        {/* Absence Limit Configuration */}
        <div className="glass-card p-3.5 rounded-2xl space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold">Configured Absence Limit</span>
            </div>
            {!editingLimit && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setLimitInput(String(currentMax));
                  setEditingLimit(true);
                }}
                className="h-7 text-xs text-primary font-semibold hover:bg-primary/10 rounded-xl"
              >
                Change
              </Button>
            )}
          </div>

          {editingLimit ? (
            <div className="flex items-center gap-2 pt-1">
              <Input
                type="number"
                min={1}
                max={50}
                value={limitInput}
                onChange={e => setLimitInput(e.target.value)}
                className="h-9 w-24 rounded-xl text-center text-sm font-semibold"
                placeholder="5"
                autoFocus
              />
              <Button
                type="button"
                size="sm"
                onClick={handleSaveLimit}
                className="h-9 rounded-xl text-xs font-semibold px-3"
              >
                Save
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setEditingLimit(false)}
                className="h-9 rounded-xl text-xs"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Maximum allowed absences for this subject is currently set to{' '}
              <strong className="text-foreground">{currentMax} classes</strong>.
            </p>
          )}
        </div>

        {/* Subject Attendance History Log */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Attendance History ({subjectRecords.length})
            </span>
          </div>

          {subjectRecords.length === 0 ? (
            <div className="p-6 text-center rounded-2xl border border-dashed border-border/60 text-muted-foreground text-xs">
              No attendance records logged for this course yet.
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {subjectRecords.map(r => (
                <div
                  key={r.id}
                  className="glass-card p-3 rounded-2xl flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {r.attended ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">
                        {r.attended ? 'Attended' : 'Missed Class'}
                      </p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        <span>{r.date}</span>
                        {r.note && (
                          <>
                            <span>•</span>
                            <span className="italic truncate">{r.note}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Delete button or confirmation */}
                  {confirmDeleteId === r.id ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteRecord(r.id)}
                        className="h-7 px-2 text-[10px] rounded-lg"
                      >
                        Confirm
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirmDeleteId(null)}
                        className="h-7 px-2 text-[10px] rounded-lg"
                      >
                        No
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(r.id)}
                      className="text-muted-foreground/50 hover:text-red-500 p-1.5 rounded-lg hover:bg-secondary transition-colors"
                      title="Delete this record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            className="w-full h-11 rounded-2xl text-xs font-semibold"
          >
            Close Overview
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
