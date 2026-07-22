/* ============================================================
   Development Map — palette, height metrics, scene chrome
   Pure data + pure functions. No three.js, no React, no engine
   imports — safe to unit-test in isolation.
   ============================================================ */

/* ---- Status colours -------------------------------------------------------
   One distinct colour per simulator state. These are deliberately theme
   INDEPENDENT: a completed project reads green in light or dark mode. Only
   scene chrome (see SCENE_CHROME) follows the app theme. The simulator's own
   THEMES palette has no `pending` colour and reuses grey for abandoned, so the
   map keeps its own 7-way palette rather than borrowing from the app. ---- */
export const STATE_COLORS = {
  available: "#5B6472", // slate grey  — in the pool, not yet selected
  pending:   "#8A6FE8", // violet      — approved, waiting out the approval lag
  active:    "#2563EB", // blue        — drawing funds on its S-curve
  suspended: "#D97706", // amber       — paused
  completed: "#059669", // green       — delivered
  abandoned: "#D1483F", // red         — cancelled
  expired:   "#7A6A57", // brown       — unfinished at Month 60
};

/* Legend order + human labels. `expired` and `abandoned` are terminal. */
export const STATE_ORDER = [
  "available", "pending", "active", "suspended", "completed", "abandoned", "expired",
];

export const STATE_LABELS = {
  available: "Available",
  pending:   "Pending",
  active:    "Active",
  suspended: "Suspended",
  completed: "Completed",
  abandoned: "Abandoned",
  expired:   "Expired",
};

export const stateColor = (state) => STATE_COLORS[state] || STATE_COLORS.available;

/* ---- Height metrics -------------------------------------------------------
   Each metric is a stable magnitude comparable across all 30 projects
   regardless of state, so the city keeps a consistent skyline as the run
   progresses:
     · BAC      — budget at stake; bacCurrent is 0 until a project is added,
                  so fall back to bacInitial to keep available plots meaningful.
     · ARC      — potential monthly recurring cost = bac × arcRate / 12. Uses
                  the same bac fallback. 0 when the category has no ARC rate.
     · BU       — Benefit Units/month; buRate is set for every project at sim
                  creation, so it is always populated.
     · Duration — months to build; durationCurrent is null until added.
   Accessors never read sim.month, so a building's height only changes when the
   user switches metric — not every tick. ---- */
const bacOf = (p) => p.bacCurrent || p.bacInitial || 0;

export const HEIGHT_METRICS = [
  { key: "bac",      label: "Budget (BAC)",   unit: "$M",   accessor: (p) => bacOf(p) },
  { key: "arc",      label: "ARC / month",    unit: "$M",   accessor: (p) => bacOf(p) * (p.arcRate || 0) / 12 },
  { key: "bu",       label: "Benefit Units",  unit: "BU/mo", accessor: (p) => p.buRate || 0 },
  { key: "duration", label: "Duration",       unit: "mo",   accessor: (p) => p.durationCurrent || p.durationPlanned || 0 },
];

export const DEFAULT_METRIC = "bac";

export const metricByKey = (key) =>
  HEIGHT_METRICS.find((m) => m.key === key) || HEIGHT_METRICS[0];

/* World-space building heights. FLAT is the height of a plot whose metric is
   zero or disabled (e.g. BU with benefits off, ARC with no rate) — it renders
   as a near-flat pad, visibly "not a building", never invisible. */
export const FLAT_HEIGHT = 0.15;
export const MIN_HEIGHT = 0.8;
export const MAX_HEIGHT = 8;

/* Build a scale from a metric key + the current project list. Returns a
   function project -> height. Anchored at 0 so magnitudes stay honest: a
   project with twice the BAC is (roughly) twice as tall. */
export function makeHeightScale(metricKey, projects) {
  const { accessor } = metricByKey(metricKey);
  let max = 0;
  for (const p of projects) {
    const v = accessor(p);
    if (v > max) max = v;
  }
  return (p) => {
    if (max <= 0) return FLAT_HEIGHT;
    const v = accessor(p);
    if (v <= 0) return FLAT_HEIGHT;
    return MIN_HEIGHT + (v / max) * (MAX_HEIGHT - MIN_HEIGHT);
  };
}

/* ---- Risk rating ----------------------------------------------------------
   The simulator stores risk as two factors (costRisk + durRisk, each
   0.05–0.20). Collapse to a low/medium/high label for the inspector. ---- */
export function riskLevel(p) {
  const combined = (p.costRisk || 0) + (p.durRisk || 0);
  if (combined < 0.20) return "low";
  if (combined <= 0.30) return "medium";
  return "high";
}

/* ---- Scene chrome (theme-aware) -------------------------------------------
   Background, ground, grid and lighting for the 3D scene. These DO follow the
   app's light/dark toggle. Status colours above do not. ---- */
export const SCENE_CHROME = {
  light: {
    background: "#eef2f8",
    ground:     "#dbe3ef",
    grid:       "#c2ccdb",
    ambient:    0.85,
    directional: 0.75,
    hudText:    "#16202e",
    hudMuted:   "#566379",
  },
  dark: {
    background: "#0a1019",
    ground:     "#0e1626",
    grid:       "#21304a",
    ambient:    0.55,
    directional: 0.9,
    hudText:    "#e6edf7",
    hudMuted:   "#8da3c0",
  },
};

export const sceneChrome = (theme) => SCENE_CHROME[theme] || SCENE_CHROME.light;
