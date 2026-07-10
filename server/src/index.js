import "dotenv/config";
import express from "express";
import cors from "cors";
import { authRouter } from "./auth.js";
import { runsRouter } from "./runs.js";

const app = express();
app.set("trust proxy", 1); // sits behind nginx in production
app.use(express.json({ limit: "256kb" }));

// CORS is only needed for cross-origin local dev. In production the SPA and API
// share an origin (nginx), so leave CORS_ORIGIN blank there.
if (process.env.CORS_ORIGIN) {
  app.use(cors({ origin: process.env.CORS_ORIGIN.split(",").map((s) => s.trim()) }));
}

app.get("/api/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));
app.use("/api/auth", authRouter);
app.use("/api", runsRouter);

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, "127.0.0.1", () => {
  console.log(
    `[sim-server] listening on http://127.0.0.1:${PORT} (NODE_ENV=${process.env.NODE_ENV || "development"})`
  );
});
