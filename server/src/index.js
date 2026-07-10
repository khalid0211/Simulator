import "./env.js"; // must be the first import — loads .env before other local modules
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { authRouter } from "./auth.js";
import { runsRouter } from "./runs.js";
import { adminRouter } from "./admin.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.set("trust proxy", 1); // sits behind a reverse proxy (Traefik/nginx) in production
app.use(express.json({ limit: "256kb" }));

// The frontend and API are deployed as separate Coolify apps on different
// subdomains, so CORS must be enabled in production too (set CORS_ORIGIN to
// the frontend's origin, e.g. https://simulator.projectadvisor.cloud).
if (process.env.CORS_ORIGIN) {
  app.use(cors({ origin: process.env.CORS_ORIGIN.split(",").map((s) => s.trim()) }));
}

// Admin dashboard (password-gated by ADMIN_KEY, same origin as the API so no
// CORS is needed for its own requests).
app.get("/admin", (_req, res) => res.sendFile(path.join(__dirname, "..", "public", "admin.html")));

app.get("/api/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));
app.use("/api/auth", authRouter);
app.use("/api", runsRouter);
app.use("/api", adminRouter);

const PORT = Number(process.env.PORT || 4000);
// Bind to all interfaces: the container's own network boundary provides the
// isolation, and the reverse proxy must be able to reach this port.
app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `[sim-server] listening on 0.0.0.0:${PORT} (NODE_ENV=${process.env.NODE_ENV || "development"})`
  );
});
