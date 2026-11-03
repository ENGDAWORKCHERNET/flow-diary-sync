import type { VercelRequest, VercelResponse } from "@vercel/node";
import webpush from "web-push";

// ─── VAPID configuration ──────────────────────────────────────────────────────
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

// ─── Storage helpers (Vercel KV or env-based JSON blob) ──────────────────────
// We store subscriptions in Vercel KV when available.
// For zero-infra fallback we store nothing (push won't work without KV).
async function getKV() {
  try {
    // Dynamic import so the function still deploys if @vercel/kv isn't installed
    const { kv } = await import("@vercel/kv");
    return kv;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  res.setHeader("Access-Control-Allow-Origin", "*");

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return res.status(500).json({ error: "VAPID keys not configured on server." });
  }

  // ── POST /api/push-subscribe — save subscription + schedule ────────────────
  if (req.method === "POST") {
    const { subscription, schedule, timezone } = req.body ?? {};

    if (!subscription?.endpoint) {
      return res.status(400).json({ error: "Missing subscription.endpoint" });
    }

    const kv = await getKV();
    if (!kv) {
      // KV not configured — still return 200 so client doesn't error, but warn
      console.warn("[push-subscribe] @vercel/kv not available — subscription not persisted");
      return res.status(200).json({ ok: true, warning: "No KV storage — notifications disabled server-side" });
    }

    // Key by endpoint hash (safe URL-encoded string)
    const key = `push:${Buffer.from(subscription.endpoint).toString("base64").slice(0, 64)}`;
    await kv.set(key, JSON.stringify({ subscription, schedule: schedule ?? [], timezone: timezone ?? "Africa/Addis_Ababa" }), { ex: 60 * 60 * 24 * 90 }); // 90-day TTL

    return res.status(200).json({ ok: true });
  }

  // ── DELETE /api/push-subscribe — remove subscription ──────────────────────
  if (req.method === "DELETE") {
    const { endpoint } = req.body ?? {};
    if (!endpoint) return res.status(400).json({ error: "Missing endpoint" });

    const kv = await getKV();
    if (kv) {
      const key = `push:${Buffer.from(endpoint).toString("base64").slice(0, 64)}`;
      await kv.del(key);
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
