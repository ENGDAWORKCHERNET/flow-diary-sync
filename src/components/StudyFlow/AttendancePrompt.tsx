import { useAttendance } from '@/context/AttendanceContext';
import { formatTime12 } from '@/lib/data';
import { CheckCircle2, XCircle, Clock, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Attendance prompt dialog — slides up after a class ends and asks the user
 * whether they actually attended. Styled to match the existing glass-card UI.
 */
export default function AttendancePrompt() {
  const { pendingPrompt, recordAttended, recordAbsent, dismissPrompt } = useAttendance();

  if (!pendingPrompt) return null;

  const { session, date, occurrenceKey } = pendingPrompt;

  return (
    /* Full-screen overlay */
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm glass-card-solid rounded-3xl p-6 shadow-2xl border border-border/60 space-y-5 animate-scale-in">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Class Just Ended
            </p>
            <h2 className="font-display font-bold text-lg leading-tight mt-0.5">
              Did you attend?
            </h2>
          </div>
        </div>

        {/* Class info */}
        <div className={`${session.colorClass} rounded-2xl p-4 space-y-1`}>
          <p className="font-semibold text-sm leading-tight">{session.subject}</p>
          <div className="flex items-center gap-1.5 text-xs opacity-80">
            <Clock className="w-3.5 h-3.5" />
            <span>
              {formatTime12(session.startTime)} – {formatTime12(session.endTime)}
            </span>
            {session.room && (
              <>
                <span className="opacity-60">·</span>
                <span>{session.room}</span>
              </>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => recordAttended(occurrenceKey, session, date)}
            className="h-14 rounded-2xl flex flex-col items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm shadow-lg"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Yes, I was there</span>
          </Button>

          <Button
            onClick={() => recordAbsent(occurrenceKey, session, date)}
            variant="outline"
            className="h-14 rounded-2xl flex flex-col items-center gap-1 border-red-400/60 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 font-semibold text-sm"
          >
            <XCircle className="w-5 h-5" />
            <span>No, I skipped</span>
          </Button>
        </div>

        {/* Dismiss */}
        <button
          onClick={dismissPrompt}
          className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          Ask me later
        </button>
      </div>
    </div>
  );
}
