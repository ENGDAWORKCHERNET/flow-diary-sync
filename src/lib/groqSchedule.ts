// The API key is kept server-side; this helper talks only to our schedule proxy.

export type ScheduleDay =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';

export interface ParsedClass {
  name: string;
  day: ScheduleDay;
  startTime: string;
  endTime: string;
  location: string | null;
  instructor: string | null;
}

const DAYS: ScheduleDay[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

function isValidTime(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  return Boolean(match && Number(match[1]) <= 23 && Number(match[2]) <= 59);
}

function isParsedClass(value: unknown): value is ParsedClass {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.name === 'string' &&
    typeof entry.day === 'string' &&
    DAYS.includes(entry.day as ScheduleDay) &&
    isValidTime(entry.startTime) &&
    isValidTime(entry.endTime) &&
    (typeof entry.location === 'string' || entry.location === null) &&
    (typeof entry.instructor === 'string' || entry.instructor === null)
  );
}

export async function parseScheduleImage(base64: string): Promise<ParsedClass[]> {
  const response = await fetch('/api/groq-schedule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64 }),
  });

  if (!response.ok) {
    throw new Error(`Schedule parsing failed with HTTP status ${response.status}`);
  }

  const result = await response.json() as { content?: unknown };
  const content = result.content;
  if (typeof content !== 'string') {
    throw new Error('Groq returned no schedule JSON');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Groq returned invalid JSON for the schedule');
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('classes' in parsed) ||
    !Array.isArray(parsed.classes) ||
    !parsed.classes.every(isParsedClass)
  ) {
    throw new Error('Groq returned schedule data in an invalid format');
  }

  return parsed.classes;
}
