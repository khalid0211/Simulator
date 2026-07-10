import express from "express";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { rateLimit } from "express-rate-limit";
import { db } from "./db.js";

export const adminRouter = express.Router();

const ADMIN_KEY = process.env.ADMIN_KEY || "";

// Generous but present — this protects against brute-forcing the admin key.
const adminLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
adminRouter.use(adminLimiter);

function requireAdmin(req, res, next) {
  const key = req.headers["x-admin-key"];
  // Fail closed: if ADMIN_KEY was never set, nobody gets in (not even with a blank key).
  if (!ADMIN_KEY || typeof key !== "string" || key !== ADMIN_KEY) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

adminRouter.get("/admin/summary", requireAdmin, (_req, res) => {
  const totalUsers = db.prepare("SELECT COUNT(*) c FROM users").get().c;
  const totalRuns = db.prepare("SELECT COUNT(*) c FROM runs").get().c;
  const byPreset = db
    .prepare(
      `SELECT preset, COUNT(*) runs, ROUND(AVG(score_final),1) avgScore, ROUND(AVG(duration_seconds)/60.0,1) avgMinutes
       FROM runs GROUP BY preset ORDER BY runs DESC`
    )
    .all();
  const topScores = db
    .prepare(
      `SELECT player_name, user_email, preset, score_final, band, ended_at
       FROM runs ORDER BY score_final DESC LIMIT 10`
    )
    .all();
  const recentRuns = db
    .prepare(
      `SELECT player_name, user_email, preset, score_final, band, ended_at, duration_seconds
       FROM runs ORDER BY ended_at DESC LIMIT 20`
    )
    .all();
  const users = db.prepare(`SELECT email, created_at, verified_at FROM users ORDER BY created_at DESC`).all();
  res.json({ totalUsers, totalRuns, byPreset, topScores, recentRuns, users });
});

function toCsv(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v) => {
    if (v == null) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}

adminRouter.get("/admin/export/runs.csv", requireAdmin, (_req, res) => {
  const rows = db.prepare("SELECT * FROM runs ORDER BY created_at DESC").all();
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.send(toCsv(rows));
});

adminRouter.get("/admin/export/users.csv", requireAdmin, (_req, res) => {
  const rows = db.prepare("SELECT * FROM users ORDER BY created_at DESC").all();
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.send(toCsv(rows));
});

adminRouter.get("/admin/backup", requireAdmin, async (_req, res) => {
  const tmpFile = path.join(os.tmpdir(), `sim-backup-${Date.now()}.db`);
  try {
    // better-sqlite3's backup() uses SQLite's online backup API — safe to run
    // against a live WAL-mode database without corrupting it.
    await db.backup(tmpFile);
    const data = fs.readFileSync(tmpFile);
    res.setHeader("Content-Type", "application/octet-stream");
    res.send(data);
  } catch (e) {
    console.error("[admin] backup failed:", e.message);
    res.status(500).json({ error: "backup_failed" });
  } finally {
    fs.unlink(tmpFile, () => {});
  }
});
