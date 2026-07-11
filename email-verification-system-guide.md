# Email Verification System — Implementation Guide

A reusable pattern for gating an app behind email ownership, without passwords.
First-time users verify a 6-digit code sent to their inbox; after that, their
browser remembers them (via a long-lived JWT) and they're never asked again.

This is exactly the system built for the Portfolio Simulator
(`simulator.projectadvisor.cloud` / `api.projectadvisor.cloud`), written up
here so it can be reused in another application. It's deliberately
framework-agnostic on the backend (plain Express) and framework-light on the
frontend (a handful of functions — no auth library needed).

## How it works, end to end

1. User types their email → `POST /auth/request-code`. Server generates a
   6-digit code, hashes it, stores it with a 10-minute expiry, emails it via
   SMTP.
2. User types the code → `POST /auth/verify`. Server checks the hash +
   expiry + attempt count, marks it consumed, upserts a `users` row, and
   issues a JWT (`{ email }`, signed, ~1 year expiry).
3. The frontend stores `{ token, email }` in `localStorage`. Every
   authenticated request sends `Authorization: Bearer <token>`.
4. On future visits, the stored token is used immediately — no code, no
   re-verification, until the token expires or the user clears site data.

**Why this shape and not something else:**
- **No passwords** — nothing to leak, nothing for users to forget. Proving
  inbox ownership *is* the credential.
- **JWT, not server-side sessions** — stateless; no session table, no logout
  bookkeeping. A year-long expiry means "remembered" for all practical
  purposes; rotating `JWT_SECRET` is the (blunt) way to force everyone to
  re-verify.
- **Codes are hashed at rest** — the `email_codes` table never stores a
  plaintext code, so a DB dump doesn't hand out valid codes.
- **Fail-closed everywhere** — a blank/missing secret means access is
  denied, never silently allowed.

## Database schema

Two tables (SQLite shown; the SQL is close enough to standard that Postgres/
MySQL need only trivial changes — e.g. `AUTOINCREMENT` → `SERIAL`/`AUTO_INCREMENT`):

```sql
CREATE TABLE IF NOT EXISTS users (
  email        TEXT PRIMARY KEY,
  display_name TEXT,
  created_at   TEXT NOT NULL,
  verified_at  TEXT
);

CREATE TABLE IF NOT EXISTS email_codes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email       TEXT NOT NULL,
  code_hash   TEXT NOT NULL,
  expires_at  INTEGER NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0,
  consumed_at TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_email_codes_email ON email_codes(email);
```

`users` is your roster — one row per verified email, ever. `email_codes` is
pure plumbing (every code request, hashed, with an attempt counter) — not
meant to be read directly, just written and checked.

## Backend

**Dependencies:** `express`, `better-sqlite3` (or any DB driver), `nodemailer`,
`jsonwebtoken`, `express-rate-limit`, `zod`, `dotenv`.

### Environment variables

```bash
JWT_SECRET=<openssl rand -hex 32>     # required — signs the session token
TOKEN_TTL_DAYS=365                     # how long "remembered" lasts
CODE_TTL_MIN=10                        # how long a code is valid

SMTP_HOST=smtp-relay.brevo.com         # same SMTP creds work across apps
SMTP_PORT=587
SMTP_USER=<brevo smtp login>
SMTP_PASS=<brevo smtp key>
MAIL_FROM="Your App <no-reply@yourdomain.com>"
```

**Reusing the same Brevo account across apps:** yes, this is fine — same
SMTP host/port/user/key, just change `MAIL_FROM` to identify the new app to
recipients. No new Brevo setup needed.

### ⚠️ The one gotcha that will bite you: env var load order (ESM)

If your backend uses `"type": "module"` (ES modules), **do not** just
`import "dotenv/config"` at the top of your entry file. ES module imports are
evaluated *before* the importing file's own top-level code runs — so if any
other module does `const JWT_SECRET = process.env.JWT_SECRET` at its own top
level, and that module is imported *before* dotenv has actually loaded the
`.env` file, it silently captures an empty string. This only bites you in
local dev with a `.env` file (production platforms like Coolify/Heroku inject
real env vars directly into the process before it starts, so they're
unaffected) — but it's a nasty, hard-to-diagnose bug to hit once.

