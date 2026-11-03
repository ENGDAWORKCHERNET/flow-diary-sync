import type { VercelRequest, VercelResponse } from "@vercel/node";
import webpush from "web-push";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:engdaworkmichael2@gmail.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  } catch (e) {
    console.warn("Failed to set VAPID details:", e);
  }
}

// Days: 0 = Sunday … 6 = Saturday
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface ClassSession {
  id?: string;
  subject: string;
  startTime: string; // "HH:MM" 24h
  endTime: string;
  day: number;       // 0-6
  room?: string;
  isLab?: boolean;
  labGroup?: string;
}

interface StoredRecord {
  subscription: webpush.PushSubscription;
  schedule: ClassSession[];
  timezone: string;
}

function formatTime12(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

async function getKV() {
  try {
    const { kv } = await import("@vercel/kv");
    return kv;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow manual GET for testing, and Vercel Cron which uses GET
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return res.status(500).json({ error: "VAPID keys not configured." });
  }

  const kv = await getKV();
  if (!kv) {
    return res.status(200).json({ ok: true, sent: 0, reason: "KV not configured" });
  }

  // ── Scan all stored push subscriptions ────────────────────────────────────
  // Vercel KV (Upstash Redis) supports SCAN via kv.scan()
  let cursor = 0;
  const allKeys: string[] = [];
  do {
    const [nextCursor, keys] = await kv.scan(cursor, { match: "push:*", count: 100 });
    allKeys.push(...(keys as string[]));
    cursor = nextCursor as number;
  } while (cursor !== 0);

  let sent = 0;
  const errors: string[] = [];

  // Current time in EAT (UTC+3) — HiLCoE is in Addis Ababa
  const nowUTC = new Date();
  // We'll compute "now" per subscriber timezone but default to EAT (UTC+3)
  const EAT_OFFSET_MS = 3 * 60 * 60 * 1000;

  for (const key of allKeys) {
    let record: StoredRecord;
    try {
      const raw = await kv.get<string>(key);
      if (!raw) continue;
      record = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      continue;
    }

    // Determine local time for this subscriber
    // We use tzOffset from the stored timezone string (best effort UTC+3 for EAT)
    let tzOffsetMs = EAT_OFFSET_MS;
    if (record.timezone) {
      try {
        // Use Intl to get current local time in their timezone
        const formatter = new Intl.DateTimeFormat("en-US", {
          timeZone: record.timezone,
          hour: "numeric", minute: "numeric", hour12: false,
        });
        const parts = formatter.formatToParts(nowUTC);
        const localH = parseInt(parts.find(p => p.type === "hour")?.value ?? "0");
        const localM = parseInt(parts.find(p => p.type === "minute")?.value ?? "0");
        const nowMins = localH * 60 + localM;

        // Get day of week in subscriber's timezone
        const dayFormatter = new Intl.DateTimeFormat("en-US", {
          timeZone: record.timezone,
          weekday: "short",
        });
        const dayShort = dayFormatter.format(nowUTC);
        const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
        const localDay = dayMap[dayShort] ?? nowUTC.getUTCDay();

        // Check all classes for this subscriber
        const todayClasses = (record.schedule ?? []).filter(s => s.day === localDay);

        for (const session of todayClasses) {
          const [h, m] = session.startTime.split(":").map(Number);
          const startMin = h * 60 + m;
          const minutesUntil = startMin - nowMins;

          // Fire if 14 < minutesUntil <= 16 (catches the 5-minute cron window around 15 min)
          if (minutesUntil > 13 && minutesUntil <= 16) {
            const roomPart = session.room ? ` • Room ${session.room}` : "";
            const labPart = session.isLab ? ` (Lab${session.labGroup ? ` ${session.labGroup}` : ""})` : "";
            const title = `🔔 Class in ~${minutesUntil}min: ${session.subject}`;
            const body = `Starts at ${formatTime12(session.startTime)}${roomPart}${labPart}. Head there now!`;

            try {
              await webpush.sendNotification(
                record.subscription,
                JSON.stringify({ title, body, url: "/" })
              );
              sent++;
            } catch (pushErr: unknown) {
              const msg = pushErr instanceof Error ? pushErr.message : String(pushErr);
              errors.push(`${key}: ${msg}`);
              // If subscription expired/invalid, remove it
              if (msg.includes("410") || msg.includes("404")) {
                await kv.del(key);
              }
            }
          }
        }
        continue; // already processed with Intl approach
      } catch {
        // Fallback: use raw UTC+3 offset
      }
    }

    // Fallback path (Intl failed) — use EAT offset
    const localNow = new Date(nowUTC.getTime() + tzOffsetMs);
    const nowMins = localNow.getUTCHours() * 60 + localNow.getUTCMinutes();
    const localDay = localNow.getUTCDay();

    const todayClasses = (record.schedule ?? []).filter(s => s.day === localDay);
    for (const session of todayClasses) {
      const [h, m] = session.startTime.split(":").map(Number);
      const startMin = h * 60 + m;
      const minutesUntil = startMin - nowMins;

      if (minutesUntil > 13 && minutesUntil <= 16) {
        const roomPart = session.room ? ` • Room ${session.room}` : "";
        const title = `🔔 Class in ~${minutesUntil}min: ${session.subject}`;
        const body = `Starts at ${formatTime12(session.startTime)}${roomPart}. Head there now!`;

        try {
          await webpush.sendNotification(
            record.subscription,
            JSON.stringify({ title, body, url: "/" })
          );
          sent++;
        } catch (pushErr: unknown) {
          const msg = pushErr instanceof Error ? pushErr.message : String(pushErr);
          errors.push(`${key}: ${msg}`);
          if (msg.includes("410") || msg.includes("404")) {
            await kv.del(key);
          }
        }
      }
    }
  }

  return res.status(200).json({ ok: true, sent, errors: errors.length ? errors : undefined });
}
