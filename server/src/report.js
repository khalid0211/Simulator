import { db } from "./db.js";

const line = (ch = "-", n = 56) => ch.repeat(n);
const fmt = (ts) => (ts ? new Date(ts).toLocaleString() : "?");

const totalUsers = db.prepare("SELECT COUNT(*) c FROM users").get().c;
const totalRuns = db.prepare("SELECT COUNT(*) c FROM runs").get().c;

console.log(line("="));
console.log("PORTFOLIO SIMULATOR — USAGE REPORT");
console.log(line("="));
console.log(`Verified users:        ${totalUsers}`);
console.log(`Completed runs:        ${totalRuns}`);

if (totalRuns > 0) {
  console.log(`\n${line()}\nRuns by mode\n${line()}`);
  const byPreset = db
    .prepare(
      `SELECT preset, COUNT(*) runs, ROUND(AVG(score_final),1) avgScore, ROUND(AVG(duration_seconds)/60.0,1) avgMin
       FROM runs GROUP BY preset ORDER BY runs DESC`
    )
    .all();
  for (const r of byPreset) {
    console.log(`  ${(r.preset || "custom").padEnd(10)} runs: ${String(r.runs).padEnd(4)} avg score: ${String(r.avgScore).padEnd(6)} avg time: ${r.avgMin} min`);
  }

  console.log(`\n${line()}\nTop 10 scores\n${line()}`);
  const top = db
    .prepare(
      `SELECT player_name, user_email, preset, score_final, band, ended_at
       FROM runs ORDER BY score_final DESC LIMIT 10`
    )
    .all();
  top.forEach((r, i) => {
    console.log(`  ${String(i + 1).padStart(2)}. ${r.score_final?.toFixed(1)} ${(r.band || "").padEnd(20)} ${r.player_name} <${r.user_email}> [${r.preset}] — ${fmt(r.ended_at)}`);
  });

  console.log(`\n${line()}\nMost recent 10 runs\n${line()}`);
  const recent = db
    .prepare(
      `SELECT player_name, user_email, preset, score_final, band, ended_at
       FROM runs ORDER BY ended_at DESC LIMIT 10`
    )
    .all();
  for (const r of recent) {
    console.log(`  ${fmt(r.ended_at)} — ${r.player_name} <${r.user_email}> — ${r.score_final?.toFixed(1)} ${r.band} [${r.preset}]`);
  }
}

console.log(`\n${line()}\nAll verified users\n${line()}`);
const users = db.prepare("SELECT email, created_at, verified_at FROM users ORDER BY created_at DESC").all();
if (!users.length) console.log("  (none yet)");
for (const u of users) {
  console.log(`  ${u.email.padEnd(35)} first seen ${fmt(u.created_at)}`);
}

console.log(`\n${line("=")}`);
