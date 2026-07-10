import express from "express";
import crypto from "node:crypto";
import { z } from "zod";
import { db } from "./db.js";
import { requireAuth } from "./auth.js";

export const runsRouter = express.Router();

const num = z.number().finite();
const runSchema = z.object({
  playerName: z.string().max(120).optional(),
  runName: z.string().max(120).optional(),
  preset: z.string().max(40).optional(),
  config: z.any().optional(),
  seed: z.number().int().optional(),
  score: z.object({
    final: num,
    band: z.string().max(40).optional(),
    delivery: num.optional(),
    alignment: num.optional(),
    efficiency: num.optional(),
    benefits: num.optional(),
    raw: num.optional(),
    penalty: num.optional(),
    completed: num.optional(),
    abandoned: num.optional(),
    expired: num.optional(),
    arcReductions: num.optional(),
    insolvent: z.boolean().optional(),
    benefitsBU: num.optional(),
    benefitsPotentialBU: num.optional(),
  }),
  endMonth: z.number().int().optional(),
  startedAt: z.number().int().optional(),
  endedAt: z.number().int().optional(),
  durationSeconds: z.number().int().nonnegative().optional(),
});

const insertRun = db.prepare(`
  INSERT INTO runs (
    id, user_email, player_name, run_name, preset, config_json, seed,
    score_final, band, delivery, alignment, efficiency, benefits, raw, penalty,
    completed, abandoned, expired, arc_reductions, insolvent, end_month,
    benefits_bu, benefits_potential_bu, started_at, ended_at, duration_seconds,
    ip, user_agent, created_at
  ) VALUES (
    @id, @email, @playerName, @runName, @preset, @config, @seed,
    @final, @band, @delivery, @alignment, @efficiency, @benefits, @raw, @penalty,
    @completed, @abandoned, @expired, @arcReductions, @insolvent, @endMonth,
    @benefitsBU, @benefitsPotentialBU, @startedAt, @endedAt, @durationSeconds,
    @ip, @ua, @createdAt
  )
`);

runsRouter.post("/runs", requireAuth, (req, res) => {
  const parsed = runSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_run", detail: parsed.error.flatten() });
  const d = parsed.data;
  const s = d.score;
  const id = crypto.randomUUID();

  insertRun.run({
    id,
    email: req.user.email,
    playerName: d.playerName ?? null,
    runName: d.runName ?? null,
    preset: d.preset ?? null,
    config: d.config != null ? JSON.stringify(d.config) : null,
    seed: d.seed ?? null,
    final: s.final,
    band: s.band ?? null,
    delivery: s.delivery ?? null,
    alignment: s.alignment ?? null,
    efficiency: s.efficiency ?? null,
    benefits: s.benefits ?? null,
    raw: s.raw ?? null,
    penalty: s.penalty ?? null,
    completed: s.completed ?? null,
    abandoned: s.abandoned ?? null,
    expired: s.expired ?? null,
    arcReductions: s.arcReductions ?? null,
    insolvent: s.insolvent ? 1 : 0,
    endMonth: d.endMonth ?? null,
    benefitsBU: s.benefitsBU ?? null,
    benefitsPotentialBU: s.benefitsPotentialBU ?? null,
    startedAt: d.startedAt ?? null,
    endedAt: d.endedAt ?? null,
    durationSeconds: d.durationSeconds ?? null,
    ip: req.ip ?? null,
    ua: (req.headers["user-agent"] || "").slice(0, 300),
    createdAt: new Date().toISOString(),
  });

  res.json({ ok: true, id });
});

runsRouter.get("/leaderboard", (req, res) => {
  const preset = String(req.query.preset || "all");
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
  const filtered = preset && preset !== "all";
  const rows = db
    .prepare(`
      SELECT player_name AS playerName, run_name AS runName, preset,
             score_final AS score, band, delivery, alignment, efficiency,
             completed, abandoned, expired,
             ended_at AS endedAt, duration_seconds AS durationSeconds
      FROM runs
      ${filtered ? "WHERE preset = ?" : ""}
      ORDER BY score_final DESC
      LIMIT ?
    `)
    .all(...(filtered ? [preset, limit] : [limit]));
  res.json({ rows });
});
