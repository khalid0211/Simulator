import express from "express";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { db } from "./db.js";
import { sendCode } from "./email.js";

export const authRouter = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-insecure-secret-change-me";
const CODE_TTL_MIN = Number(process.env.CODE_TTL_MIN || 10);
const TOKEN_TTL_DAYS = Number(process.env.TOKEN_TTL_DAYS || 365);
const MAX_ATTEMPTS = 5;
const MAX_CODES_PER_HOUR = 5;

const emailField = z.string().email().max(200).transform((s) => s.trim().toLowerCase());
const nameField = z.string().trim().min(1).max(60).optional();
const emailSchema = z.object({ email: emailField });
const verifySchema = z.object({ email: emailField, code: z.string().regex(/^\d{6}$/), name: nameField });

const hashCode = (code) => crypto.createHash("sha256").update(String(code)).digest("hex");
const nowIso = () => new Date().toISOString();

// Per-IP limiter (per-email throttle is enforced separately below).
const requestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

authRouter.post("/request-code", requestLimiter, async (req, res) => {
  const parsed = emailSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_email" });
  const { email } = parsed.data;

  // Per-email throttle to prevent inbox bombing and provider quota burn.
  const sinceIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const recent = db
    .prepare("SELECT COUNT(*) AS c FROM email_codes WHERE email = ? AND created_at > ?")
    .get(email, sinceIso).c;
  if (recent >= MAX_CODES_PER_HOUR) return res.status(429).json({ error: "too_many_requests" });

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = Date.now() + CODE_TTL_MIN * 60 * 1000;
  db.prepare(
    "INSERT INTO email_codes (email, code_hash, expires_at, created_at) VALUES (?,?,?,?)"
  ).run(email, hashCode(code), expiresAt, nowIso());

  try {
    await sendCode(email, code);
  } catch (e) {
    console.error("[auth] sendCode failed:", e.message);
    return res.status(502).json({ error: "email_failed" });
  }
  res.json({ ok: true });
});

authRouter.post("/verify", (req, res) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });
  const { email, code, name } = parsed.data;

  const row = db
    .prepare("SELECT * FROM email_codes WHERE email = ? AND consumed_at IS NULL ORDER BY id DESC LIMIT 1")
    .get(email);
  if (!row) return res.status(400).json({ error: "no_code" });
  if (row.attempts >= MAX_ATTEMPTS) return res.status(429).json({ error: "too_many_attempts" });
  if (row.expires_at < Date.now()) return res.status(400).json({ error: "expired" });

  if (row.code_hash !== hashCode(code)) {
    db.prepare("UPDATE email_codes SET attempts = attempts + 1 WHERE id = ?").run(row.id);
    return res.status(400).json({ error: "wrong_code" });
  }

  db.prepare("UPDATE email_codes SET consumed_at = ? WHERE id = ?").run(nowIso(), row.id);

  // Registration: the display name travels with the verified email so a
  // returning player sees both without re-typing. Re-verifying with a new
  // name overwrites it — this is how "un-register then re-register" changes
  // the stored name.
  const existing = db.prepare("SELECT email, display_name FROM users WHERE email = ?").get(email);
  const displayName = name || existing?.display_name || null;
  if (existing) {
    db.prepare("UPDATE users SET verified_at = ?, display_name = ? WHERE email = ?").run(nowIso(), displayName, email);
  } else {
    db.prepare("INSERT INTO users (email, display_name, created_at, verified_at) VALUES (?,?,?,?)").run(
      email, displayName, nowIso(), nowIso()
    );
  }

  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: `${TOKEN_TTL_DAYS}d` });
  res.json({ token, email, name: displayName });
});

export function requireAuth(req, res, next) {
  const m = (req.headers.authorization || "").match(/^Bearer (.+)$/);
  if (!m) return res.status(401).json({ error: "no_token" });
  try {
    req.user = jwt.verify(m[1], JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "bad_token" });
  }
}