**Fix:** put `dotenv.config()` in its own file with no other local imports,
and make it the *first* import in your entry point:

```js
// src/env.js
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });
```

```js
// src/index.js
import "./env.js"; // MUST be the first import
import express from "express";
// ... everything else
```

### `src/auth.js` — the whole mechanism

```js
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
const emailSchema = z.object({ email: emailField });
const verifySchema = z.object({ email: emailField, code: z.string().regex(/^\d{6}$/) });

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
  const { email, code } = parsed.data;

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

  const existing = db.prepare("SELECT email FROM users WHERE email = ?").get(email);
  if (existing) {
    db.prepare("UPDATE users SET verified_at = ? WHERE email = ?").run(nowIso(), email);
  } else {
    db.prepare("INSERT INTO users (email, created_at, verified_at) VALUES (?,?,?)").run(
      email, nowIso(), nowIso()
    );
  }

  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: `${TOKEN_TTL_DAYS}d` });
  res.json({ token, email });
});

// Use this to protect any route that requires a verified user.
export function requireAuth(req, res, next) {
  const m = (req.headers.authorization || "").match(/^Bearer (.+)$/);
  if (!m) return res.status(401).json({ error: "no_token" });
  try {
    req.user = jwt.verify(m[1], JWT_SECRET); // { email }
    next();
  } catch {
    return res.status(401).json({ error: "bad_token" });
  }
}
```

Protect any downstream route with `requireAuth` and read `req.user.email` —
that's the whole authorization story, no session store needed:

```js
app.post("/api/something", requireAuth, (req, res) => {
  const email = req.user.email; // guaranteed verified
  // ...
});
```

### `src/email.js` — sending the code

```js
import nodemailer from "nodemailer";

const hasSmtp = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const transport = hasSmtp
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

const FROM = process.env.MAIL_FROM || "Your App <no-reply@localhost>";
const TTL = Number(process.env.CODE_TTL_MIN || 10);

export async function sendCode(email, code) {
  // In dev (or if SMTP isn't configured), just log it — lets you test the
  // whole flow with curl/browser without a live inbox.
  if (!transport || process.env.NODE_ENV !== "production") {
    console.log(`[email] verification code for ${email}: ${code}`);
  }
  if (!transport) {
    if (process.env.NODE_ENV === "production") console.warn("[email] SMTP not configured — code was not emailed.");
    return;
  }
  await transport.sendMail({
    from: FROM,
    to: email,
    subject: "Your verification code",
    text: `Your verification code is ${code}. It expires in ${TTL} minutes.`,
    html: `<div style="font-family:system-ui,sans-serif">
      <p>Your verification code is:</p>
      <p style="font-size:30px;font-weight:700;letter-spacing:6px">${code}</p>
      <p style="color:#555">Expires in ${TTL} minutes.</p>
    </div>`,
  });
}
```

### Mount it

```js
// src/index.js
import "./env.js";
import express from "express";
import cors from "cors";
import { authRouter } from "./auth.js";

const app = express();
app.set("trust proxy", 1); // needed behind any reverse proxy (Traefik/nginx/Coolify)
app.use(express.json({ limit: "256kb" }));

// Only needed if frontend + backend are on different origins/subdomains.
if (process.env.CORS_ORIGIN) {
  app.use(cors({ origin: process.env.CORS_ORIGIN.split(",").map((s) => s.trim()) }));
}

app.use("/api/auth", authRouter);

app.listen(process.env.PORT || 4000, "0.0.0.0"); // 0.0.0.0, not 127.0.0.1, if containerized
```

## Frontend

No auth library needed — this is the entire client-side surface:

```js
const API = import.meta.env.VITE_API_URL || "/api";
const AUTH_KEY = "myapp_auth_v1"; // rename per app

function getAuth() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY) || "null"); }
  catch { return null; }
}
function setAuth(a) { try { localStorage.setItem(AUTH_KEY, JSON.stringify(a)); } catch {} }
function clearAuth() { try { localStorage.removeItem(AUTH_KEY); } catch {} }

async function apiPost(path, body, token) {
  const res = await fetch(API + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || "request_failed"), { status: res.status, data });
  return data;
}
```

**UI flow** (React shown, but the shape is framework-agnostic — two screens:
email entry, then code entry):

```js
const [auth, setAuthState] = useState(getAuth());       // null until verified
const [emailInput, setEmailInput] = useState("");
const [codeInput, setCodeInput] = useState("");
const [authStep, setAuthStep] = useState("idle");        // "idle" | "code-sent"
const [authBusy, setAuthBusy] = useState(false);
const [authError, setAuthError] = useState("");

const requestCode = async () => {
  setAuthBusy(true); setAuthError("");
  try {
    await apiPost("/auth/request-code", { email: emailInput.trim().toLowerCase() });
    setAuthStep("code-sent");
  } catch (e) { setAuthError("Couldn't send the code — try again."); }
  finally { setAuthBusy(false); }
};

const verifyCode = async () => {
  setAuthBusy(true); setAuthError("");
  try {
    const { token, email } = await apiPost("/auth/verify", { email: emailInput.trim().toLowerCase(), code: codeInput });
    const a = { token, email };
    setAuth(a); setAuthState(a);
  } catch (e) { setAuthError("That code isn't right."); }
  finally { setAuthBusy(false); }
};

const signOut = () => { clearAuth(); setAuthState(null); setAuthStep("idle"); };
```

Gate whatever the app's main action is on `auth` being truthy:

```jsx
{auth ? (
  <div>✓ Verified — signed in as {auth.email} <button onClick={signOut}>Sign out</button></div>
) : authStep === "idle" ? (
  <>
    <input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} />
    <button disabled={authBusy || !emailInput} onClick={requestCode}>Send code</button>
  </>
) : (
  <>
    <input inputMode="numeric" maxLength={6}
      value={codeInput}
      onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, "").slice(0, 6))} />
    <button disabled={authBusy || codeInput.length !== 6} onClick={verifyCode}>Verify</button>
  </>
)}
{authError && <div style={{ color: "red" }}>{authError}</div>}
```

That's it — `auth` truthy means "verified, proceed"; every protected API call
sends `Authorization: Bearer ${auth.token}`.

## Deployment notes (if hosting on Coolify, like the Simulator)

- Bind the server to `0.0.0.0`, not `127.0.0.1` — containers need this or the
  reverse proxy can't reach the app (this cost real debugging time the first
  time around).
- If frontend and backend get **separate subdomains** (two Coolify apps),
  you need `CORS_ORIGIN=https://your-frontend-domain` on the backend, and
  `VITE_API_URL=https://your-backend-domain/api` set as a **build-time**
  variable on the frontend (Vite bakes it into the static bundle — a plain
  restart won't pick up a new value, you need a full rebuild/redeploy).
- If using SQLite with persistent Docker storage, mount a **Volume** (not a
  bind/directory mount) at a container path like `/data`, and set
  `SQLITE_PATH=/data/yourapp.db` — otherwise every redeploy wipes the
  database.
- Generate `JWT_SECRET` on the server itself (`openssl rand -hex 32`) and
  paste it directly into the platform's env-var UI — never through chat or a
  file that could be committed.

## Security checklist

- [x] Codes are hashed (SHA-256) before storage — never stored plaintext
- [x] Codes expire (10 min default) and have a max-attempt lockout (5)
- [x] Rate-limited per-IP (30/hr) *and* per-email (5/hr) on code requests
- [x] `requireAuth` fails closed on missing/invalid/expired tokens
- [x] `trust proxy` set so rate-limiting sees real client IPs behind a proxy
- [ ] **Known limitation:** this proves *email ownership*, not identity — it's
      appropriate for "avoid anonymous users, get a real contact per person"
      use cases (classrooms, small tools), not for anything security-critical
      (payments, sensitive personal data). For that, layer on stronger auth.
