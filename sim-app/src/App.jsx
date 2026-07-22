import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ReferenceArea, ResponsiveContainer, ComposedChart, Cell,
} from "recharts";
import {
  Play, Save, FolderOpen, ChevronRight, AlertTriangle, Pause,
  Trash2, RotateCcw, Gauge, Plus, X, TrendingUp, BarChart3,
  Activity, LayoutGrid, Flag, ArrowRight, Award, Lightbulb, Sun, Moon,
  FastForward, Rewind, BookOpen, FileText, Loader, Eye, Target, Zap,
  MoreHorizontal, CheckCheck, Building2,
} from "lucide-react";

const DevelopmentMapTab = lazy(() => import("./devmap/DevelopmentMapTab.jsx"));

/* ============================================================
   THEME — portfolio-controls panel (light default, dark optional)
   ============================================================ */
const THEMES = {
  light: {
    bg: "#f4f6fb", panel: "#ffffff", panel2: "#eef2f8",
    line: "#d6deea", lineSoft: "#e6ecf5",
    text: "#16202e", muted: "#566379", faint: "#8a97ab",
    action: "#4f46e5", actionDim: "#c7c9f5",
    available: "#94a3b8", active: "#2563eb", suspended: "#d97706",
    completed: "#059669", abandoned: "#94a3b8", expired: "#e11d48",
    arc: "#9333ea",
    scrim: "#1e293b99", shadow: "0 18px 50px #1e293b33",
  },
  dark: {
    bg: "#0a1019", panel: "#111a2b", panel2: "#0e1626",
    line: "#21304a", lineSoft: "#1a2740",
    text: "#e6edf7", muted: "#8da3c0", faint: "#5f7290",
    action: "#7c83ff", actionDim: "#3b3f7a",
    available: "#64748b", active: "#3b82f6", suspended: "#f59e0b",
    completed: "#10b981", abandoned: "#475569", expired: "#f43f5e",
    arc: "#c084fc",
    scrim: "#04070cdd", shadow: "0 24px 60px #000a",
  },
};
const T = { ...THEMES.light };
function applyTheme(name) { Object.assign(T, THEMES[name] || THEMES.light); }

const sc = (k) => T[k];                                   // state colour, live

/* ---- per-project identity palette: one stable colour per project, shared across
   every chart (cash-flow stacks, Gantt, S-curves). Indexed by the project's position
   in the UNFILTERED sim.projects array so the colour never changes with state. ---- */
const PROJECT_PALETTE = ["#3498db", "#667eea", "#28a745", "#6f42c1", "#e67e22", "#17a2b8", "#e83e8c", "#20c997"];
const projectColor = (i) => PROJECT_PALETTE[((i % PROJECT_PALETTE.length) + PROJECT_PALETTE.length) % PROJECT_PALETTE.length];
const projectColorById = (sim, id) => projectColor(sim.projects.findIndex((p) => p.id === id));
/* semantic funding colours (match across charts, table, callout) */
const FUND_OK = "#28a745";       // cumulative funding / positive headroom
const FUND_BAD = "#dc3545";      // cumulative requirement / shortfall / overload
const FUND_BAND = "rgba(220,53,69,0.12)";
const SPEND_NORMAL = "#7cb9e8";  // light blue — project spending at normal pace
const SPEND_SLOWED = "#fdba74";  // light orange — spending of slowed-down projects
const dc = (t) => ({ add: T.completed, slow: T.suspended, speed: T.active, suspend: T.suspended, resume: T.active, abandon: T.expired, arc_reduce: T.arc, arc_restore: T.action, arc_cutoff: T.expired }[t] || T.muted);
const STATE_LABEL = {
  available: "Available", active: "Active", suspended: "Suspended",
  completed: "Completed", abandoned: "Abandoned", expired: "Expired",
};

const money = (n) =>
  n == null ? "—" : "$" + (n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "M";
const pct = (n) => (n * 100).toFixed(0) + "%";
const mono = { fontVariantNumeric: "tabular-nums", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" };

/* ============================================================
   ENGINE — pure simulation logic (verified separately)
   ============================================================ */
const betaCDF = (x) => 3 * x * x - 2 * x * x * x;            // a=b=2
function generateSCurve(budget, duration) {
  const d = Math.max(1, Math.round(duration));
  const c = [];
  for (let t = 1; t <= d; t++) c.push(budget * (betaCDF(t / d) - betaCDF((t - 1) / d)));
  return c;
}
const inflator = (rate, n) => Math.pow(1 + rate, n);
const CRASH_K = 0.5;   // crash premium: compressing time by factor a adds (CRASH_K*a) to remaining cost

function mkRng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

const TITLE_A = ["Digital", "Integrated", "Provincial", "Regional", "Smart", "Unified", "Rural", "Urban", "National", "Coastal", "Metro", "Strategic"];

/* ---- Annual Recurring Cost (ARC) reference table — median ARC as a fraction of BAC ---- */
const ARC_CATEGORIES = [
  { category: "Physical Infrastructure & Transport",     subCategory: "Paved Roads & Highways",             arcRate: 0.0500 },
  { category: "Physical Infrastructure & Transport",     subCategory: "Feeder & Rural Roads",               arcRate: 0.1000 },
  { category: "Physical Infrastructure & Transport",     subCategory: "Buildings (Administrative)",         arcRate: 0.0200 },
  { category: "Physical Infrastructure & Transport",     subCategory: "Large-Scale Dams & Reservoirs",       arcRate: 0.0150 },
  { category: "Social Sectors (Education & Health)",     subCategory: "Primary & Secondary Schools",        arcRate: 0.1950 },
  { category: "Social Sectors (Education & Health)",     subCategory: "Polytechnic & Technical Schools",    arcRate: 0.2100 },
  { category: "Social Sectors (Education & Health)",     subCategory: "General & Tertiary Hospitals",       arcRate: 0.2700 },
  { category: "Social Sectors (Education & Health)",     subCategory: "Rural Health Centers",               arcRate: 0.4900 },
  { category: "Agriculture, Irrigation & Resources",     subCategory: "Irrigation & Drainage Systems",      arcRate: 0.0300 },
  { category: "Agriculture, Irrigation & Resources",     subCategory: "Agricultural Research & Extension",  arcRate: 0.0475 },
  { category: "Agriculture, Irrigation & Resources",     subCategory: "Livestock & Veterinary Services",     arcRate: 0.1050 },
  { category: "Agriculture, Irrigation & Resources",     subCategory: "Forestry & Watershed Development",    arcRate: 0.0250 },
];

/* ---- Social Benefits — BU (Benefit Units) per $1M of BAC per month, before risk premium ---- */
const BU_INTENSITY = {
  "Paved Roads & Highways":            0.8,
  "Feeder & Rural Roads":              1.0,
  "Buildings (Administrative)":        0.3,
  "Large-Scale Dams & Reservoirs":     0.6,
  "Primary & Secondary Schools":       1.6,
  "Polytechnic & Technical Schools":   1.4,
  "General & Tertiary Hospitals":      2.0,
  "Rural Health Centers":              1.8,
  "Irrigation & Drainage Systems":     1.1,
  "Agricultural Research & Extension": 0.9,
  "Livestock & Veterinary Services":   0.9,
  "Forestry & Watershed Development":  0.7,
};
const BU_VALUE = 0.02; // $M of "social value" per BU, display only — does not touch the cash budget

/* ---- category-flavoured noun phrases, combined with TITLE_A modifiers ---- */
const CATEGORY_TITLE_WORDS = {
  "Paved Roads & Highways":            ["Highway Corridor", "Paved Road Network", "Arterial Road Upgrade"],
  "Feeder & Rural Roads":              ["Feeder Road Programme", "Rural Access Roads", "Farm-to-Market Road Link"],
  "Buildings (Administrative)":        ["Administrative Complex", "Government Office Building", "Civic Centre"],
  "Large-Scale Dams & Reservoirs":     ["Dam & Reservoir Scheme", "Multipurpose Dam Project", "Water Storage Reservoir"],
  "Primary & Secondary Schools":       ["Schools Rehabilitation Programme", "Primary Schools Expansion", "Secondary Education Campus"],
  "Polytechnic & Technical Schools":   ["Polytechnic Institute", "Technical Training College", "Vocational Skills Campus"],
  "General & Tertiary Hospitals":      ["General Hospital", "Tertiary Care Hospital", "Medical Centre Upgrade"],
  "Rural Health Centers":              ["Rural Health Centre Network", "Basic Health Unit Programme", "Community Clinic Scheme"],
  "Irrigation & Drainage Systems":     ["Irrigation & Drainage Scheme", "Canal Irrigation Upgrade", "Drainage Improvement Project"],
  "Agricultural Research & Extension": ["Agricultural Research Station", "Extension Services Programme", "Crop Research Centre"],
  "Livestock & Veterinary Services":   ["Livestock Development Programme", "Veterinary Services Centre", "Animal Health Station"],
  "Forestry & Watershed Development":  ["Forestry & Watershed Programme", "Afforestation Scheme", "Watershed Management Project"],
};

function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* assign each of the 30 projects one of the 12 ARC sub-categories, spread as evenly as possible */
function assignCategories(rng) {
  const slots = [];
  while (slots.length < 30) slots.push(...shuffle(ARC_CATEGORIES, rng));
  return shuffle(slots.slice(0, 30), rng);
}

function genProjects(rng) {
  const categorySlots = assignCategories(rng);
  const usedTitles = new Set();
  const ps = [];
  for (let i = 0; i < 30; i++) {
    const { category, subCategory, arcRate } = categorySlots[i];
    const words = CATEGORY_TITLE_WORDS[subCategory];
    let title;
    do { title = `${TITLE_A[Math.floor(rng() * TITLE_A.length)]} ${words[Math.floor(rng() * words.length)]}`; }
    while (usedTitles.has(title) && usedTitles.size < TITLE_A.length * words.length);
    usedTitles.add(title);
    ps.push({
      id: "P" + String(i + 1).padStart(2, "0"),
      title,
      category, subCategory, arcRate,
      bacInitial: +(2 + rng() * 13).toFixed(2),       // $2M–$15M
      alignment: +(0.20 + rng() * 0.80).toFixed(2),    // 0.20–1.00
      durationPlanned: 12 + Math.floor(rng() * 25),    // 12–36
      costRisk: +(0.05 + rng() * 0.15).toFixed(3),     // 0.05–0.20
      durRisk: +(0.05 + rng() * 0.15).toFixed(3),
      state: "available",
      startMonth: null, completionMonth: null,
      bacCurrent: 0, nominalSpent: 0, cashDrawn: 0,
      durationCurrent: null,
      sCurve: [], sCurveBaseline: [],
      milestones: [],         // triggered thresholds e.g. [25,50]
      suspendPenalty: 0,
      arcBaseBac: 0,          // frozen bacCurrent at completion, base for ARC calc
      arcReduced: false,      // funding cut 30% to relieve a shortfall
      arcBacklog: 0,          // $ owed to restore full ARC funding
      arcReductionCount: 0,   // times this project's ARC has ever been reduced (permanent score penalty)
      arcCutoff: false,       // funding fully cut off — project moved to abandoned, benefits go negative
      buRate: 0,              // Benefit Units/month once completed and fully funded (set in newSim, after risk multiplier)
      buCumulative: 0,        // running total BU generated (can go negative under full cutoff)
    });
  }
  return ps;
}

function maxCompletions(projects, totalBudget) {
  const sorted = projects.map((p) => p.bacInitial).sort((a, b) => a - b);
  let cum = 0, c = 0;
  for (const b of sorted) { if (cum + b <= totalBudget) { cum += b; c++; } else break; }
  return c;
}

/* ---- release schedule (20 quarters) ---- */
function computeReleaseSchedule(totalBudget, profile, rng2, N = 20) {
  const norm = (w) => { const s = w.reduce((a, b) => a + b, 0); return w.map((v) => +(v * totalBudget / s).toFixed(4)); };
  if (profile === "scurve") {
    const w = Array.from({ length: N }, (_, i) => betaCDF((i + 1) / N) - betaCDF(i / N));
    return norm(w);
  }
  if (profile === "frontloaded") return norm(Array.from({ length: N }, (_, i) => N - i));
  if (profile === "backloaded")  return norm(Array.from({ length: N }, (_, i) => i + 1));
  if (profile === "volatile") {
    const w = Array.from({ length: N }, () => 0.8 + rng2() * 0.4);
    return norm(w);
  }
  return Array(N).fill(+(totalBudget / N).toFixed(4)); // flat
}

function newSim(cfg) {
  const {
    name = "Untitled run",
    playerName = "Anonymous",
    preset = "custom",
    annualRate = 0.03,
    fundingProfile = "flat",
    budgetTightness = 1.5,
    politicalProjects = 0,
    concurrentCap = 0,
    approvalLag = 0,
    riskMultiplier = 1.0,
    blindAlignment = false,
    blindScore = false,
    fundingFrequency = 3,
    arcEnabled = true,
    benefitsEnabled = false,
  } = cfg;
  const seed = Math.floor(Math.random() * 1e9);
  const rng = mkRng(seed);
  let projects = genProjects(rng);
  // apply risk multiplier
  projects.forEach((p) => {
    p.costRisk = Math.min(0.40, +(p.costRisk * riskMultiplier).toFixed(3));
    p.durRisk  = Math.min(0.40, +(p.durRisk  * riskMultiplier).toFixed(3));
    p.buRate = +(p.bacInitial * (BU_INTENSITY[p.subCategory] || 1) * (1 + p.costRisk + p.durRisk)).toFixed(2);
  });
  const totalBudget = +(projects.reduce((a, p) => a + p.bacInitial, 0) / budgetTightness).toFixed(2);
  const N = Math.round(60 / fundingFrequency);
  const releaseSchedule = computeReleaseSchedule(totalBudget, fundingProfile, rng, N);
  const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
  // force political projects into portfolio at start (lowest alignment, cannot abandon before M24)
  if (politicalProjects > 0) {
    const sorted = [...projects].sort((a, b) => a.alignment - b.alignment);
    sorted.slice(0, politicalProjects).forEach((pp) => {
      const p = projects.find((x) => x.id === pp.id);
      const bac = +(p.bacInitial).toFixed(4);               // no inflation at month 1
      p.bacCurrent = bac;
      p.sCurve = generateSCurve(bac, p.durationPlanned);
      p.sCurveBaseline = p.sCurve.slice();
      p.state = "active";
      p.startMonth = 1;
      p.durationCurrent = p.durationPlanned;
      p.political = true;
      p.lockUntil = 24;
    });
  }
  const sim = {
    name, seed,
    playerName,
    month: 1,
    annualRate, monthlyRate,
    totalBudget,
    releaseSchedule,
    quarterlyRelease: releaseSchedule[0],         // Q1 amount (for display compat)
    released: releaseSchedule[0],
    availableBalance: releaseSchedule[0],
    maxComp: maxCompletions(projects, totalBudget),
    projects,
    events: [], decisions: [], alerts: [], history: [],
    status: "running",
    startedAt: Date.now(),
    config: { fundingProfile, fundingFrequency, budgetTightness, politicalProjects, concurrentCap, approvalLag, riskMultiplier, blindAlignment, blindScore, preset, arcEnabled, benefitsEnabled },
  };
  return sim;
}

const clone = (sim) => JSON.parse(JSON.stringify(sim));
const actives = (sim) => sim.projects.filter((p) => p.state === "active");
function demandAt(sim, month) {
  return actives(sim).reduce((a, p) => a + (p.sCurve[0] || 0) * inflator(sim.monthlyRate, month), 0);
}

/* ---- Annual Recurring Cost (ARC) — kicks in the month after completion, steps up by
   the sim's inflation rate once per elapsed year (not continuously compounded like capex) ---- */
function arcFullMonthlyFor(p, month, annualRate) {
  if (!p.arcRate || !p.completionMonth || month <= p.completionMonth) return 0;
  const elapsed = month - p.completionMonth;        // 1, 2, 3... months since completion
  const yearIdx = Math.floor((elapsed - 1) / 12);
  return (p.arcBaseBac * p.arcRate / 12) * Math.pow(1 + annualRate, yearIdx);
}
function arcMonthlyFor(p, month, annualRate) {
  const full = arcFullMonthlyFor(p, month, annualRate);
  return p.arcReduced ? full * 0.7 : full;
}
function arcDemandAt(sim, month) {
  return sim.projects.reduce((a, p) => a + arcMonthlyFor(p, month, sim.annualRate), 0);
}
/* ---- shortfall relief: cut a completed project's ARC funding 30%, at a permanent -2 score
   penalty; restoring requires repaying the accumulated 30% shortfall as a lump sum. Capped at
   2 reductions per project (lifetime, restores don't reset the count) — beyond that, the lever
   is exhausted and cutArcCompletely (abandon) is the only remaining option. ---- */
function reduceArcFunding(sim, id) {
  const p = sim.projects.find((x) => x.id === id);
  if (!p || p.state !== "completed" || p.arcReduced || (p.arcReductionCount || 0) >= 2) return;
  p.arcReduced = true;
  p.arcReductionCount = (p.arcReductionCount || 0) + 1;
  sim.decisions.push({ month: sim.month, type: "arc_reduce", id, title: p.title });
}
function restoreArcFunding(sim, id) {
  const p = sim.projects.find((x) => x.id === id);
  if (!p || !p.arcReduced) return;
  const backlog = p.arcBacklog || 0;
  if (sim.availableBalance + 1e-6 < backlog) return;
  sim.availableBalance = +(sim.availableBalance - backlog).toFixed(6);
  p.arcReduced = false;
  p.arcBacklog = 0;
  sim.decisions.push({ month: sim.month, type: "arc_restore", id, title: p.title });
}
/* ---- full ARC cutoff: once a project has used both its lifetime ARC reductions, the only
   funding-shortfall lever left is to abandon it outright. It moves to abandoned (dropping its
   Delivery credit and counting its BAC as wasted via the existing abandoned/sunk-cost scoring
   path) and its benefits flip permanently negative. ---- */
function cutArcCompletely(sim, id) {
  const p = sim.projects.find((x) => x.id === id);
  if (!p || p.state !== "completed") return;
  p.state = "abandoned";
  p.arcCutoff = true;
  p.arcReduced = false;
  p.arcBacklog = 0;
  sim.decisions.push({ month: sim.month, type: "arc_cutoff", id, title: p.title });
}

/* ---- Social Benefits (BU) — kicks in the month after completion, same lag as ARC.
   Reduced ARC funding costs benefits at 2x the funding cut; a full cutoff flips generation
   negative at 1.5x the normal rate for the rest of the run. ---- */
const isBenefitTracked = (p) => p.state === "completed" || (p.state === "abandoned" && p.arcCutoff);
function benefitMonthlyFor(p, month) {
  if (!p.buRate || !p.completionMonth || month <= p.completionMonth) return 0;
  if (p.arcCutoff) return -1.5 * p.buRate;
  return p.arcReduced ? p.buRate * 0.4 : p.buRate;
}
function benefitPotentialFor(p, uptoMonth) {
  if (!p.buRate || !p.completionMonth) return 0;
  return p.buRate * Math.max(0, uptoMonth - p.completionMonth);
}
function totalDemandAt(sim, month) {
  const arc = sim.config?.arcEnabled ? arcDemandAt(sim, month) : 0;
  return demandAt(sim, month) + arc;
}

/* ---- project mutations (operate on a project object in place) ---- */
function rebaseline(p, newRemainingMonths, atMonth) {
  const remBudget = Math.max(0, p.bacCurrent - p.nominalSpent);
  p.sCurve = generateSCurve(remBudget, newRemainingMonths);
  const elapsed = atMonth - p.startMonth;
  p.durationCurrent = elapsed + p.sCurve.length;
}
function addProject(sim, id) {
  const p = sim.projects.find((x) => x.id === id);
  if (!p || p.state !== "available") return;
  // concurrent cap check (active + pending count)
  const cap = sim.config?.concurrentCap || 0;
  if (cap > 0) {
    const live = sim.projects.filter((x) => x.state === "active" || x.state === "pending").length;
    if (live >= cap) return;
  }
  const bac = +(p.bacInitial * inflator(sim.monthlyRate, sim.month)).toFixed(4);
  p.bacCurrent = bac;
  p.sCurveBaseline = [];
  const lag = sim.config?.approvalLag || 0;
  if (lag > 0) {
    p.state = "pending";
    p.pendingUntil = sim.month + lag;
    p.startMonth = null;
    p.sCurve = [];
  } else {
    p.sCurve = generateSCurve(bac, p.durationPlanned);
    p.sCurveBaseline = p.sCurve.slice();
    p.state = "active";
    p.startMonth = sim.month;
    p.durationCurrent = p.durationPlanned;
  }
  sim.decisions.push({ month: sim.month, type: "add", id, title: p.title });
}
function slowProject(sim, id, s) {
  const p = sim.projects.find((x) => x.id === id);
  if (!p || p.state !== "active" || s <= 0 || s >= 1) return;
  rebaseline(p, Math.ceil(p.sCurve.length / (1 - s)), sim.month);
  sim.decisions.push({ month: sim.month, type: "slow", id, title: p.title, s });
}
function speedProject(sim, id, a) {
  const p = sim.projects.find((x) => x.id === id);
  if (!p || p.state !== "active" || a <= 0 || a >= 1) return;
  const remBudget = Math.max(0, p.bacCurrent - p.nominalSpent);
  const premium = remBudget * CRASH_K * a;                 // crash cost premium
  p.bacCurrent = +(p.bacCurrent + premium).toFixed(4);
  const newRem = Math.max(1, Math.ceil(p.sCurve.length * (1 - a)));
  rebaseline(p, newRem, sim.month);                         // re-spreads the larger remaining budget over fewer months
  sim.decisions.push({ month: sim.month, type: "speed", id, title: p.title, a });
}
function suspendProject(sim, id) {
  const p = sim.projects.find((x) => x.id === id);
  if (!p || p.state !== "active") return;
  p.state = "suspended";
  sim.decisions.push({ month: sim.month, type: "suspend", id, title: p.title });
}
function resumeProject(sim, id) {
  const p = sim.projects.find((x) => x.id === id);
  if (!p || p.state !== "suspended") return;
  p.suspendPenalty += Math.ceil(p.sCurve.length * 0.1);
  rebaseline(p, Math.ceil(p.sCurve.length * 1.1), sim.month);
  p.state = "active";
  sim.decisions.push({ month: sim.month, type: "resume", id, title: p.title });
}
function abandonProject(sim, id) {
  const p = sim.projects.find((x) => x.id === id);
  if (!p || (p.state !== "active" && p.state !== "suspended")) return;
  if (p.political && p.lockUntil && sim.month <= p.lockUntil) return;
  p.state = "abandoned";
  p.sCurve = [];
  sim.decisions.push({ month: sim.month, type: "abandon", id, title: p.title });
}

/* ---- advance the month (deduct, progress, risk, completion, roll forward) ---- */
function deductAndProgress(sim, rng) {
  const m = sim.month;
  // activate any pending projects whose lag has expired
  sim.projects.filter((p) => p.state === "pending" && m >= p.pendingUntil).forEach((p) => {
    p.state = "active";
    p.startMonth = m;
    p.sCurve = generateSCurve(p.bacCurrent, p.durationPlanned);
    p.sCurveBaseline = p.sCurve.slice();
    p.durationCurrent = p.durationPlanned;
  });
  const capexDemand = demandAt(sim, m);
  sim.availableBalance = +(sim.availableBalance - capexDemand).toFixed(6);
  sim.alerts = [];
  for (const p of actives(sim)) {
    const nom = p.sCurve.shift() || 0;
    (p.drawHistory = p.drawHistory || []).push({ m, nom });   // actual draw record for S-curve actuals
    p.nominalSpent += nom;
    p.cashDrawn += nom * inflator(sim.monthlyRate, m);
    const prog = p.bacCurrent ? p.nominalSpent / p.bacCurrent : 1;
    for (const mEdge of [0.25, 0.5, 0.75]) {
      const key = mEdge * 100;
      if (prog >= mEdge && !p.milestones.includes(key)) {
        p.milestones.push(key);
        let costDelta = 0, durDelta = 0;
        if (rng() < p.costRisk) {
          const sign = rng() < 0.5 ? 1 : -1;
          costDelta = sign * p.costRisk;
          p.bacCurrent = +(p.bacCurrent * (1 + costDelta)).toFixed(4);
        }
        if (rng() < p.durRisk) {
          const sign = rng() < 0.5 ? 1 : -1;
          durDelta = sign * p.durRisk;
          const rem = Math.max(1, Math.round(p.sCurve.length * (1 + durDelta)));
          rebaseline(p, rem, m);
        } else if (costDelta) {
          rebaseline(p, Math.max(1, p.sCurve.length), m);
        }
        if (costDelta || durDelta) {
          const ev = {
            month: m, id: p.id, title: p.title, milestone: key,
            costDelta, durDelta, newBac: p.bacCurrent,
            newEnd: p.startMonth + (p.durationCurrent || 0),
          };
          sim.events.push(ev);
          sim.alerts.push(ev);
        }
      }
    }
    if (p.sCurve.length === 0 && p.state === "active") {
      p.state = "completed";
      p.completionMonth = m;
      p.arcBaseBac = p.bacCurrent;
    }
  }
  let arcAmount = 0;
  if (sim.config?.arcEnabled) {
    for (const p of sim.projects) {
      if (p.state !== "completed") continue;
      const full = arcFullMonthlyFor(p, m, sim.annualRate);
      if (p.arcReduced) {
        const reduced = full * 0.7;
        p.arcBacklog = +((p.arcBacklog || 0) + (full - reduced)).toFixed(6);
        arcAmount += reduced;
      } else {
        arcAmount += full;
      }
    }
  }
  sim.availableBalance = +(sim.availableBalance - arcAmount).toFixed(6);
  if (sim.config?.benefitsEnabled) {
    for (const p of sim.projects) {
      if (!isBenefitTracked(p)) continue;
      p.buCumulative = +((p.buCumulative || 0) + benefitMonthlyFor(p, m)).toFixed(3);
    }
  }
  sim.history.push({ month: m, demand: +capexDemand.toFixed(3), arc: +arcAmount.toFixed(3), balanceAfter: +sim.availableBalance.toFixed(3) });
  // roll to next month
  sim.month = m + 1;
  if (sim.month <= 60) {
    const freq = sim.config?.fundingFrequency ?? 3;
    if ((sim.month - 1) % freq === 0) {
      const qi = Math.floor((sim.month - 1) / freq);
      const release = sim.releaseSchedule?.[qi] ?? sim.quarterlyRelease;
      sim.quarterlyRelease = release;             // keep display compat
      sim.availableBalance = +(sim.availableBalance + release).toFixed(6);
      sim.released = +(sim.released + release).toFixed(4);
    }
  } else {
    finalize(sim);
  }
}

function finalize(sim, { insolvent = false } = {}) {
  sim.projects.forEach((p) => {
    if (p.state === "active" || p.state === "suspended" || p.state === "pending") p.state = "expired";
  });
  sim.status = "ended";
  sim.insolvent = insolvent;
  sim.endMonth = sim.month;
  sim.endedAt = Date.now();
  sim.durationSeconds = sim.startedAt ? Math.max(0, Math.round((sim.endedAt - sim.startedAt) / 1000)) : null;
  sim.score = scoreSim(sim);
}
/* ---- called when a funding shortfall cannot be resolved by any available lever ---- */
function endInsolvent(sim) {
  if (sim.status === "ended") return;
  finalize(sim, { insolvent: true });
}

function scoreSim(sim) {
  const completed = sim.projects.filter((p) => p.state === "completed");
  const abandoned = sim.projects.filter((p) => p.state === "abandoned");
  const expired = sim.projects.filter((p) => p.state === "expired");
  const benefitsOn = !!sim.config?.benefitsEnabled;
  const deliveryMax = benefitsOn ? 35 : 40;
  const alignmentMax = benefitsOn ? 30 : 35;
  const efficiencyMax = benefitsOn ? 20 : 25;
  const delivery = Math.min(completed.length / Math.max(1, sim.maxComp), 1) * deliveryMax;
  const alignment = completed.length
    ? (completed.reduce((a, p) => a + p.alignment, 0) / completed.length) * alignmentMax : 0;
  const sunk = abandoned.reduce((a, p) => a + p.cashDrawn, 0);
  const unspent = Math.max(0, sim.availableBalance);
  const wasted = Math.min(1, Math.max(0, (sunk + unspent) / sim.totalBudget));
  const efficiency = (1 - wasted) * efficiencyMax;
  const benefitTracked = sim.projects.filter(isBenefitTracked);
  const benefitsPotentialBU = benefitTracked.reduce((a, p) => a + benefitPotentialFor(p, sim.month), 0);
  const benefitsBU = benefitTracked.reduce((a, p) => a + (p.buCumulative || 0), 0);
  const benefits = benefitsOn
    ? (benefitsPotentialBU > 0 ? Math.max(0, Math.min(1, benefitsBU / benefitsPotentialBU)) * 15 : 0)
    : 0;
  const arcReductions = sim.projects.reduce((a, p) => a + (p.arcReductionCount || 0), 0);
  const insolvencyPenalty = sim.insolvent ? 10 : 0;
  const raw = delivery + alignment + efficiency + benefits;
  const penalty = abandoned.length * 2 + expired.length * 1 + arcReductions * 2 + insolvencyPenalty;
  const final = Math.max(0, raw - penalty);
  const band =
    final >= 85 ? "Excellent" : final >= 70 ? "Good" :
    final >= 55 ? "Satisfactory" : final >= 40 ? "Poor" : "Needs Development";
  return {
    delivery, alignment, efficiency, benefits, raw, penalty, final, band, wasted,
    deliveryMax, alignmentMax, efficiencyMax,
    completed: completed.length, abandoned: abandoned.length, expired: expired.length, arcReductions,
    insolvent: !!sim.insolvent, insolvencyPenalty,
    benefitsOn, benefitsBU, benefitsPotentialBU,
  };
}

/* optimal benchmark — greedy alignment-per-dollar knapsack on initial BACs */
function optimalBenchmark(sim) {
  const ranked = [...sim.projects].sort((a, b) => (b.alignment / b.bacInitial) - (a.alignment / a.bacInitial));
  let cum = 0; const set = [];
  for (const p of ranked) { if (cum + p.bacInitial <= sim.totalBudget) { cum += p.bacInitial; set.push(p); } }
  const avg = set.length ? set.reduce((a, p) => a + p.alignment, 0) / set.length : 0;
  return { count: set.length, avgAlignment: avg, ids: set.map((p) => p.id) };
}

/* live projected-score estimate during the run */
function liveScore(sim) {
  const probe = clone(sim);
  finalize(probe);
  return probe.score;
}

/* ============================================================
   LEADERBOARD — localStorage persistence
   ============================================================ */
const LB_KEY = "portfolio_sim_leaderboard_v1";

function loadLeaderboard() {
  try { return JSON.parse(localStorage.getItem(LB_KEY) || "[]"); }
  catch { return []; }
}

function saveToLeaderboard(sim) {
  const board = loadLeaderboard();
  const now = new Date();
  const s = sim.score || {};
  const entry = {
    playerName: sim.playerName || "Anonymous",
    runName: sim.name || "Untitled run",
    preset: sim.config?.preset || "custom",
    score: Math.round((s.final || 0) * 10) / 10,
    band: s.band || "—",
    completed: s.completed || 0,
    abandoned: s.abandoned || 0,
    expired: s.expired || 0,
    delivery: +(s.delivery || 0).toFixed(1),
    alignment: +(s.alignment || 0).toFixed(1),
    efficiency: +(s.efficiency || 0).toFixed(1),
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    params: {
      inflation: (sim.annualRate * 100).toFixed(1) + "%",
      funding: sim.config?.fundingProfile || "—",
      tightness: sim.config?.budgetTightness || "—",
      political: sim.config?.politicalProjects ?? "—",
      risk: sim.config?.riskMultiplier || "—",
    },
  };
  board.push(entry);
  try { localStorage.setItem(LB_KEY, JSON.stringify(board.slice(-500))); }
  catch {}
  return entry;
}

/* ============================================================
   SERVER API + EMAIL AUTH
   ============================================================ */
const API = import.meta.env.VITE_API_URL || "/api";
const AUTH_KEY = "portfolio_sim_auth_v1";
const SIM_VERSION = typeof __SIM_VERSION__ !== "undefined" ? __SIM_VERSION__ : "dev";

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
async function apiGet(path) {
  const res = await fetch(API + path);
  if (!res.ok) throw new Error("request_failed");
  return res.json();
}

/* POST the finished run to the server (best-effort; the local leaderboard is the offline fallback). */
async function saveRunToServer(sim) {
  const auth = getAuth();
  if (!auth?.token) return false;
  const s = sim.score || {};
  try {
    await apiPost("/runs", {
      playerName: sim.playerName || "Anonymous",
      runName: sim.name || "Untitled run",
      preset: sim.config?.preset || "custom",
      config: sim.config || null,
      seed: sim.seed,
      score: {
        final: s.final ?? 0, band: s.band,
        delivery: s.delivery, alignment: s.alignment, efficiency: s.efficiency, benefits: s.benefits,
        raw: s.raw, penalty: s.penalty,
        completed: s.completed, abandoned: s.abandoned, expired: s.expired, arcReductions: s.arcReductions,
        insolvent: !!s.insolvent,
        benefitsBU: s.benefitsBU, benefitsPotentialBU: s.benefitsPotentialBU,
      },
      endMonth: sim.endMonth,
      startedAt: sim.startedAt,
      endedAt: sim.endedAt,
      durationSeconds: sim.durationSeconds,
    }, auth.token);
    return true;
  } catch (e) {
    console.warn("[sim] run upload failed:", e.message);
    return false;
  }
}

/* Fetch the shared leaderboard, mapping rows into the shape the UI expects
   (score rounded, date/time derived from endedAt). Throws so callers can fall
   back to the local board when offline. */
async function fetchServerLeaderboard(preset = "all", limit = 50) {
  const { rows } = await apiGet(`/leaderboard?preset=${encodeURIComponent(preset)}&limit=${limit}`);
  return rows.map((r) => {
    const d = r.endedAt ? new Date(r.endedAt) : null;
    return {
      ...r,
      score: Math.round((r.score || 0) * 10) / 10,
      date: d ? d.toLocaleDateString() : "",
      time: d ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
    };
  });
}

/* ============================================================
   ASSESSMENT ENGINE — rules-based personalised feedback
   ============================================================ */
function generateAssessment(sim) {
  const s = sim.score || {};
  const decisions = sim.decisions || [];
  const completed = sim.projects.filter((p) => p.state === "completed");
  const abandoned = sim.projects.filter((p) => p.state === "abandoned");
  const expired = sim.projects.filter((p) => p.state === "expired");

  const adds     = decisions.filter((d) => d.type === "add").length;
  const slows    = decisions.filter((d) => d.type === "slow").length;
  const speeds   = decisions.filter((d) => d.type === "speed").length;
  const suspends = decisions.filter((d) => d.type === "suspend").length;
  const resumes  = decisions.filter((d) => d.type === "resume").length;
  const abandons = decisions.filter((d) => d.type === "abandon").length;

  const poolAvgAlign      = sim.projects.reduce((a, p) => a + p.alignment, 0) / sim.projects.length;
  const completedAvgAlign = completed.length ? completed.reduce((a, p) => a + p.alignment, 0) / completed.length : 0;
  const abandonedAvgAlign = abandoned.length ? abandoned.reduce((a, p) => a + p.alignment, 0) / abandoned.length : 0;

  const leftoverPct = sim.totalBudget > 0 ? sim.availableBalance / sim.totalBudget : 0;

  const addDecisions = decisions.filter((d) => d.type === "add");
  const earlyAdds = addDecisions.filter((d) => d.month <= 20).length;
  const lateAdds  = addDecisions.filter((d) => d.month >= 40).length;

  const strengths    = [];
  const improvements = [];

  // Delivery
  if ((s.completed || 0) >= Math.max(1, sim.maxComp * 0.75))
    strengths.push(`Outstanding delivery — ${s.completed} of ${sim.maxComp} target projects completed, close to the theoretical maximum.`);
  else if ((s.completed || 0) >= sim.maxComp * 0.45)
    strengths.push(`Solid delivery: ${s.completed} projects completed. You kept the portfolio productive.`);
  else
    improvements.push(`Only ${s.completed || 0} projects were completed. Prioritise smaller, shorter-duration projects in the early months to build a delivery base before committing to larger ones.`);

  // Strategic alignment
  if (completedAvgAlign >= 0.7)
    strengths.push(`Strong strategic discipline — completed projects averaged ${pct(completedAvgAlign)} alignment, well above the pool average of ${pct(poolAvgAlign)}.`);
  else if (completedAvgAlign >= poolAvgAlign)
    strengths.push(`Your completed projects averaged ${pct(completedAvgAlign)} alignment, slightly above the overall pool average (${pct(poolAvgAlign)}).`);
  else
    improvements.push(`Completed projects averaged ${pct(completedAvgAlign)} alignment vs a pool average of ${pct(poolAvgAlign)}. Use alignment scores and the Preview tool to prioritise higher-value candidates.`);

  // Abandonment quality
  if (abandoned.length > 0 && abandonedAvgAlign < poolAvgAlign)
    strengths.push(`Strategic triage — your ${abandons} abandonment${abandons !== 1 ? "s" : ""} targeted low-alignment projects (avg ${pct(abandonedAvgAlign)}), limiting strategic damage.`);
  else if (abandoned.length > 0 && abandonedAvgAlign >= poolAvgAlign)
    improvements.push(`You abandoned ${abandons} above-average-alignment project${abandons !== 1 ? "s" : ""} (avg ${pct(abandonedAvgAlign)}). Next time, abandon low-alignment projects first to protect strategic value.`);

  // Budget utilisation
  if (leftoverPct < 0.05)
    strengths.push(`Near-complete budget deployment — you put almost all released funds to work, minimising idle cash losses to inflation.`);
  else if (leftoverPct > 0.2)
    improvements.push(`${pct(leftoverPct)} of total budget remained unspent at month 60. Idle cash erodes in real terms; add projects earlier to deploy it before inflation discounts its value.`);

  // Expiries
  if (expired.length === 0)
    strengths.push(`Zero projects expired — every commitment was resolved within the 60-month window.`);
  else if (expired.length >= 3)
    improvements.push(`${expired.length} projects expired unfinished. Monitor projected completion dates (shown on each active row) and speed up or abandon projects that cannot finish in time.`);

  // Timing
  if (earlyAdds >= 3)
    strengths.push(`Good early portfolio-building — adding projects in the first 20 months maximises their earning window within the simulation.`);
  if (lateAdds >= 2 && lateAdds >= earlyAdds)
    improvements.push(`Most additions happened after month 40. Building the portfolio in the first 20 months gives projects more time to complete and contributes more to the delivery score.`);

  // Tempo controls
  if (slows > 0 && speeds > 0)
    strengths.push(`Effective use of tempo controls — you slowed ${slows} and accelerated ${speeds} project${speeds !== 1 ? "s" : ""}, actively managing cash flow without abandonment.`);
  else if (slows === 0 && speeds === 0)
    improvements.push(`Tempo controls (Slow / Speed) were unused. These let you manage cash pressure without abandoning projects — Slow reduces monthly burn; Speed rescues late-running projects at a cost premium.`);

  // Suspensions
  const unresumed = suspends - resumes;
  if (unresumed > 0)
    improvements.push(`${unresumed} project${unresumed !== 1 ? "s were" : " was"} suspended but never resumed. Suspended projects still accumulate inflation cost — resume or abandon them rather than leaving them on hold.`);

  // ARC funding cuts
  const arcReducedProjects = sim.projects.filter((p) => (p.arcReductionCount || 0) > 0);
  if (arcReducedProjects.length) {
    const stillReduced = arcReducedProjects.filter((p) => p.arcReduced).length;
    improvements.push(
      `ARC funding was cut 30% on ${arcReducedProjects.length} completed project${arcReducedProjects.length !== 1 ? "s" : ""} (${arcReducedProjects.map((p) => p.id).join(", ")}) to relieve funding shortfalls — the benefits delivered by ${arcReducedProjects.length !== 1 ? "these assets" : "this asset"} were negatively impacted as a result, on top of a ${(s.arcReductions || 0) * 2}-point score penalty` +
      (stillReduced ? `, and ${stillReduced} project${stillReduced !== 1 ? "s remain" : " remains"} under-funded at run's end.` : ".")
    );
  }

  // Full ARC cutoffs (decommissioned assets)
  const cutoffProjects = sim.projects.filter((p) => p.arcCutoff);
  if (cutoffProjects.length) {
    improvements.push(
      `${cutoffProjects.length} completed project${cutoffProjects.length !== 1 ? "s were" : " was"} fully cut off from ARC funding (${cutoffProjects.map((p) => p.id).join(", ")}) — ${cutoffProjects.length !== 1 ? "they were" : "it was"} decommissioned, ${cutoffProjects.length !== 1 ? "their" : "its"} full budget now counts as wasted spend, and ${cutoffProjects.length !== 1 ? "they generate" : "it generates"} negative benefits for the rest of the run. This is the costliest funding-shortfall response available — a partial 30% reduction, or resolving pressure earlier via slow/suspend, is cheaper.`
    );
  }

  // Social benefits — how much of the completed portfolio's potential was actually realised
  if (s.benefitsOn && s.benefitsPotentialBU > 0) {
    const ratio = s.benefits / 15;
    if (ratio >= 0.85)
      strengths.push(`Social benefits were well protected — you captured ${pct(ratio)} of the ${s.benefitsPotentialBU.toFixed(0)} BU your completed assets were capable of generating.`);
    else if (ratio < 0.5)
      improvements.push(`Only ${pct(ratio)} of your completed assets' potential ${s.benefitsPotentialBU.toFixed(0)} BU was actually realised (${s.benefitsBU.toFixed(0)} BU delivered) — ARC funding cuts eroded the social benefits those assets were built to deliver. Completing projects earlier only pays off if you can keep their ARC funded afterwards.`);
  }

  // Insolvency
  if (s.insolvent)
    improvements.push(`The simulation ended early at Month ${sim.month} — no funds were available to continue, even after exhausting available levers (slow, suspend, abandon, and ARC funding cuts). This carries a 10-point score penalty. Earlier and more decisive cash-flow management would have kept the portfolio solvent through Month 60.`);

  // Key insight
  let keyInsight = "";
  const final = s.final || 0;
  if (s.insolvent)
    keyInsight = "This run ended in insolvency — demand outran available funds with no remaining lever to close the gap. The lesson: resolve funding pressure early, before it compounds. Slowing, suspending, or reducing ARC funding earlier — or simply adding fewer projects at once — keeps the portfolio solvent all the way to Month 60.";
  else if (final >= 80)
    keyInsight = "You managed the portfolio with the rigour of a senior PMO. Your score reflects disciplined alignment choices and effective cash-flow control across all 60 months.";
  else if (final >= 65)
    keyInsight = "A strong result with room to sharpen. The marginal gains available to you are in alignment discipline — consistently favouring higher-alignment selections compounds significantly over 60 months.";
  else if (final >= 45)
    keyInsight = "A competent run that revealed the core tension: budget pressure vs strategic ambition. The biggest lever is earlier, smarter project selection — fewer starts, higher alignment, shorter durations first.";
  else if (final >= 25)
    keyInsight = "The simulation exposed how quickly a portfolio can overcommit. Focus next time on completing fewer, higher-aligned projects cleanly rather than starting many and struggling to fund them all.";
  else
    keyInsight = "A difficult run — or a courageous first attempt. The key lesson: the first 20 months set the entire trajectory. Early selection quality and quick cycle times drive the final score more than any other factor.";

  return { strengths, improvements, keyInsight, adds, slows, speeds, suspends, abandons, completedAvgAlign, poolAvgAlign };
}

/* ---- HINT ADVISOR: read state, recommend the single best next move ---- */
function computeHint(sim) {
  const m = sim.month;
  const monthsLeft = 61 - m;                         // inclusive of current month
  const bal = sim.availableBalance;
  const act = actives(sim);
  const susp = sim.projects.filter((p) => p.state === "suspended");
  const avail = sim.projects.filter((p) => p.state === "available").map((p) => {
    const bac = p.bacInitial * inflator(sim.monthlyRate, m);
    return { ...p, bac, afford: bac <= bal + 1e-9, finishable: p.durationPlanned <= monthsLeft };
  });
  const demand = totalDemandAt(sim, m);
  const projEnd = (p) => p.startMonth + (p.durationCurrent || 0);
  const expiring = act.filter((p) => projEnd(p) > 60);
  const lowestActive = [...act].sort((a, b) => a.alignment - b.alignment)[0];
  const bestAvail = avail
    .filter((p) => p.afford && p.finishable)
    .sort((a, b) => b.alignment - a.alignment)[0];
  const points = [];
  let headline = "", tone = T.action, action = null;

  // 1 — demand exceeds funds this month
  if (demand > bal + 1e-6) {
    headline = "Resolve the funding gap before advancing.";
    tone = T.expired;
    points.push(`This month's demand ${money(demand)} exceeds available funds ${money(bal)}.`);
    if (lowestActive) points.push(`Slowing or suspending ${lowestActive.id} (${pct(lowestActive.alignment)} alignment) frees the most room for the least strategic cost.`);
    points.push("Slowing keeps the project alive at a lower burn; suspending stops it entirely until you resume.");
  }
  // 2 — late game, can't-finish commitments
  else if (monthsLeft <= 14 && expiring.length) {
    headline = "Protect what can still finish.";
    tone = T.suspended;
    points.push(`${expiring.length} active project${expiring.length > 1 ? "s are" : " is"} projected to finish after Month 60 and will expire (−1 each) unless accelerated.`);
    // if one is well advanced and funds allow, speeding it up can rescue a delivery
    const rescuable = [...expiring]
      .filter((p) => (p.bacCurrent ? p.nominalSpent / p.bacCurrent : 0) >= 0.45 && p.sCurve.length > monthsLeft)
      .sort((x, y) => (y.nominalSpent / y.bacCurrent) - (x.nominalSpent / x.bacCurrent))[0];
    if (rescuable) {
      const a = Math.min(0.6, Math.max(0.1, 1 - (monthsLeft - 1) / rescuable.sCurve.length));
      points.push(`${rescuable.id} (${pct(rescuable.alignment)}) is ${pct(rescuable.nominalSpent / rescuable.bacCurrent)} done — speeding it up could land the delivery before Month 60, at a crash premium.`);
      action = { type: "speed", id: rescuable.id, a: +a.toFixed(2) };
    } else {
      const worst = [...expiring].sort((x, y) => x.alignment - y.alignment)[0];
      points.push(`Consider abandoning ${worst.id} (${pct(worst.alignment)}) to redirect funds toward projects nearer completion — each delivery is worth far more than the −2 abandonment cost.`);
    }
    points.push("Avoid starting anything new that cannot complete within the remaining months.");
  }
  // 3 — idle cash piling up
  else if (bal > 1.6 * sim.quarterlyRelease && bestAvail && monthsLeft > 16) {
    headline = "Put idle funds to work.";
    tone = T.completed;
    points.push(`You are holding ${money(bal)} — more than 1.5 quarters of release. Idle cash erodes through inflation and lowers budget efficiency.`);
    points.push(`${bestAvail.id} "${bestAvail.title}" is affordable (${money(bestAvail.bac)}), highly aligned (${pct(bestAvail.alignment)}), and can finish in time.`);
    points.push("Starting strong projects early beats inflation, since their cost only rises the longer you wait.");
    action = { type: "add", id: bestAvail.id };
  }
  // 4 — suspended projects bleeding value
  else if (susp.length) {
    const s0 = [...susp].sort((a, b) => b.alignment - a.alignment)[0];
    headline = "Decide on your suspended projects.";
    tone = T.suspended;
    points.push(`${susp.length} project${susp.length > 1 ? "s are" : " is"} on hold; their remaining cost keeps inflating while frozen.`);
    points.push(`Resume ${s0.id} (${pct(s0.alignment)}) if funds allow — note the 10% remaining-duration penalty — or abandon the weakest to stop the bleed.`);
  }
  // 5 — over-committed (demand close to funds, several expiring)
  else if (expiring.length >= 2) {
    headline = "You may be spread too thin.";
    tone = T.suspended;
    points.push(`${expiring.length} active projects currently project past Month 60. Spreading funds across too many at once risks expiring most of them.`);
    if (lowestActive) points.push(`Concentrating budget — e.g. suspending ${lowestActive.id} (${pct(lowestActive.alignment)}) — lets higher-priority projects finish on time.`);
  }
  // 6 — healthy
  else {
    headline = "Portfolio looks balanced.";
    tone = T.completed;
    if (bestAvail) {
      points.push(`Funds are under control. You could add ${bestAvail.id} "${bestAvail.title}" (${pct(bestAvail.alignment)}, ${money(bestAvail.bac)}) without straining the budget.`);
      action = { type: "add", id: bestAvail.id };
    } else {
      points.push("Active projects are progressing within budget. Keep advancing and watch the Cash Flow tab for upcoming pressure.");
    }
    points.push(`Live projected score: ${Math.round(liveScore(sim).final)} / 100.`);
  }

  // always-on context line
  points.push(`Delivered ${sim.projects.filter((p) => p.state === "completed").length} of ~${sim.maxComp} possible · ${monthsLeft} month${monthsLeft === 1 ? "" : "s"} left.`);
  return { headline, points, tone, action };
}

/* ============================================================
   PERSISTENCE
   ============================================================ */
const SAVE_KEY = "portfolio_sim_save";
async function saveSession(sim) {
  try { await window.storage.set(SAVE_KEY, JSON.stringify(sim)); return true; }
  catch { return false; }
}
async function loadSession() {
  try { const r = await window.storage.get(SAVE_KEY); return r ? JSON.parse(r.value) : null; }
  catch { return null; }
}

/* ============================================================
   SMALL UI PRIMITIVES
   ============================================================ */
const Panel = ({ children, style, className }) => (
  <div className={className} style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 12, ...style }}>{children}</div>
);
const Badge = ({ children, color }) => (
  <span style={{
    fontSize: 11, fontWeight: 600, letterSpacing: ".02em", padding: "2px 8px",
    borderRadius: 999, color, background: color + "1f", border: `1px solid ${color}55`,
  }}>{children}</span>
);
const Btn = ({ children, onClick, kind = "ghost", disabled, title, style }) => {
  const base = {
    display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600,
    padding: "7px 12px", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1, transition: "all .12s", whiteSpace: "nowrap", border: "1px solid",
  };
  const kinds = {
    primary: { background: T.action, borderColor: T.action, color: "#fff" },
    ghost: { background: "transparent", borderColor: T.line, color: T.text },
    danger: { background: "transparent", borderColor: T.expired + "66", color: T.expired },
    warn: { background: "transparent", borderColor: T.suspended + "66", color: T.suspended },
    ok: { background: "transparent", borderColor: T.completed + "66", color: T.completed },
  };
  return (
    <button title={title} disabled={disabled} onClick={onClick}
      style={{ ...base, ...kinds[kind], ...style }}
      onMouseDown={(e) => e.currentTarget.style.transform = "scale(.97)"}
      onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
      onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}>
      {children}
    </button>
  );
};

function Stat({ label, value, sub, accent, labelLines }) {
  // labelLines reserves a fixed label height so values line up across a row
  // of tiles whose labels wrap to different line counts.
  return (
    <div style={{ background: T.panel2, border: `1px solid ${T.lineSoft}`, borderRadius: 10, padding: "12px 14px", minWidth: 0 }}>
      <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: ".06em", ...(labelLines ? { minHeight: labelLines * 13.5, lineHeight: "13.5px" } : {}) }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent || T.text, marginTop: 4, ...mono }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: T.faint, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

/* simple SVG gauge 0..1 */
function Gauge270({ value, label, color }) {
  const v = Math.max(0, Math.min(1, value));
  const start = -225, end = 45, sweep = (end - start) * v + start;
  const pol = (a, r = 42) => [50 + r * Math.cos(a * Math.PI / 180), 50 + r * Math.sin(a * Math.PI / 180)];
  const arc = (a0, a1, r = 42) => {
    const [x0, y0] = pol(a0, r), [x1, y1] = pol(a1, r);
    const large = (a1 - a0) > 180 ? 1 : 0;
    return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
  };
  return (
    <div style={{ textAlign: "center" }}>
      <svg viewBox="0 0 100 78" style={{ width: "100%", maxWidth: 150 }}>
        <path d={arc(start, end)} fill="none" stroke={T.lineSoft} strokeWidth="9" strokeLinecap="round" />
        <path d={arc(start, sweep)} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" />
        <text x="50" y="52" textAnchor="middle" style={{ ...mono }} fontSize="20" fontWeight="700" fill={T.text}>
          {Math.round(v * 100)}
        </text>
      </svg>
      <div style={{ fontSize: 11, color: T.muted, marginTop: -4 }}>{label}</div>
    </div>
  );
}

/* ============================================================
   RULES MODAL — static explainer shown before starting
   ============================================================ */
const RULE_TABS = [
  { id: "objective", label: "Objective" },
  { id: "projects",  label: "Projects" },
  { id: "actions",   label: "Actions" },
  { id: "funding",   label: "Funding" },
  { id: "risk",      label: "Risk" },
  { id: "scoring",   label: "Scoring" },
];

function RulesModal({ onClose }) {
  const [tab, setTab] = useState("objective");
  const content = {
    objective: (
      <div>
        <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>Your role</h3>
        <p>You are a Portfolio Manager responsible for delivering strategic government projects over a <b>60-month</b> horizon. You have a pool of <b>30 candidate projects</b> but only enough budget to complete approximately <b>20</b>. Every decision you make has financial consequences.</p>
        <h3 style={{ margin: "18px 0 10px", fontSize: 15 }}>The simulation loop</h3>
        <p>Each month you are shown the portfolio state. You may take any number of actions — add, speed up, slow down, suspend, resume, or abandon projects. When you are done, press <b>Advance</b> to move to the next month. Sixty advances bring the simulation to an end and reveal your score.</p>
        <h3 style={{ margin: "18px 0 10px", fontSize: 15 }}>Inflation matters</h3>
        <p>Projects sitting in the <b>Available</b> pool get more expensive every month. At 3% annual inflation, a $10M project costs roughly $300K more after one year of inaction. Idle cash is also penalised in the scoring — money that is never spent reduces your Budget Efficiency score.</p>
      </div>
    ),
    projects: (
      <div>
        <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>Project attributes</h3>
        <p>Each project has four key attributes generated at the start of the run:</p>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 14 }}>
          {[["Budget (BAC)", "$2M–$15M", "Inflates monthly while unstarted"],
            ["Alignment", "20%–100%", "Strategic fit — the quality signal"],
            ["Duration", "12–36 months", "Planned months to complete"],
            ["Risk factors", "5%–20% each", "Probability of cost/duration shocks"]
           ].map(([f, r, n]) => (
            <tr key={f} style={{ borderBottom: `1px solid ${T.lineSoft}` }}>
              <td style={{ padding: "6px 8px", fontWeight: 600, width: 130 }}>{f}</td>
              <td style={{ padding: "6px 8px", color: T.action, ...mono }}>{r}</td>
              <td style={{ padding: "6px 8px", color: T.muted }}>{n}</td>
            </tr>
          ))}
        </table>
        <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>Project states</h3>
        {[["Available", T.available, "In the pool. BAC rises each month due to inflation."],
          ["Active", T.active, "In your portfolio, drawing funds on its S-curve schedule."],
          ["Suspended", T.suspended, "On hold. No cash drawn, but remaining cost keeps inflating."],
          ["Completed", T.completed, "Delivered before Month 60. Counts toward your score."],
          ["Abandoned", T.expired, "Permanently removed. Sunk costs lost. −2 score penalty."],
          ["Expired", T.expired, "Still in portfolio at Month 60 but unfinished. −1 penalty."],
        ].map(([s, c, d]) => (
          <div key={s} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
            <Badge color={c}>{s}</Badge>
            <span style={{ fontSize: 13, color: T.muted, flex: 1 }}>{d}</span>
          </div>
        ))}
        <h3 style={{ margin: "14px 0 8px", fontSize: 15 }}>S-curve spending</h3>
        <p>Each active project follows a <b>Beta(2,2) S-curve</b>: spending is slow at the start, peaks in the middle, and tapers off toward completion — the natural shape of most capital projects.</p>
      </div>
    ),
    actions: (
      <div>
        {[
          [<><Plus size={14}/> Add to portfolio</>, T.completed, "Starts the project next month on its S-curve. BAC is locked at the current inflation-adjusted figure — waiting makes it more expensive."],
          [<><FastForward size={14}/> Speed up</>, T.active, "Compresses remaining duration. Raises monthly burn AND adds a crash premium (50% × compression × remaining budget) to the BAC. Use sparingly — only worth it when a near-complete project is about to expire."],
          [<><Rewind size={14}/> Slow down</>, T.suspended, "Extends remaining duration. Lowers monthly burn by re-spreading the same remaining budget over more months. Slightly increases total real cost due to extra inflation months. The primary lever for managing cash-flow squeezes."],
          [<><Pause size={14}/> Suspend</>, T.suspended, "Pauses the project immediately. Avoids any cash draw but the remaining cost keeps inflating. Resumption adds a 10% remaining-duration penalty. Prefer slowing to suspending unless you need to zero out the monthly demand entirely."],
          [<><RotateCcw size={14}/> Resume</>, T.active, "Restarts a suspended project with a 10% duration penalty on the remaining schedule."],
          [<><Trash2 size={14}/> Abandon</>, T.expired, "Permanently removes the project. All cash drawn is lost and −2 points are deducted from your score. Never abandon a project more than 40% complete — the sunk cost plus penalty almost always exceeds the completion cost."],
        ].map(([label, color, desc], i) => (
          <div key={i} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${T.lineSoft}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13, color, marginBottom: 4 }}>{label}</div>
            <p style={{ margin: 0, fontSize: 13, color: T.muted, lineHeight: 1.55 }}>{desc}</p>
          </div>
        ))}
      </div>
    ),
    funding: (
      <div>
        <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>Quarterly releases</h3>
        <p>Your total 60-month budget is divided into <b>20 equal quarterly tranches</b>, released at the start of Months 1, 4, 7 … 58. Unused funds <b>carry over</b> — there is no use-it-or-lose-it rule.</p>
        <h3 style={{ margin: "18px 0 10px", fontSize: 15 }}>Demand vs supply</h3>
        <p>Each month the simulator computes total <b>inflation-adjusted demand</b> from all active projects. If demand exceeds your available balance, a <b>Shortfall Resolution panel</b> opens. You must slow, suspend, or abandon projects until demand fits the budget before you can advance.</p>
        <h3 style={{ margin: "18px 0 10px", fontSize: 15 }}>Cash flow tab</h3>
        <p>The <b>Cash Flow</b> dashboard tab shows required spending vs available funds for all 60 months. Watch for the red line approaching the green line — that is an early warning of a coming shortfall. Act proactively: a voluntary slowdown now is cheaper than a forced one later.</p>
        <h3 style={{ margin: "18px 0 10px", fontSize: 15 }}>The inflation trap</h3>
        <p>Active project demand is indexed to the global month, so the longer the simulation runs, the more expensive each unit of work becomes. Starting high-priority projects early is both strategically and financially superior.</p>
      </div>
    ),
    risk: (
      <div>
        <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>Milestone triggers</h3>
        <p>Each active project has three risk checkpoints — triggered when cumulative spend crosses <b>25%, 50%, and 75%</b> of its current BAC. At each checkpoint the simulator independently rolls for cost and duration shocks.</p>
        <h3 style={{ margin: "18px 0 10px", fontSize: 15 }}>What can happen</h3>
        {[["Cost shock", "BAC increases or decreases by the project's cost risk factor (5%–20%). A BAC increase raises future demand."],
          ["Duration shock", "Remaining duration extends or compresses by the duration risk factor. An extension may push completion past Month 60."],
          ["Both", "Cost and duration can be affected independently at the same milestone."],
        ].map(([t, d]) => (
          <div key={t} style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: T.expired }}>{t}</div>
            <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.5 }}>{d}</div>
          </div>
        ))}
        <h3 style={{ margin: "18px 0 10px", fontSize: 15 }}>Risk event cards</h3>
        <p>When a risk event fires, a dismissible alert card appears at the top of the decision panel. The S-curve and cash flow projections update immediately — re-check your Cash Flow tab after each alert.</p>
        <h3 style={{ margin: "18px 0 10px", fontSize: 15 }}>Mitigation</h3>
        <p>Prefer projects with lower risk factors when budget is tight. Keep a cash buffer in the mid-game to absorb BAC increases without triggering a shortfall.</p>
      </div>
    ),
    scoring: (
      <div>
        <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>Composite score (out of 100)</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 16 }}>
          {[["Delivery", "40 pts", "Projects completed ÷ max possible"],
            ["Alignment", "35 pts", "Average alignment of completed projects only"],
            ["Budget efficiency", "25 pts", "1 − (sunk costs + unspent cash) ÷ total budget"],
          ].map(([c, w, d]) => (
            <tr key={c} style={{ borderBottom: `1px solid ${T.lineSoft}` }}>
              <td style={{ padding: "7px 8px", fontWeight: 600 }}>{c}</td>
              <td style={{ padding: "7px 8px", color: T.action, ...mono }}>{w}</td>
              <td style={{ padding: "7px 8px", color: T.muted }}>{d}</td>
            </tr>
          ))}
        </table>
        <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>Penalties</h3>
        <p style={{ margin: "0 0 14px" }}>Each abandoned project: <b style={{ color: T.expired }}>−2 points</b>. Each expired project (unfinished at Month 60): <b style={{ color: T.expired }}>−1 point</b>. Score is floored at 0.</p>
        <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>Performance bands</h3>
        {[["85–100", T.completed, "Excellent"],
          ["70–84", T.active, "Good"],
          ["55–69", T.suspended, "Satisfactory"],
          ["40–54", T.faint, "Poor"],
          ["0–39",  T.expired, "Needs Development"],
        ].map(([r, c, b]) => (
          <div key={r} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
            <span style={{ width: 60, ...mono, fontSize: 12, color: c }}>{r}</span>
            <Badge color={c}>{b}</Badge>
          </div>
        ))}
        <h3 style={{ margin: "14px 0 8px", fontSize: 15 }}>Key insight</h3>
        <p>Unspent cash is penalised identically to sunk costs on abandoned projects. Idle money is never neutral — deploy it or it works against you.</p>
      </div>
    ),
  };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: T.scrim, display: "grid", placeItems: "center", zIndex: 50, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(700px, 96vw)", maxHeight: "88vh", background: T.panel, border: `1px solid ${T.line}`, borderRadius: 16, display: "flex", flexDirection: "column", boxShadow: T.shadow }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${T.line}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <BookOpen size={18} color={T.action} />
            <h2 style={{ margin: 0, fontSize: 17 }}>How the simulation works</h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted }}><X size={18} /></button>
        </div>
        {/* tabs */}
        <div style={{ display: "flex", borderBottom: `1px solid ${T.line}`, overflowX: "auto", flexShrink: 0 }}>
          {RULE_TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", background: "transparent", border: "none", borderBottom: `2px solid ${tab === t.id ? T.action : "transparent"}`, color: tab === t.id ? T.text : T.muted, whiteSpace: "nowrap" }}>
              {t.label}
            </button>
          ))}
        </div>
        {/* content */}
        <div style={{ padding: "18px 22px", overflowY: "auto", flex: 1, lineHeight: 1.6, fontSize: 13.5, color: T.text }}>
          {content[tab]}
        </div>
        <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.line}`, display: "flex", justifyContent: "flex-end" }}>
          <Btn kind="primary" onClick={onClose}><Play size={14} /> Got it — start the run</Btn>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PORTFOLIO REPORT MODAL — rule-based PMO narrative (no API required)
   ============================================================ */
function generateReport(sim) {
  const completed  = sim.projects.filter((p) => p.state === "completed");
  const active     = sim.projects.filter((p) => p.state === "active");
  const suspended  = sim.projects.filter((p) => p.state === "suspended");
  const abandoned  = sim.projects.filter((p) => p.state === "abandoned");
  const available  = sim.projects.filter((p) => p.state === "available");
  const live       = liveScore(sim);
  const mr         = sim.monthlyRate;
  const remaining  = 61 - sim.month;
  const deployed   = sim.released - sim.availableBalance;
  const deployRate = sim.released > 0 ? deployed / sim.released : 0;
  const decisions  = sim.decisions || [];
  const atRisk     = active.filter((p) => (p.startMonth + (p.durationCurrent || 0)) > 60);
  const nearExpiry = active.filter((p) => { const e = p.startMonth + (p.durationCurrent || 0); return e > 57 && e <= 60; });
  const highBurn   = active.filter((p) => (p.sCurve[0] || 0) * inflator(mr, sim.month) > sim.availableBalance * 0.25);

  const activeBudgetWeightedAlign = (() => {
    const pool = [...active, ...completed];
    const totalBac = pool.reduce((a, p) => a + (p.bacCurrent || p.bacInitial), 0);
    return totalBac > 0 ? pool.reduce((a, p) => a + p.alignment * (p.bacCurrent || p.bacInitial), 0) / totalBac : 0;
  })();
  const completedAvgAlign = completed.length ? completed.reduce((a, p) => a + p.alignment, 0) / completed.length : 0;
  const poolAvgAlign = sim.projects.reduce((a, p) => a + p.alignment, 0) / sim.projects.length;

  const sunkCost   = abandoned.reduce((a, p) => a + p.cashDrawn, 0);
  const abandonPenalty = abandoned.length * 2;
  const topAvailable = [...available].sort((a, b) => b.alignment - a.alignment)
    .filter((p) => p.durationPlanned <= remaining)
    .slice(0, 3);

  // helpers
  const fp = (p) => `${p.id} "${p.title}"`;
  const al = (p) => `${(p.alignment * 100).toFixed(0)}%`;
  const pr = (p) => p.bacCurrent ? `${(p.nominalSpent / p.bacCurrent * 100).toFixed(0)}% complete` : "—";
  const pe = (p) => `ends M${p.startMonth + (p.durationCurrent || 0)}`;

  // ── Section 1: Executive Summary ────────────────────────────────────────────
  const healthLabel = live.final >= 70 ? "on track" : live.final >= 40 ? "under pressure" : "in distress";
  const trajectoryNote = atRisk.length
    ? `${atRisk.length} active project${atRisk.length > 1 ? "s are" : " is"} currently projected to exceed the Month 60 boundary and will expire unless corrective action is taken.`
    : nearExpiry.length
    ? `${nearExpiry.length} project${nearExpiry.length > 1 ? "s are" : " is"} approaching the Month 60 limit and require monitoring.`
    : "No active projects are currently at risk of expiry.";

  const s1 = [
    `The portfolio is ${healthLabel} at Month ${sim.month} of 60, with a projected composite score of ${live.final.toFixed(1)}/100 (${live.band}).`,
    `${completed.length} of ${sim.maxComp} target projects have been delivered; ${active.length} are active and ${suspended.length} are suspended.`,
    `${(deployRate * 100).toFixed(0)}% of released funding ($${deployed.toFixed(2)}M of $${sim.released.toFixed(2)}M) has been deployed. Available balance stands at $${sim.availableBalance.toFixed(2)}M.`,
    trajectoryNote,
  ].join(" ");

  // ── Section 2: Financial Position ───────────────────────────────────────────
  const inflationNote = available.length
    ? `The ${available.length}-project available pool continues to inflate at ${(sim.annualRate * 100).toFixed(1)}% p.a., raising the cost of future project additions by approximately $${(available.reduce((a, p) => a + p.bacInitial, 0) * (sim.monthlyRate)).toFixed(2)}M per month.`
    : "The available pool is now empty; inflation exposure from unstarted projects has been eliminated.";
  const cashNote = sim.availableBalance < 0
    ? "A cash shortfall has occurred this month. Immediate remediation is required."
    : sim.availableBalance < sim.quarterlyRelease * 0.5
    ? "Available balance is below half a quarterly release — a shortfall is likely before the next tranche unless demand is reduced."
    : "Cash position is adequate relative to the next quarterly release.";
  const unspentNote = sim.availableBalance > sim.totalBudget * 0.15
    ? `Unspent balance ($${sim.availableBalance.toFixed(2)}M) represents ${(sim.availableBalance / sim.totalBudget * 100).toFixed(0)}% of total budget and is penalised in the Budget Efficiency score. Deployment of surplus funds into high-alignment projects is warranted.`
    : "";

  const s2 = [
    `Budget deployment rate: ${(deployRate * 100).toFixed(0)}% of released funds ($${deployed.toFixed(2)}M spent from $${sim.released.toFixed(2)}M released; total programme budget $${sim.totalBudget.toFixed(2)}M).`,
    inflationNote,
    cashNote,
    unspentNote,
    sunkCost > 0 ? `Sunk costs from ${abandoned.length} abandoned project${abandoned.length > 1 ? "s" : ""} total $${sunkCost.toFixed(2)}M — these funds are irrecoverable and reduce Budget Efficiency.` : "",
  ].filter(Boolean).join(" ");

  // ── Section 3: Project Portfolio Status ─────────────────────────────────────
  const activeNarrative = active.length
    ? `Active portfolio (${active.length} projects): ${active.map((p) => `${fp(p)} [${al(p)} alignment, ${pr(p)}, ${pe(p)}]`).join("; ")}.`
    : "No projects are currently active.";
  const completedNarrative = completed.length
    ? `Completed (${completed.length}): ${completed.map((p) => `${fp(p)} [delivered M${p.completionMonth}, ${al(p)} alignment]`).join("; ")}.`
    : "No projects have been completed to date.";
  const suspendedNarrative = suspended.length
    ? `Suspended (${suspended.length}): ${suspended.map((p) => fp(p)).join(", ")} — remaining costs continue to inflate while on hold.`
    : "No projects are currently suspended.";
  const abandonedNarrative = abandoned.length
    ? `Abandoned (${abandoned.length}): ${abandoned.map((p) => `${fp(p)} [sunk $${p.cashDrawn.toFixed(2)}M]`).join("; ")} — incurring ${abandonPenalty}-point score penalty.`
    : "No projects have been abandoned.";

  const s3 = [activeNarrative, completedNarrative, suspendedNarrative, abandonedNarrative].join("\n");

  // ── Section 4: Strategic Alignment Analysis ──────────────────────────────────
  const highAlign = active.filter((p) => p.alignment >= 0.7);
  const lowAlign  = active.filter((p) => p.alignment < 0.4);
  const alignNote = activeBudgetWeightedAlign >= 0.7
    ? "The active portfolio is strongly aligned with strategic objectives."
    : activeBudgetWeightedAlign >= 0.5
    ? "Portfolio alignment is moderate — there is room to improve strategic fit by prioritising higher-alignment additions."
    : "Portfolio strategic alignment is weak. Lower-alignment projects are consuming a disproportionate share of the budget.";
  const lowAlignNote = lowAlign.length
    ? ` Low-alignment projects still active — ${lowAlign.map(fp).join(", ")} — should be reviewed for suspension or abandonment if budget pressure intensifies.`
    : "";
  const completedAlignNote = completed.length
    ? ` Delivered projects average ${(completedAvgAlign * 100).toFixed(0)}% alignment against a pool average of ${(poolAvgAlign * 100).toFixed(0)}%.`
    : "";

  const s4 = `Budget-weighted strategic alignment of the active and completed portfolio: ${(activeBudgetWeightedAlign * 100).toFixed(0)}% (pool average: ${(poolAvgAlign * 100).toFixed(0)}%). ${alignNote}${lowAlignNote}${completedAlignNote}`;

  // ── Section 5: Risk Profile ───────────────────────────────────────────────────
  const recentEvents = sim.events.slice(-5);
  const riskSummary = sim.events.length === 0
    ? "No risk events have been triggered to date."
    : `${sim.events.length} risk event${sim.events.length > 1 ? "s have" : " has"} been triggered across the programme. Recent events: ${recentEvents.map((e) => `${e.id} at ${e.milestone}% milestone (M${e.month}): cost ${e.costDelta ? (e.costDelta > 0 ? "+" : "") + (e.costDelta * 100).toFixed(0) + "%" : "unchanged"}, duration ${e.durDelta ? (e.durDelta > 0 ? "+" : "") + (e.durDelta * 100).toFixed(0) + "%" : "unchanged"}`).join("; ")}.`;
  const expiryRisk = atRisk.length
    ? ` Projects at imminent expiry risk (projected end > Month 60): ${atRisk.map((p) => `${fp(p)} [${pe(p)}]`).join(", ")}.`
    : " No projects are currently projected to exceed the Month 60 boundary.";
  const burnRisk = highBurn.length
    ? ` High monthly burn relative to available balance: ${highBurn.map(fp).join(", ")}.`
    : "";

  const s5 = riskSummary + expiryRisk + burnRisk;

  // ── Section 6: Portfolio Manager Assessment ──────────────────────────────────
  const adds    = decisions.filter((d) => d.type === "add").length;
  const slows   = decisions.filter((d) => d.type === "slow").length;
  const speeds  = decisions.filter((d) => d.type === "speed").length;
  const suspends= decisions.filter((d) => d.type === "suspend").length;
  const abandons= decisions.filter((d) => d.type === "abandon").length;
  const earlyAdds = decisions.filter((d) => d.type === "add" && d.month <= 15).length;

  const positives = [];
  const concerns  = [];

  if (completed.length >= sim.maxComp * 0.7) positives.push(`strong delivery rate (${completed.length}/${sim.maxComp} projects)`);
  if (completedAvgAlign >= poolAvgAlign) positives.push(`above-average alignment in completed projects (${(completedAvgAlign * 100).toFixed(0)}% vs pool average ${(poolAvgAlign * 100).toFixed(0)}%)`);
  if (earlyAdds >= 3) positives.push(`proactive project selection in the early game (${earlyAdds} projects added before Month 15)`);
  if (slows >= 2 && abandoned.length === 0) positives.push("effective use of Slow Down to manage cash flow without abandonment");
  if (abandoned.length === 0) positives.push("no project abandonments — sunk cost discipline maintained");
  if (deployRate >= 0.75) positives.push(`high budget utilisation (${(deployRate * 100).toFixed(0)}% of released funds deployed)`);

  if (abandoned.length > 2) concerns.push(`excessive abandonment (${abandoned.length} projects, ${abandonPenalty}-point penalty) — each abandonment after 40% completion destroys more value than it saves`);
  if (atRisk.length > 0) concerns.push(`${atRisk.length} active project${atRisk.length > 1 ? "s" : ""} will expire without corrective action`);
  if (sim.availableBalance > sim.totalBudget * 0.15) concerns.push(`large undeployed balance ($${sim.availableBalance.toFixed(2)}M) is depressing Budget Efficiency`);
  if (completedAvgAlign < poolAvgAlign - 0.1) concerns.push(`completed projects average ${(completedAvgAlign * 100).toFixed(0)}% alignment — below the pool mean, suggesting suboptimal project selection`);
  if (speeds > slows + abandons && speeds > 2) concerns.push("over-reliance on Speed Up is generating unnecessary crash premiums");
  if (earlyAdds === 0 && sim.month > 10) concerns.push("slow start — no projects added in the first 15 months means inflation has eroded purchasing power");

  const positiveText = positives.length
    ? `Strengths observed: ${positives.join("; ")}.`
    : "No clear strengths have been established yet.";
  const concernText = concerns.length
    ? ` Areas requiring attention: ${concerns.join("; ")}.`
    : " No significant concerns at this stage.";

  const s6 = `${decisions.length} decisions have been recorded (${adds} additions, ${slows} slow-downs, ${speeds} speed-ups, ${suspends} suspensions, ${abandons} abandonments). ${positiveText}${concernText}`;

  // ── Section 7: Recommended Actions ───────────────────────────────────────────
  const actions = [];

  atRisk.forEach((p) => {
    const prog = p.bacCurrent ? p.nominalSpent / p.bacCurrent : 0;
    if (prog > 0.6) actions.push(`Speed up ${fp(p)} (${(prog * 100).toFixed(0)}% complete, ${pe(p)}) — project is past 60% and the completion credit outweighs the crash premium.`);
    else actions.push(`Evaluate ${fp(p)} (${pe(p)}) — consider suspension to avoid the −1 expiry penalty if completion before Month 60 is not achievable.`);
  });

  if (sim.availableBalance > sim.totalBudget * 0.12 && topAvailable.length > 0 && remaining > 24) {
    topAvailable.slice(0, 2).forEach((p) => {
      actions.push(`Add ${fp(p)} (${al(p)} alignment, $${(p.bacInitial * inflator(mr, sim.month)).toFixed(2)}M, ${p.durationPlanned}m duration) — affordable, completable, and above the portfolio alignment average.`);
    });
  }

  if (highBurn.length > 0 && sim.availableBalance < sim.quarterlyRelease * 0.7) {
    actions.push(`Slow down ${highBurn.map(fp).join(" and ")} to reduce monthly demand and avoid a shortfall before the next quarterly release.`);
  }

  suspended.forEach((p) => {
    const canFinish = (sim.month + (p.durationCurrent || 12) * 1.1) <= 60;
    if (canFinish && sim.availableBalance > (p.bacCurrent - p.nominalSpent) * 0.3) {
      actions.push(`Resume ${fp(p)} — resumption with the 10% duration penalty still allows completion before Month 60 and avoids further inflation on the remaining cost.`);
    }
  });

  if (actions.length === 0) actions.push("Maintain current trajectory. Continue monitoring the Cash Flow tab before each monthly advance and revisit project selection if the available balance grows beyond 15% of total budget.");

  const s7 = actions.slice(0, 5).map((a, i) => `${i + 1}. ${a}`).join("\n");

  // ── Assemble report ───────────────────────────────────────────────────────────
  return [
    `1. EXECUTIVE SUMMARY\n${s1}`,
    `2. FINANCIAL POSITION\n${s2}`,
    `3. PROJECT PORTFOLIO STATUS\n${s3}`,
    `4. STRATEGIC ALIGNMENT ANALYSIS\n${s4}`,
    `5. RISK PROFILE\n${s5}`,
    `6. PORTFOLIO MANAGER ASSESSMENT\n${s6}`,
    `7. RECOMMENDED ACTIONS\n${s7}`,
  ].join("\n\n");
}

function PortfolioReportModal({ sim, onClose }) {
  const report = useMemo(() => generateReport(sim), [sim]);
  const scrollRef = useRef(null);

  const live = useMemo(() => liveScore(sim), [sim]);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: T.scrim, display: "grid", placeItems: "center", zIndex: 50, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(760px, 96vw)", maxHeight: "90vh", background: T.panel, border: `1px solid ${T.line}`, borderRadius: 16, display: "flex", flexDirection: "column", boxShadow: T.shadow }}>

        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px", borderBottom: `1px solid ${T.line}`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FileText size={18} color={T.action} />
            <div>
              <h2 style={{ margin: 0, fontSize: 16 }}>Portfolio Status Report</h2>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>Month {sim.month} / 60 · {sim.name || "Untitled"} · projected score {Math.round(live.final)} ({live.band})</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted }}><X size={18} /></button>
        </div>

        {/* body */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          <div style={{ fontSize: 13.5, lineHeight: 1.75, color: T.text, fontFamily: "Georgia, 'Times New Roman', serif" }}>
              {report.split("\n\n").map((block, i) => {
                const lines = block.split("\n");
                const isSection = /^\d+\.\s[A-Z]/.test(lines[0]);
                return (
                  <div key={i} style={{ marginBottom: 20 }}>
                    {lines.map((line, j) => {
                      const isHeading = j === 0 && isSection;
                      const isNumbered = /^\d+\.\s/.test(line) && !isSection;
                      return (
                        <div key={j} style={{
                          fontWeight: isHeading ? 700 : 400,
                          fontSize: isHeading ? 12.5 : 13.5,
                          color: isHeading ? T.action : T.text,
                          textTransform: isHeading ? "uppercase" : "none",
                          letterSpacing: isHeading ? ".07em" : 0,
                          marginTop: isHeading ? 0 : isNumbered ? 6 : 0,
                          fontFamily: isHeading ? "ui-sans-serif, system-ui, sans-serif" : "Georgia, serif",
                          paddingBottom: isHeading ? 6 : 0,
                          borderBottom: isHeading ? `1px solid ${T.lineSoft}` : "none",
                        }}>
                          {line || " "}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
        </div>

        {/* footer */}
        <div style={{ padding: "12px 22px", borderTop: `1px solid ${T.line}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: T.faint }}>Rule-based PMO report · generated from simulation data</span>
          <Btn onClick={onClose}>Close</Btn>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SETUP SCREEN
   ============================================================ */
const DIFFICULTY_PRESETS = {
  learning:  { annualRate: 0.02, fundingProfile: "flat",       budgetTightness: 1.2, politicalProjects: 0, concurrentCap: 0, approvalLag: 0, riskMultiplier: 0.5, blindAlignment: false, blindScore: false, arcEnabled: false, benefitsEnabled: false },
  standard:  { annualRate: 0.03, fundingProfile: "scurve",     budgetTightness: 1.5, politicalProjects: 2, concurrentCap: 0, approvalLag: 0, riskMultiplier: 1.0, blindAlignment: false, blindScore: false, arcEnabled: true,  benefitsEnabled: false },
  advanced:  { annualRate: 0.05, fundingProfile: "volatile",   budgetTightness: 1.8, politicalProjects: 4, concurrentCap: 8, approvalLag: 2, riskMultiplier: 1.5, blindAlignment: false, blindScore: true,  arcEnabled: true,  benefitsEnabled: true  },
};

const FUNDING_LABELS = { flat: "Flat (equal each quarter)", scurve: "S-Curve (slow-peak-taper)", frontloaded: "Front-loaded (heavy early)", backloaded: "Back-loaded (heavy late)", volatile: "Volatile (±20% each quarter)" };
const TIGHTNESS_LABELS = { 1.2: "Generous (1.2×) — ~25 possible", 1.5: "Standard (1.5×) — ~20 possible", 1.8: "Tight (1.8×) — ~17 possible", 2.2: "Severe (2.2×) — ~14 possible" };
const CAP_LABELS = { 0: "Unconstrained", 5: "Tight — 5 projects", 8: "Moderate — 8 projects", 12: "Relaxed — 12 projects" };
const LAG_LABELS = { 0: "None (starts next month)", 2: "Short — 2 months", 4: "Realistic — 4 months", 6: "Bureaucratic — 6 months" };
const RISK_LABELS = { 0.5: "Calm (0.5×)", 1.0: "Normal (1.0×)", 1.5: "Turbulent (1.5×)" };
const FREQ_LABELS  = { 1: "Monthly (60 tranches)", 3: "Quarterly (20 tranches)", 6: "Bi-annually (10 tranches)", 12: "Annually (5 tranches)" };
const FREQ_SHORT   = { 1: "Monthly", 3: "Quarterly", 6: "Bi-annual", 12: "Annual" };
const VIS_LABELS = {
  "full":          "Full transparency",
  "blind_align":   "Blind alignment (scores hidden)",
  "blind_score":   "Blind score (projected score hidden)",
  "full_blind":    "Full blind (both hidden)",
};

function SelectRow({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, color: T.muted, textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 6 }}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", padding: "9px 12px", borderRadius: 8, background: T.panel2, border: `1px solid ${T.line}`, color: T.text, fontSize: 13, outline: "none", cursor: "pointer" }}>
        {Object.entries(options).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
    </div>
  );
}

function SetupScreen({ onStart, onResume, hasSave }) {
  const [preset, setPreset] = useState("standard");
  const [showCustom, setShowCustom] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [name, setName] = useState(() => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `Portfolio ${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
  });

  // Player registration (email + name, required to start a run). Verifying
  // stores {token, email, name} in localStorage so a returning player sees
  // their name and email without re-entering them.
  const [auth, setAuthState] = useState(getAuth());
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [authStep, setAuthStep] = useState("idle"); // "idle" | "code-sent"
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");

  const AUTH_ERRORS = {
    invalid_email: "That doesn't look like a valid email address.",
    too_many_requests: "Too many codes requested — please wait a while.",
    email_failed: "Couldn't send the email. Please try again shortly.",
    no_code: "Request a code first.",
    wrong_code: "That code isn't right — check it and try again.",
    expired: "That code has expired — request a new one.",
    too_many_attempts: "Too many attempts — request a new code.",
  };
  const authMsg = (e) => AUTH_ERRORS[e?.data?.error || e?.message] || "Something went wrong. Please try again.";

  const requestCode = async () => {
    setAuthBusy(true); setAuthError("");
    try {
      await apiPost("/auth/request-code", { email: emailInput.trim().toLowerCase() });
      setAuthStep("code-sent");
    } catch (e) { setAuthError(authMsg(e)); }
    finally { setAuthBusy(false); }
  };
  const verifyCode = async () => {
    setAuthBusy(true); setAuthError("");
    try {
      const { token, email, name: registeredName } = await apiPost("/auth/verify", {
        email: emailInput.trim().toLowerCase(), code: codeInput, name: nameInput.trim(),
      });
      const a = { token, email, name: registeredName || nameInput.trim() };
      setAuth(a); setAuthState(a);
    } catch (e) { setAuthError(authMsg(e)); }
    finally { setAuthBusy(false); }
  };
  const unregister = () => {
    clearAuth(); setAuthState(null); setAuthStep("idle");
    setNameInput(""); setEmailInput(""); setCodeInput(""); setAuthError("");
  };

  // Shared leaderboard preview (server, falling back to local)
  const [lbPreview, setLbPreview] = useState(null);
  useEffect(() => {
    let live = true;
    (async () => {
      let board;
      try { board = await fetchServerLeaderboard("all", 500); }
      catch { board = loadLeaderboard(); }
      if (!live || !board.length) return;
      const top = [...board].sort((a, b) => b.score - a.score)[0];
      setLbPreview({ total: board.length, top });
    })();
    return () => { live = false; };
  }, []);

  const [annualRate,       setAnnualRate]       = useState(3);
  const [fundingProfile,   setFundingProfile]   = useState("scurve");
  const [budgetTightness,  setBudgetTightness]  = useState("1.5");
  const [politicalProjects,setPoliticalProjects]= useState(2);
  const [concurrentCap,    setConcurrentCap]    = useState("0");
  const [approvalLag,      setApprovalLag]      = useState("0");
  const [riskMultiplier,   setRiskMultiplier]   = useState("1.0");
  const [visibility,       setVisibility]       = useState("full");
  const [fundingFrequency, setFundingFrequency] = useState("3");
  const [arcEnabled,       setArcEnabled]       = useState(true);
  const [benefitsEnabled,  setBenefitsEnabled]  = useState(false);

  const arcLocked = preset === "learning" || preset === "advanced";
  const benefitsLocked = preset === "advanced";

  const applyPreset = (p) => {
    setPreset(p);
    if (p === "custom") { setShowCustom(true); return; }
    const d = DIFFICULTY_PRESETS[p];
    setAnnualRate(+(d.annualRate * 100).toFixed(1));
    setFundingProfile(d.fundingProfile);
    setBudgetTightness(String(d.budgetTightness));
    setPoliticalProjects(d.politicalProjects);
    setConcurrentCap(String(d.concurrentCap));
    setApprovalLag(String(d.approvalLag));
    setRiskMultiplier(String(d.riskMultiplier));
    setVisibility(d.blindScore && d.blindAlignment ? "full_blind" : d.blindScore ? "blind_score" : d.blindAlignment ? "blind_align" : "full");
    setArcEnabled(d.arcEnabled);
    setBenefitsEnabled(d.benefitsEnabled);
    setShowCustom(false);
  };

  const buildConfig = () => ({
    name: name || "Untitled run",
    playerName: auth?.name || "Anonymous",
    preset,
    annualRate: annualRate / 100,
    fundingProfile,
    budgetTightness: parseFloat(budgetTightness),
    politicalProjects,
    concurrentCap: parseInt(concurrentCap),
    approvalLag: parseInt(approvalLag),
    riskMultiplier: parseFloat(riskMultiplier),
    blindAlignment: visibility === "blind_align" || visibility === "full_blind",
    blindScore: visibility === "blind_score" || visibility === "full_blind",
    fundingFrequency: parseInt(fundingFrequency),
    benefitsEnabled,
    arcEnabled,
  });

  const PRESETS = [
    { id: "learning", label: "Learning",  sub: "2% inflation · flat funding · no political · calm risk" },
    { id: "standard", label: "Standard",  sub: "3% inflation · S-curve · 2 political · normal risk" },
    { id: "advanced", label: "Advanced",  sub: "5% inflation · volatile · 4 political · turbulent · blind score" },
    { id: "custom",   label: "Custom",    sub: "Configure all parameters" },
  ];

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ width: "min(600px, 96vw)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <Gauge size={26} color={T.action} />
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.02em", margin: 0 }}>Portfolio Simulator</h1>
          <span style={{ fontSize: 11, color: T.faint, ...mono }}>v{SIM_VERSION}</span>
        </div>
        <p style={{ color: T.muted, margin: "0 0 16px", fontSize: 14, lineHeight: 1.5 }}>
          Sixty months. Thirty candidate projects. Enough budget for roughly twenty. Select, fund, slow, and — when the money runs short — decide what gives.
        </p>

        <img
          src="/splash.jpg"
          alt="Portfolio Simulator"
          style={{ width: "100%", borderRadius: 12, marginBottom: 16, display: "block", objectFit: "cover", maxHeight: 220, border: `1px solid ${T.line}` }}
        />

        <Panel style={{ padding: 22, marginBottom: 14 }}>
          {/* run name */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: T.muted, textTransform: "uppercase", letterSpacing: ".06em" }}>Run name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Punjab ADP dry-run"
              style={{ width: "100%", boxSizing: "border-box", marginTop: 6, padding: "10px 12px", borderRadius: 8, background: T.panel2, border: `1px solid ${T.line}`, color: T.text, fontSize: 14, outline: "none" }} />
          </div>

          {/* player registration — required to start a run */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: T.muted, textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 6 }}>Player registration</label>
            {auth ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: T.completed + "12", border: `1px solid ${T.completed}55`, borderRadius: 8, padding: "10px 12px" }}>
                <span style={{ fontSize: 13, color: T.text }}>
                  <span style={{ color: T.completed, fontWeight: 700 }}>✓ Registered</span> as <strong>{auth.name || "Player"}</strong> — {auth.email}
                </span>
                <button onClick={unregister} style={{ background: "none", border: "none", color: T.muted, fontSize: 12, cursor: "pointer", textDecoration: "underline", flexShrink: 0 }}>Un-register</button>
              </div>
            ) : (
              <div style={{ background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 8, padding: 12 }}>
                {authStep === "idle" ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="Your name for the leaderboard" disabled={authBusy}
                      style={{ flex: 1, minWidth: 140, boxSizing: "border-box", padding: "10px 12px", borderRadius: 8, background: T.panel, border: `1px solid ${T.line}`, color: T.text, fontSize: 14, outline: "none" }} />
                    <input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} placeholder="you@example.com" disabled={authBusy}
                      onKeyDown={(e) => { if (e.key === "Enter" && emailInput && nameInput.trim()) requestCode(); }}
                      style={{ flex: 1, minWidth: 180, boxSizing: "border-box", padding: "10px 12px", borderRadius: 8, background: T.panel, border: `1px solid ${T.line}`, color: T.text, fontSize: 14, outline: "none" }} />
                    <Btn kind="primary" disabled={authBusy || !emailInput || !nameInput.trim()} onClick={requestCode} style={{ padding: "10px 14px" }}>{authBusy ? "Sending…" : "Register"}</Btn>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ fontSize: 12, color: T.muted, width: "100%" }}>Enter the 6-digit code sent to <strong>{emailInput}</strong></div>
                    <input inputMode="numeric" value={codeInput} onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" disabled={authBusy}
                      onKeyDown={(e) => { if (e.key === "Enter" && codeInput.length === 6) verifyCode(); }}
                      style={{ width: 130, boxSizing: "border-box", padding: "10px 12px", borderRadius: 8, background: T.panel, border: `1px solid ${T.line}`, color: T.text, fontSize: 16, letterSpacing: "3px", ...mono, outline: "none" }} />
                    <Btn kind="primary" disabled={authBusy || codeInput.length !== 6} onClick={verifyCode} style={{ padding: "10px 14px" }}>{authBusy ? "Verifying…" : "Verify & register"}</Btn>
                    <button onClick={() => { setAuthStep("idle"); setCodeInput(""); setAuthError(""); }} style={{ background: "none", border: "none", color: T.muted, fontSize: 12, cursor: "pointer" }}>Change email</button>
                  </div>
                )}
                {authError && <div style={{ fontSize: 12, color: T.expired, marginTop: 8 }}>{authError}</div>}
                <div style={{ fontSize: 11, color: T.faint, marginTop: 8, lineHeight: 1.4 }}>
                  Registering is required to play. We store your name and email with your run results to power the shared leaderboard.
                </div>
              </div>
            )}
          </div>

          {/* difficulty preset tiles */}
          <label style={{ fontSize: 12, color: T.muted, textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 10 }}>Difficulty</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
            {PRESETS.map((pr) => (
              <button key={pr.id} onClick={() => applyPreset(pr.id)} style={{
                background: preset === pr.id ? T.action + "18" : T.panel2, border: `1.5px solid ${preset === pr.id ? T.action : T.line}`,
                borderRadius: 10, padding: "10px 12px", cursor: "pointer", textAlign: "left",
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: preset === pr.id ? T.action : T.text }}>{pr.label}</div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 3, lineHeight: 1.4 }}>{pr.sub}</div>
              </button>
            ))}
          </div>

          {/* Integrated Budget Wallet (ARC) toggle — always visible, locked by Learning/Advanced */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
            background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 10, padding: "10px 14px", marginBottom: 20,
            opacity: arcLocked ? 0.65 : 1,
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Integrated Budget Wallet</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 2, lineHeight: 1.4 }}>
                {arcLocked
                  ? `Always ${arcEnabled ? "on" : "off"} for ${preset === "learning" ? "Learning" : "Advanced"}`
                  : "Ongoing Annual Recurring Cost for completed projects, drawn from the same budget"}
              </div>
            </div>
            <button
              onClick={() => !arcLocked && setArcEnabled(!arcEnabled)}
              disabled={arcLocked}
              title={arcLocked ? "Locked by difficulty preset" : "Toggle Integrated Budget Wallet"}
              style={{
                flexShrink: 0, width: 44, height: 24, borderRadius: 999, border: `1px solid ${T.line}`,
                background: arcEnabled ? T.action : T.panel, position: "relative",
                cursor: arcLocked ? "not-allowed" : "pointer", padding: 0, transition: "background .15s",
              }}
            >
              <span style={{
                position: "absolute", top: 2, left: arcEnabled ? 22 : 2, width: 18, height: 18, borderRadius: "50%",
                background: "#fff", boxShadow: "0 1px 3px #0004", transition: "left .15s",
              }} />
            </button>
          </div>

          {/* Social Benefits toggle — always visible, locked on for Advanced only */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
            background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 10, padding: "10px 14px", marginBottom: 20,
            opacity: benefitsLocked ? 0.65 : 1,
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Social Benefits</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 2, lineHeight: 1.4 }}>
                {benefitsLocked
                  ? "Always on for Advanced"
                  : "Completed projects generate Benefit Units (BU/month), scored — cut ARC funding and they suffer"}
              </div>
            </div>
            <button
              onClick={() => !benefitsLocked && setBenefitsEnabled(!benefitsEnabled)}
              disabled={benefitsLocked}
              title={benefitsLocked ? "Locked by difficulty preset" : "Toggle Social Benefits"}
              style={{
                flexShrink: 0, width: 44, height: 24, borderRadius: 999, border: `1px solid ${T.line}`,
                background: benefitsEnabled ? T.action : T.panel, position: "relative",
                cursor: benefitsLocked ? "not-allowed" : "pointer", padding: 0, transition: "background .15s",
              }}
            >
              <span style={{
                position: "absolute", top: 2, left: benefitsEnabled ? 22 : 2, width: 18, height: 18, borderRadius: "50%",
                background: "#fff", boxShadow: "0 1px 3px #0004", transition: "left .15s",
              }} />
            </button>
          </div>

          {/* custom parameters — always visible when custom selected, collapsible otherwise */}
          {(showCustom || preset === "custom") && (
            <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 18, marginTop: 4 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
                {/* col 1 */}
                <div>
                  <label style={{ fontSize: 12, color: T.muted, textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 6 }}>
                    Inflation rate — <span style={{ color: T.action, ...mono }}>{annualRate.toFixed(1)}% p.a.</span>
                  </label>
                  <input type="range" min={0} max={20} step={0.5} value={annualRate} onChange={(e) => setAnnualRate(+e.target.value)}
                    style={{ width: "100%", marginBottom: 16, accentColor: T.action }} />
                  <SelectRow label="Funding profile"    value={fundingProfile}    onChange={setFundingProfile}    options={FUNDING_LABELS} />
                  <SelectRow label="Funding frequency"  value={fundingFrequency}  onChange={setFundingFrequency}  options={FREQ_LABELS} />
                  <SelectRow label="Budget tightness"   value={budgetTightness}   onChange={setBudgetTightness}   options={TIGHTNESS_LABELS} />
                  <SelectRow label="Risk environment"   value={riskMultiplier}    onChange={setRiskMultiplier}    options={RISK_LABELS} />
                </div>
                {/* col 2 */}
                <div>
                  <label style={{ fontSize: 12, color: T.muted, textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 6 }}>
                    Political projects — <span style={{ color: T.expired, ...mono }}>{politicalProjects}</span>
                  </label>
                  <input type="range" min={0} max={5} step={1} value={politicalProjects} onChange={(e) => setPoliticalProjects(+e.target.value)}
                    style={{ width: "100%", marginBottom: 16, accentColor: T.expired }} />
                  <SelectRow label="Concurrent cap"   value={concurrentCap}  onChange={setConcurrentCap}  options={CAP_LABELS} />
                  <SelectRow label="Approval lag"     value={approvalLag}    onChange={setApprovalLag}    options={LAG_LABELS} />
                  <SelectRow label="Scoring visibility" value={visibility}   onChange={setVisibility}     options={VIS_LABELS} />
                </div>
              </div>
            </div>
          )}

          {/* show/hide custom when not in custom mode */}
          {preset !== "custom" && (
            <button onClick={() => setShowCustom(!showCustom)} style={{ background: "none", border: "none", color: T.action, fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 16, display: "flex", alignItems: "center", gap: 4 }}>
              <ChevronRight size={13} style={{ transform: showCustom ? "rotate(90deg)" : "none", transition: "transform .15s" }} />
              {showCustom ? "Hide" : "Customise"} parameters
            </button>
          )}

          {/* actions */}
          <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
            <Btn kind="primary" disabled={!auth} title={auth ? undefined : "Register to start"} onClick={() => onStart(buildConfig())} style={{ flex: 1, justifyContent: "center", padding: "11px" }}>
              <Play size={16} /> {auth ? "Start new run" : "Register to start"}
            </Btn>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <Btn onClick={() => setShowLeaderboard(true)} title="View leaderboard">
                <Award size={15} /> Leaderboard
              </Btn>
              <span style={{ fontSize: 10, color: T.faint, textAlign: "center" }}>
                {lbPreview ? `${lbPreview.total} run${lbPreview.total !== 1 ? "s" : ""} · best ${lbPreview.top.score.toFixed(1)}` : "no runs yet"}
              </span>
            </div>
            <Btn onClick={() => setShowRules(true)} title="Read the rules before starting">
              <BookOpen size={15} /> How to play
            </Btn>
            {hasSave && (
              <Btn onClick={onResume} title="Resume saved session">
                <FolderOpen size={16} /> Resume
              </Btn>
            )}
          </div>
        </Panel>

        {/* summary of active settings */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 8 }}>
          {[
            ["Inflation", annualRate.toFixed(1) + "%"],
            ["Funding", FUNDING_LABELS[fundingProfile]?.split(" ")[0]],
            ["Cadence", FREQ_SHORT[fundingFrequency] ?? "Quarterly"],
            ["Political", politicalProjects + " forced"],
            ["Risk", RISK_LABELS[riskMultiplier]?.split(" ")[0]],
            ["Wallet", arcEnabled ? "On" : "Off"],
            ["Benefits", benefitsEnabled ? "On" : "Off"],
          ].map(([l, v]) => (
            <div key={l} style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 10, color: T.faint, textTransform: "uppercase", letterSpacing: ".05em" }}>{l}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginTop: 3 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      {showLeaderboard && <LeaderboardModal onClose={() => setShowLeaderboard(false)} />}
    </div>
  );
}

/* ============================================================
   PROJECT ROWS
   ============================================================ */
function ProgressBar({ value, color }) {
  return (
    <div style={{ height: 5, background: T.lineSoft, borderRadius: 999, overflow: "hidden" }}>
      <div style={{ width: `${Math.min(100, value * 100)}%`, height: "100%", background: color, transition: "width .3s" }} />
    </div>
  );
}

function ActiveRow({ sim, p, onSlow, onSpeed, onSuspend, onAbandon }) {
  const prog = p.bacCurrent ? p.nominalSpent / p.bacCurrent : 0;
  const thisSpend = (p.sCurve[0] || 0) * inflator(sim.monthlyRate, sim.month);
  const projEnd = p.startMonth + (p.durationCurrent || 0);
  const locked = p.political && p.lockUntil && sim.month <= p.lockUntil;
  const blind = sim.config?.blindAlignment;
  const alignColor = p.alignment >= 0.7 ? T.completed : p.alignment >= 0.4 ? T.suspended : T.expired;

  // Status indicators
  const scheduleStatus = projEnd > 60 ? "critical" : projEnd > 57 ? "warning" : "ok";
  const burnStatus = thisSpend > sim.availableBalance * 0.25 ? "warning" : "ok";
  const rowStatus = scheduleStatus === "critical" ? "critical" : (scheduleStatus === "warning" || burnStatus === "warning") ? "warning" : "ok";
  const leftBorderColor = rowStatus === "critical" ? T.expired : rowStatus === "warning" ? T.suspended : T.completed;

  // Inline abandon confirmation
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  useEffect(() => {
    if (!confirmAbandon) return;
    const t = setTimeout(() => setConfirmAbandon(false), 3000);
    return () => clearTimeout(t);
  }, [confirmAbandon]);

  return (
    <div style={{ padding: "10px 12px", borderBottom: `1px solid ${T.lineSoft}`, borderLeft: `3px solid ${leftBorderColor}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            <span style={{ color: T.faint, ...mono }}>{p.id}</span> {p.title}
          </div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 2, ...mono }}>
            BAC {money(p.bacCurrent)} · spend {money(thisSpend)}/mo · ends M{projEnd > 60 ? `${projEnd}⚠` : projEnd}
          </div>
          <div style={{ fontSize: 10.5, color: T.faint, marginTop: 1 }}>
            {p.subCategory} · ARC {pct(p.arcRate)}
          </div>
          {/* status badges — political/locked now lives here, not in the title */}
          <div style={{ display: "flex", gap: 5, marginTop: 4, flexWrap: "wrap" }}>
            {p.political && <Badge color={T.expired}>{locked ? `🔒 Locked to M${p.lockUntil}` : "Political"}</Badge>}
            {scheduleStatus === "critical" && <Badge color={T.expired}>⚠ Expires M{projEnd}</Badge>}
            {scheduleStatus === "warning" && <Badge color={T.suspended}>Late risk M{projEnd}</Badge>}
            {burnStatus === "warning" && <Badge color={T.suspended}>High burn</Badge>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexShrink: 0 }}>
          {!blind && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <Badge color={alignColor}><Target size={10} style={{ display: "inline", verticalAlign: "middle", marginRight: 2 }} />{pct(p.alignment)}</Badge>
              <div style={{ fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: ".05em" }}>Strategic</div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <Badge color={T.active}>{pct(prog)}</Badge>
            <div style={{ fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: ".05em" }}>Done</div>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 8 }}><ProgressBar value={prog} color={T.active} /></div>
      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
        <Btn kind="ok" onClick={() => onSpeed(p)} style={{ padding: "4px 9px", fontSize: 12 }}><FastForward size={13} /> Speed</Btn>
        <Btn kind="warn" onClick={() => onSlow(p)} style={{ padding: "4px 9px", fontSize: 12 }}><Rewind size={13} /> Slow</Btn>
        <Btn kind="ghost" onClick={() => onSuspend(p.id)} style={{ padding: "4px 9px", fontSize: 12 }}><Pause size={13} /> Suspend</Btn>
        {confirmAbandon ? (
          <>
            <Btn kind="danger" onClick={() => onAbandon(p.id)} style={{ padding: "4px 9px", fontSize: 12, outline: `2px solid ${T.expired}`, outlineOffset: 1 }}>
              <CheckCheck size={13} /> Confirm −2 pts
            </Btn>
            <Btn onClick={() => setConfirmAbandon(false)} style={{ padding: "4px 8px", fontSize: 12 }}><X size={12} /></Btn>
          </>
        ) : (
          <Btn kind="danger" disabled={locked} title={locked ? `Politically protected until Month ${p.lockUntil}` : "Click to confirm abandonment"}
            onClick={() => !locked && setConfirmAbandon(true)} style={{ padding: "4px 9px", fontSize: 12 }}><Trash2 size={13} /> Abandon</Btn>
        )}
      </div>
    </div>
  );
}

function PendingRow({ sim, p }) {
  const remaining = p.pendingUntil - sim.month;
  return (
    <div style={{ padding: "10px 12px", borderBottom: `1px solid ${T.lineSoft}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            <span style={{ color: T.faint, ...mono }}>{p.id}</span> {p.title}
          </div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 2, ...mono }}>
            Awaiting approval · BAC locked at {money(p.bacCurrent)} · starts in {remaining} month{remaining !== 1 ? "s" : ""}
          </div>
        </div>
        <Badge color={T.action}>Pending</Badge>
      </div>
    </div>
  );
}

function SuspendedRow({ sim, p, onResume, onAbandon }) {
  const remNominal = Math.max(0, p.bacCurrent - p.nominalSpent);
  const remInflated = remNominal * inflator(sim.monthlyRate, sim.month);
  return (
    <div style={{ padding: "10px 12px", borderBottom: `1px solid ${T.lineSoft}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            <span style={{ color: T.faint, ...mono }}>{p.id}</span> {p.title}
          </div>
          <div style={{ fontSize: 11, color: T.suspended, marginTop: 2, ...mono }}>
            remaining cost rising · now {money(remInflated)}
          </div>
        </div>
        <Badge color={T.suspended}>On hold</Badge>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <Btn kind="ok" onClick={() => onResume(p.id)} style={{ padding: "4px 9px", fontSize: 12 }}><RotateCcw size={13} /> Resume (+10%)</Btn>
        <Btn kind="danger" onClick={() => onAbandon(p.id)} style={{ padding: "4px 9px", fontSize: 12 }}><Trash2 size={13} /> Abandon</Btn>
      </div>
    </div>
  );
}

function CompletedRow({ sim, p, onRestore }) {
  const current = arcMonthlyFor(p, sim.month, sim.annualRate);
  const full = arcFullMonthlyFor(p, sim.month, sim.annualRate);
  const canRestore = p.arcReduced && sim.availableBalance + 1e-6 >= (p.arcBacklog || 0);
  const benefitsOn = !!sim.config?.benefitsEnabled;
  const buCurrent = benefitsOn ? benefitMonthlyFor(p, sim.month) : 0;
  return (
    <div style={{ padding: "10px 12px", borderBottom: `1px solid ${T.lineSoft}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            <span style={{ color: T.faint, ...mono }}>{p.id}</span> {p.title}
          </div>
          <div style={{ fontSize: 10.5, color: T.faint, marginTop: 1 }}>{p.subCategory} · delivered M{p.completionMonth}</div>
        </div>
        <Badge color={T.completed}>Delivered</Badge>
      </div>
      {p.arcRate > 0 && (
        p.arcReduced ? (
          <div style={{ marginTop: 6 }}>
            <div style={{ fontSize: 11, color: T.expired, ...mono }}>
              ARC reduced 30% · {money(current)}/mo (full {money(full)}/mo) · owe {money(p.arcBacklog || 0)} to restore
            </div>
            <Btn kind="ok" disabled={!canRestore} onClick={() => onRestore(p.id)}
              title={canRestore ? "Repay withheld ARC and restore full funding" : "Insufficient available balance to repay backlog"}
              style={{ padding: "4px 9px", fontSize: 12, marginTop: 6 }}>
              <RotateCcw size={13} /> Restore full funding
            </Btn>
          </div>
        ) : (
          <div style={{ fontSize: 11, color: T.arc, marginTop: 4, ...mono }}>ARC {money(current)}/mo ({pct(p.arcRate)})</div>
        )
      )}
      {(p.arcReductionCount || 0) >= 2 && (
        <div style={{ fontSize: 10.5, color: T.expired, marginTop: 4 }}>
          Reduction lever exhausted (2/2 used) — next funding cut must abandon this project.
        </div>
      )}
      {benefitsOn && p.buRate > 0 && (
        <div style={{ fontSize: 11, color: buCurrent < 0 ? T.expired : T.completed, marginTop: 4, ...mono }}>
          {buCurrent < 0 ? "Benefits negative" : p.arcReduced ? "Benefits reduced" : "Benefits"} {buCurrent.toFixed(1)} BU/mo
          {" · "}cumulative {(p.buCumulative || 0).toFixed(1)} BU ({money((p.buCumulative || 0) * BU_VALUE)})
        </div>
      )}
    </div>
  );
}

/* ============================================================
   PROJECT PREVIEW MODAL — cash-flow impact before committing
   ============================================================ */
function ProjectPreviewModal({ sim, project, onAdd, onClose }) {
  if (!project) return null;
  const bac = +(project.bacInitial * inflator(sim.monthlyRate, sim.month)).toFixed(4);
  const blind = sim.config?.blindAlignment;

  // build a hypothetical sim with the project added
  const hypothetical = useMemo(() => {
    const h = clone(sim);
    addProject(h, project.id);
    return h;
  }, [sim, project.id]);

  const baseCash = useMemo(() => projectCashflow(sim), [sim]);
  const withCash = useMemo(() => projectCashflow(hypothetical), [hypothetical]);

  // merge into a single data array for the chart
  const chartData = baseCash.map((row, i) => ({
    month: row.month,
    availBase: row.available,
    reqBase: row.required,
    reqWith: withCash[i]?.required ?? row.required,
    availWith: withCash[i]?.available ?? row.available,
  }));

  const monthlyBurnIncrease = (withCash[sim.month]?.required ?? 0) - (baseCash[sim.month]?.required ?? 0);
  const projEnd = sim.month + project.durationPlanned;
  const alignColor = project.alignment >= 0.7 ? T.completed : project.alignment >= 0.4 ? T.suspended : T.expired;
  const benefitsOn = !!sim.config?.benefitsEnabled;

  return (
    <Overlay onClose={onClose} width={680}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <Eye size={18} color={T.action} />
        <h3 style={{ margin: 0, fontSize: 16 }}>Preview: {project.title}</h3>
      </div>
      <p style={{ color: T.muted, fontSize: 12.5, margin: "0 0 14px" }}>
        See how adding this project affects your cash flow before committing.
      </p>

      {/* auto-fit lets tiles wrap to a second row instead of overflowing the modal */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(104px, 1fr))", gap: 8, marginBottom: 14 }}>
        <Stat label="BAC" value={money(bac)} sub="inflation-adjusted" labelLines={2} />
        <Stat label="Duration" value={`${project.durationPlanned}m`} sub={`ends M${projEnd}`} accent={projEnd > 60 ? T.expired : T.text} labelLines={2} />
        {!blind && <Stat label="Strategic fit" value={pct(project.alignment)} accent={alignColor} labelLines={2} />}
        <Stat label="Burn increase" value={money(monthlyBurnIncrease)} sub="per month" accent={monthlyBurnIncrease > 0 ? T.suspended : T.text} labelLines={2} />
        <Stat label="ARC rate" value={pct(project.arcRate)} sub={project.subCategory} accent={T.arc} labelLines={2} />
        {benefitsOn && <Stat label="Benefit rate" value={`${project.buRate} BU/mo`} sub={`≈ ${money(project.buRate * BU_VALUE)}/mo social value`} accent={T.completed} labelLines={2} />}
      </div>

      <div style={{ marginBottom: 6, fontSize: 11.5, fontWeight: 700, color: T.text, textTransform: "uppercase", letterSpacing: ".05em" }}>
        Cash flow impact
      </div>
      <div style={{ height: 240, marginBottom: 8 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid stroke={T.lineSoft} vertical={false} />
            <XAxis dataKey="month" stroke={T.faint} fontSize={10} tickLine={false} />
            <YAxis stroke={T.faint} fontSize={10} tickLine={false} width={40} />
            <Tooltip
              contentStyle={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 8, fontSize: 11 }}
              labelFormatter={(m) => `Month ${m}`}
              formatter={(v, n) => [money(v), { availBase: "Available (now)", availWith: "Available (+ project)", reqBase: "Required (now)", reqWith: "Required (+ project)" }[n] || n]}
            />
            <ReferenceLine x={sim.month} stroke={T.action} strokeWidth={1.5} />
            <Line type="monotone" dataKey="availBase" stroke={T.completed} strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
            <Line type="monotone" dataKey="availWith" stroke={T.completed} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="reqBase" stroke={T.expired} strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
            <Line type="monotone" dataKey="reqWith" stroke={T.expired} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: "flex", gap: 14, justifyContent: "center", fontSize: 11, color: T.muted, marginBottom: 14 }}>
        <span style={{ color: T.completed }}>── Available (now)</span>
        <span style={{ color: T.completed }}>—— Available (+ project)</span>
        <span style={{ color: T.expired }}>── Required (now)</span>
        <span style={{ color: T.expired }}>—— Required (+ project)</span>
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn kind="primary" disabled={bac > sim.availableBalance + 1e-9}
          onClick={() => { onAdd(project.id); onClose(); }}
          title={bac > sim.availableBalance + 1e-9 ? "Exceeds available funds" : "Add to portfolio"}>
          <Plus size={14} /> Select — Add to Portfolio
        </Btn>
      </div>
    </Overlay>
  );
}

/* ============================================================
   QUICK-ADD STRIP — top-3 best available projects at a glance
   ============================================================ */
function QuickAddStrip({ sim, onAdd, onPreview }) {
  const blind = sim.config?.blindAlignment;
  const monthsLeft = 61 - sim.month;
  const cap = sim.config?.concurrentCap || 0;
  const liveLive = cap > 0 ? sim.projects.filter((x) => x.state === "active" || x.state === "pending").length : 0;
  const capReached = cap > 0 && liveLive >= cap;

  const candidates = sim.projects
    .filter((p) => p.state === "available")
    .map((p) => {
      const bac = +(p.bacInitial * inflator(sim.monthlyRate, sim.month)).toFixed(4);
      return { ...p, bacShown: bac, afford: bac <= sim.availableBalance + 1e-9, finishable: p.durationPlanned <= monthsLeft };
    })
    .filter((p) => p.afford && p.finishable)
    .sort((a, b) => b.alignment - a.alignment)
    .slice(0, 3);

  const alignColor = (a) => a >= 0.7 ? T.completed : a >= 0.4 ? T.suspended : T.expired;

  if (!candidates.length) return <Empty msg="No affordable, finishable projects available." />;

  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {candidates.map((p) => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, background: T.panel, border: `1px solid ${T.line}`, borderRadius: 8, padding: "6px 10px" }}>
            <span style={{ fontSize: 11, color: T.faint, ...mono, flexShrink: 0 }}>{p.id}</span>
            <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</span>
            <span style={{ fontSize: 11.5, color: T.muted, ...mono, flexShrink: 0 }}>{money(p.bacShown)}</span>
            {!blind && <Badge color={alignColor(p.alignment)}>{pct(p.alignment)}</Badge>}
            <Btn onClick={() => onPreview(p)} title="Preview cash-flow impact" style={{ padding: "3px 7px" }}><Eye size={12} /></Btn>
            <Btn kind="primary" disabled={capReached} onClick={() => onAdd(p.id)} title={capReached ? "Cap reached" : "Add to portfolio"} style={{ padding: "3px 7px" }}><Plus size={12} /></Btn>
          </div>
        ))}
      </div>
    </div>
  );
}

function AvailableTable({ sim, onAdd, onPreview }) {
  const blind = sim.config?.blindAlignment;
  const benefitsOn = !!sim.config?.benefitsEnabled;
  const [sort, setSort] = useState(blind ? "bac" : "alignment");
  const [fAfford, setFAfford] = useState(true);
  const [fFinish, setFFinish] = useState(false);
  const [fAlign, setFAlign] = useState(false);
  const remaining = sim.availableBalance;
  const monthsLeft = 61 - sim.month;
  const cap = sim.config?.concurrentCap || 0;
  const liveLive = cap > 0 ? sim.projects.filter((x) => x.state === "active" || x.state === "pending").length : 0;
  const capReached = cap > 0 && liveLive >= cap;
  const allRows = sim.projects.filter((p) => p.state === "available").map((p) => {
    const bac = p.bacInitial * inflator(sim.monthlyRate, sim.month);
    return { ...p, bacShown: bac, afford: bac <= remaining + 1e-9 };
  });
  const rows = allRows.filter((p) =>
    (!fAfford || p.afford) &&
    (!fFinish || p.durationPlanned <= monthsLeft) &&
    (!fAlign  || p.alignment >= 0.7)
  );
  rows.sort((a, b) => {
    if (sort === "alignment" && !blind) return b.alignment - a.alignment;
    if (sort === "bac") return a.bacShown - b.bacShown;
    if (sort === "duration") return a.durationPlanned - b.durationPlanned;
    if (sort === "risk") return (b.costRisk + b.durRisk) - (a.costRisk + a.durRisk);
    return 0;
  });
  const alignColor = (a) => a >= 0.7 ? T.completed : a >= 0.4 ? T.suspended : T.expired;
  const SORTS = blind
    ? [["bac", "BAC"], ["duration", "Duration"], ["risk", "Risk"]]
    : [["alignment", "Alignment"], ["bac", "BAC"], ["duration", "Duration"], ["risk", "Risk"]];
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {/* filter chips */}
      <div style={{ display: "flex", flexShrink: 0, gap: 6, padding: "6px 8px 4px", flexWrap: "wrap", alignItems: "center" }}>
        <Chip active={fAfford} onClick={() => setFAfford(!fAfford)}>Affordable</Chip>
        <Chip active={fFinish} onClick={() => setFFinish(!fFinish)}>Can finish</Chip>
        {!blind && <Chip active={fAlign} onClick={() => setFAlign(!fAlign)}>High alignment ≥70%</Chip>}
        <span style={{ fontSize: 11, color: T.faint, marginLeft: 4 }}>
          {rows.length !== allRows.length ? `${rows.length} of ${allRows.length}` : `${allRows.length} projects`}
        </span>
      </div>
      {/* sort chips */}
      <div style={{ display: "flex", flexShrink: 0, gap: 6, padding: "0 8px 6px", flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 10, color: T.faint, textTransform: "uppercase", letterSpacing: ".05em" }}>Sort</span>
        {SORTS.map(([k, label]) => (
          <Chip key={k} active={sort === k} onClick={() => setSort(k)}>{label}</Chip>
        ))}
      </div>
      {capReached && <div style={{ flexShrink: 0, fontSize: 11.5, color: T.suspended, padding: "6px 8px", background: T.suspended + "14", borderRadius: 6, margin: "4px 8px 6px" }}>Concurrent cap reached ({liveLive}/{cap}) — complete or suspend a project before adding more.</div>}
      {rows.length === 0 && <Empty msg="No projects left in the pool." />}
      <div className="sim-pool-scroll" style={{ flex: 1, minHeight: 120, overflowY: "auto" }}>
      {rows.map((p) => (
        <div key={p.id} style={{ padding: "10px 12px", borderBottom: `1px solid ${T.lineSoft}`, opacity: (p.afford && !capReached) ? 1 : 0.5 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                <span style={{ color: T.faint, ...mono }}>{p.id}</span> {p.title}
              </div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 2, ...mono }}>
                BAC {money(p.bacShown)} · {p.durationPlanned}m
              </div>
              <div style={{ fontSize: 10.5, color: T.faint, marginTop: 1 }}>
                {p.subCategory} · Risk {pct(p.costRisk)}/{pct(p.durRisk)} · ARC {pct(p.arcRate)}{benefitsOn ? ` · ${p.buRate} BU/mo` : ""}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              {!blind && <Badge color={alignColor(p.alignment)}>{pct(p.alignment)}</Badge>}
              <Btn onClick={() => onPreview(p)} title="Preview cash-flow impact" style={{ padding: "4px 8px" }}>
                <Eye size={13} />
              </Btn>
              <Btn kind="primary" disabled={!p.afford || capReached} onClick={() => onAdd(p.id)} title={capReached ? "Concurrent cap reached" : p.afford ? "Add to portfolio" : "Exceeds available funds"} style={{ padding: "4px 8px" }}>
                <Plus size={13} />
              </Btn>
            </div>
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}

function Section({ title, count, color, children, defaultOpen = true, fill = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const outer = fill && open
    ? { marginBottom: 12, flexShrink: 0, flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }
    : { marginBottom: 12, flexShrink: 0 };
  const panelFill = fill && open
    ? { marginTop: 6, overflow: "hidden", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }
    : { marginTop: 6, overflow: "hidden" };
  return (
    <div style={outer}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", background: "transparent", border: "none", cursor: "pointer", padding: "4px 2px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 700, color: T.text, textTransform: "uppercase", letterSpacing: ".05em" }}>
          <ChevronRight size={15} style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform .15s", color: T.muted }} />
          {title} {count != null && <span style={{ color, ...mono }}>{count}</span>}
        </span>
      </button>
      {open && <Panel style={panelFill}>{children}</Panel>}
    </div>
  );
}

/* ============================================================
   SLOW MODAL  (voluntary, single project)
   ============================================================ */
function SlowModal({ sim, project, onApply, onClose }) {
  const [s, setS] = useState(0.3);
  if (!project) return null;
  const rem = project.sCurve.length;
  const newRem = Math.ceil(rem / (1 - s));
  const burnNow = project.sCurve[0] || 0;
  const projected = generateSCurve(project.bacCurrent - project.nominalSpent, newRem);
  const burnAfter = projected[0] || 0;
  return (
    <Overlay onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <Rewind size={18} color={T.suspended} />
        <h3 style={{ margin: 0, fontSize: 16 }}>Slow {project.title}</h3>
      </div>
      <p style={{ color: T.muted, fontSize: 13, margin: "0 0 16px" }}>
        Spreads the remaining {money(project.bacCurrent - project.nominalSpent)} over a longer schedule. Lower monthly burn, later finish, higher real cost.
      </p>
      <label style={{ fontSize: 12, color: T.muted }}>Slowdown — <span style={{ color: T.suspended, ...mono }}>{Math.round(s * 100)}%</span></label>
      <input type="range" min={5} max={80} step={5} value={s * 100} onChange={(e) => setS(+e.target.value / 100)}
        style={{ width: "100%", marginTop: 8, accentColor: T.suspended }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "16px 0" }}>
        <Stat label="Remaining months" value={`${rem} → ${newRem}`} />
        <Stat label="Monthly burn" value={`${money(burnNow)} → ${money(burnAfter)}`} />
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn kind="warn" onClick={() => { onApply(project.id, s); onClose(); }}><Gauge size={14} /> Apply slowdown</Btn>
      </div>
    </Overlay>
  );
}

function SpeedModal({ sim, project, onApply, onClose }) {
  const [a, setA] = useState(0.3);
  if (!project) return null;
  const rem = project.sCurve.length;
  const newRem = Math.max(1, Math.ceil(rem * (1 - a)));
  const remBudget = Math.max(0, project.bacCurrent - project.nominalSpent);
  const premium = remBudget * CRASH_K * a;
  const newBac = project.bacCurrent + premium;
  const burnNow = project.sCurve[0] || 0;
  const projected = generateSCurve(remBudget + premium, newRem);
  const burnAfter = projected[0] || 0;
  const projEndNow = project.startMonth + (project.durationCurrent || 0);
  const projEndAfter = sim.month + newRem;
  return (
    <Overlay onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <FastForward size={18} color={T.active} />
        <h3 style={{ margin: 0, fontSize: 16 }}>Speed up {project.title}</h3>
      </div>
      <p style={{ color: T.muted, fontSize: 13, margin: "0 0 16px" }}>
        Compresses the remaining schedule into fewer months — higher monthly burn now, earlier finish, plus a crash premium on the remaining cost.
      </p>
      <label style={{ fontSize: 12, color: T.muted }}>Compression — <span style={{ color: T.active, ...mono }}>{Math.round(a * 100)}%</span></label>
      <input type="range" min={5} max={60} step={5} value={a * 100} onChange={(e) => setA(+e.target.value / 100)}
        style={{ width: "100%", marginTop: 8, accentColor: T.active }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "16px 0" }}>
        <Stat label="Remaining months" value={`${rem} → ${newRem}`} />
        <Stat label="Monthly burn" value={`${money(burnNow)} → ${money(burnAfter)}`} accent={T.active} />
        <Stat label="Finishes" value={`M${projEndNow > 60 ? projEndNow + "⚠" : projEndNow} → M${projEndAfter}`} />
        <Stat label="BAC (+ crash premium)" value={`${money(project.bacCurrent)} → ${money(newBac)}`} accent={T.expired} />
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn kind="primary" onClick={() => { onApply(project.id, a); onClose(); }}><FastForward size={14} /> Apply speed-up</Btn>
      </div>
    </Overlay>
  );
}

function Overlay({ children, onClose, width = 460 }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: T.scrim, display: "grid", placeItems: "center", zIndex: 50, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: `min(${width}px, 94vw)`, background: T.panel, border: `1px solid ${T.line}`, borderRadius: 14, padding: 22, boxShadow: T.shadow }}>
        {children}
      </div>
    </div>
  );
}

function HintModal({ sim, onClose, onApply }) {
  const hint = useMemo(() => computeHint(sim), [sim]);
  const target = hint.action ? sim.projects.find((p) => p.id === hint.action.id) : null;
  return (
    <Overlay onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <Lightbulb size={18} color={hint.tone} />
        <h3 style={{ margin: 0, fontSize: 16, color: hint.tone }}>{hint.headline}</h3>
      </div>
      <ul style={{ margin: "10px 0 0", paddingLeft: 18, color: T.text }}>
        {hint.points.map((p, i) => (
          <li key={i} style={{ fontSize: 13, lineHeight: 1.55, marginBottom: 7, color: i === hint.points.length - 1 ? T.muted : T.text }}>{p}</li>
        ))}
      </ul>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
        {target && (
          <Btn kind="primary" onClick={() => { onApply(hint.action); onClose(); }}>
            {hint.action.type === "speed"
              ? <><FastForward size={14} /> Speed up {target.id}</>
              : <><Plus size={14} /> Add {target.id}</>}
          </Btn>
        )}
        <Btn onClick={onClose}>Got it</Btn>
      </div>
      <p style={{ fontSize: 11, color: T.faint, margin: "14px 0 0", lineHeight: 1.5 }}>
        Guidance is heuristic — a coaching prompt, not the only correct move. The judgement stays yours.
      </p>
    </Overlay>
  );
}

/* ============================================================
   SHORTFALL RESOLUTION  (blocking)
   ============================================================ */
function ShortfallPanel({ sim, month, onSlow, onSuspend, onAbandon, onReduceArc, onCutArc, onInsolvent, onConfirm }) {
  const demand = totalDemandAt(sim, month);
  const gap = demand - sim.availableBalance;
  const resolved = gap <= 1e-6;
  const benefitsOn = !!sim.config?.benefitsEnabled;
  const arcCandidates = sim.config?.arcEnabled
    ? sim.projects
        .filter((p) => p.state === "completed" && arcMonthlyFor(p, month, sim.annualRate) > 0)
        .map((p) => ({ p, action: (p.arcReductionCount || 0) >= 2 ? "abandon" : !p.arcReduced ? "reduce" : null }))
        .filter((c) => c.action)
        .sort((a, b) => arcMonthlyFor(b.p, month, sim.annualRate) - arcMonthlyFor(a.p, month, sim.annualRate))
    : [];
  const noMoreLevers = !resolved && actives(sim).length === 0 && arcCandidates.length === 0;
  const [confirmEnd, setConfirmEnd] = useState(false);
  return (
    <Overlay onClose={() => {}}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <AlertTriangle size={18} color={T.expired} />
        <h3 style={{ margin: 0, fontSize: 16 }}>Funding shortfall — Month {month}</h3>
      </div>
      <p style={{ color: T.muted, fontSize: 13, margin: "0 0 14px" }}>
        This month's demand exceeds available funds. Slow, suspend, or abandon active projects until demand fits the budget.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
        <Stat label="Demand" value={money(demand)} accent={T.expired} />
        <Stat label="Available" value={money(sim.availableBalance)} accent={T.completed} />
        <Stat label="Gap" value={money(Math.max(0, gap))} accent={resolved ? T.completed : T.expired} />
      </div>
      <div style={{ maxHeight: 230, overflowY: "auto", border: `1px solid ${T.line}`, borderRadius: 10 }}>
        {actives(sim).sort((a, b) => (b.sCurve[0] || 0) - (a.sCurve[0] || 0)).map((p) => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 10px", borderBottom: `1px solid ${T.lineSoft}` }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                <span style={{ color: T.faint, ...mono }}>{p.id}</span> {p.title}
              </div>
              <div style={{ fontSize: 11, color: T.muted, ...mono }}>{money((p.sCurve[0] || 0) * inflator(sim.monthlyRate, month))}/mo</div>
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              <Btn kind="warn" onClick={() => onSlow(p.id, 0.3)} title="Slow 30%" style={{ padding: "3px 7px", fontSize: 11 }}>−30%</Btn>
              <Btn kind="ghost" onClick={() => onSuspend(p.id)} style={{ padding: "3px 7px", fontSize: 11 }}><Pause size={12} /></Btn>
              <Btn kind="danger" onClick={() => onAbandon(p.id)} style={{ padding: "3px 7px", fontSize: 11 }}><Trash2 size={12} /></Btn>
            </div>
          </div>
        ))}
        {actives(sim).length === 0 && (
          <div style={{ padding: "10px 12px", fontSize: 12, color: T.faint }}>No active projects to slow, suspend, or abandon.</div>
        )}
      </div>
      {arcCandidates.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: T.arc, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>
            Completed projects consuming ARC
          </div>
          <p style={{ fontSize: 12, color: T.muted, margin: "0 0 8px" }}>
            Cutting ARC funding 30% frees cash immediately but{benefitsOn ? " cuts that asset's benefits to 40% of normal" : " degrades that asset's ongoing benefits"} and costs 2 score points each time. A project can only be reduced twice in total — after that, the lever is exhausted and the only option left is to abandon it outright, which decommissions it completely{benefitsOn ? " and flips its benefits negative" : ""}.
          </p>
          <div style={{ maxHeight: 180, overflowY: "auto", border: `1px solid ${T.line}`, borderRadius: 10 }}>
            {arcCandidates.map(({ p, action }) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 10px", borderBottom: `1px solid ${T.lineSoft}` }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    <span style={{ color: T.faint, ...mono }}>{p.id}</span> {p.title}
                  </div>
                  <div style={{ fontSize: 11, color: T.muted, ...mono }}>
                    {money(arcMonthlyFor(p, month, sim.annualRate))}/mo ARC · {p.subCategory}
                    {p.arcReductionCount ? ` · reduced ${p.arcReductionCount}× so far` : ""}
                  </div>
                </div>
                {action === "abandon" ? (
                  <Btn kind="danger" onClick={() => onCutArc(p.id)}
                    title="Reduction lever exhausted (2/2 used) — abandon the project (moves to Abandoned, full BAC counts as wasted, benefits go negative)"
                    style={{ padding: "3px 7px", fontSize: 11 }}>
                    Abandon project
                  </Btn>
                ) : (
                  <Btn kind="warn" onClick={() => onReduceArc(p.id)} title="Reduce ARC funding 30% (−2 pts)" style={{ padding: "3px 7px", fontSize: 11 }}>−30% ARC (−2 pts)</Btn>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {!resolved && (
        <div style={{ marginTop: 14, background: T.expired + "14", border: `1px solid ${T.expired}55`, borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: T.expired, marginBottom: 4 }}>
            {noMoreLevers ? "No further levers are available." : "Still short?"}
          </div>
          <p style={{ fontSize: 12, color: T.muted, margin: "0 0 8px", lineHeight: 1.5 }}>
            {noMoreLevers
              ? "Every active project has been slowed, suspended, or abandoned, and every eligible completed project's ARC funding has been cut. If the gap still can't be closed, the simulation cannot continue."
              : "If no combination of the actions above can close the gap, you can end the simulation here rather than stay stuck."}
          </p>
          {confirmEnd ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: T.expired }}>End the run now? This cannot be undone.</span>
              <Btn kind="danger" onClick={() => onInsolvent()} style={{ padding: "4px 9px", fontSize: 12 }}>
                <CheckCheck size={13} /> Confirm − end simulation (−10 pts)
              </Btn>
              <Btn onClick={() => setConfirmEnd(false)} style={{ padding: "4px 8px", fontSize: 12 }}><X size={12} /></Btn>
            </div>
          ) : (
            <Btn kind="danger" onClick={() => setConfirmEnd(true)} style={{ padding: "4px 9px", fontSize: 12 }}>
              <AlertTriangle size={13} /> End simulation — no funds available (−10 pts)
            </Btn>
          )}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <Btn kind="primary" disabled={!resolved} onClick={onConfirm}>
          Confirm & advance <ArrowRight size={14} />
        </Btn>
      </div>
    </Overlay>
  );
}

/* ============================================================
   DASHBOARD TABS
   ============================================================ */
/* ---- projected ARC for a future month m, given a probe clone still sitting at probe.month ---- */
function projectedArcAt(probe, m) {
  let total = 0;
  for (const p of probe.projects) {
    if (p.state === "completed") {
      total += arcMonthlyFor(p, m, probe.annualRate);
    } else if (p.state === "active" && p.arcRate && p.sCurve.length > 0) {
      const projCompletion = probe.month + p.sCurve.length - 1;
      if (m > projCompletion) {
        const elapsed = m - projCompletion;
        const yearIdx = Math.floor((elapsed - 1) / 12);
        total += (p.bacCurrent * p.arcRate / 12) * Math.pow(1 + probe.annualRate, yearIdx);
      }
    }
  }
  return total;
}

/* ---- single funding analysis: one object drives the Cash Flow chart, the Funds tab
   (headroom chart + schedule table), the tab warning dot and the preview adapter, so
   they can never disagree. Requirement = actual demand+ARC from history for past
   months, S-curve projection for future months. Funding = the release schedule
   (fixed at setup), identical formula for past and future. Overload is defined on
   CUMULATIVE funding vs CUMULATIVE requirement (money carries forward). ---- */
const GRAN_SPAN = { M: 1, Q: 3, Y: 12 };
function computeFundingAnalysis(sim, granularity = "M") {
  const arcOn = !!sim.config?.arcEnabled;
  const byMonth = {};
  sim.history.forEach((h) => { byMonth[h.month] = h; });
  const probe = clone(sim);
  const pfreq = probe.config?.fundingFrequency ?? 3;
  // a project counts as "slowed" while its most recent pace decision is a slow
  const slowedIds = new Set(sim.projects.filter((p) => {
    const pace = [...sim.decisions].reverse().find((d) => d.id === p.id && (d.type === "slow" || d.type === "speed"));
    return pace?.type === "slow";
  }).map((p) => p.id));

  // monthly base series: actuals up to current month-1, projection forward
  const monthly = [];
  for (let m = 1; m <= 60; m++) {
    const funding = (m - 1) % pfreq === 0 ? (probe.releaseSchedule?.[(m - 1) / pfreq] ?? probe.quarterlyRelease ?? 0) : 0;
    if (m < probe.month) {
      const h = byMonth[m];
      monthly.push({ m, funding, actualSpend: h?.demand ?? 0, arc: h?.arc ?? 0, normal: 0, slowed: 0 });
    } else {
      let normal = 0, slowed = 0;
      for (const p of actives(probe)) {
        const v = (p.sCurve[m - probe.month] || 0) * inflator(probe.monthlyRate, m);
        if (slowedIds.has(p.id)) slowed += v; else normal += v;
      }
      monthly.push({ m, funding, actualSpend: 0, arc: arcOn ? projectedArcAt(probe, m) : 0, normal, slowed });
    }
  }

  // bucket into periods (summing per-month values keeps totals exact at any granularity)
  const span = GRAN_SPAN[granularity] ?? 1;
  const nBuckets = Math.ceil(60 / span);
  const periods = [], actualSpend = [], arc = [], normalSpend = [], slowedSpend = [], perPeriodFunding = [], perPeriodRequirement = [];
  for (let b = 0; b < nBuckets; b++) {
    const slice = monthly.slice(b * span, (b + 1) * span);
    periods.push({
      key: `${granularity}${b + 1}`, label: `${granularity}${b + 1}`,
      current: slice.some((r) => r.m === sim.month),
      past: slice.every((r) => r.m < sim.month),
    });
    let f = 0, spendA = 0, arcSum = 0, nrm = 0, slw = 0;
    for (const r of slice) {
      f += r.funding; spendA += r.actualSpend; arcSum += r.arc; nrm += r.normal; slw += r.slowed;
    }
    perPeriodFunding.push(f); actualSpend.push(spendA); arc.push(arcSum);
    normalSpend.push(nrm); slowedSpend.push(slw);
    perPeriodRequirement.push(spendA + arcSum + nrm + slw);
  }

  // cumulatives, headroom, overload ranges
  const cumulativeRequirement = [], cumulativeFunding = [], net = [];
  let cr = 0, cf = 0;
  for (let i = 0; i < nBuckets; i++) {
    cr += perPeriodRequirement[i]; cf += perPeriodFunding[i];
    cumulativeRequirement.push(cr); cumulativeFunding.push(cf); net.push(cf - cr);
  }
  const eps = 1e-6 * Math.max(1, cr);   // relative epsilon: float noise never flags an overload
  const overloaded = net.map((n) => n < -eps);
  const overloadedRanges = [];
  for (let i = 0; i < nBuckets; i++) {
    if (!overloaded[i]) continue;
    const last = overloadedRanges[overloadedRanges.length - 1];
    if (last && last.toIdx === i - 1) { last.toIdx = i; last.toLabel = periods[i].label; last.worst = Math.min(last.worst, net[i]); }
    else overloadedRanges.push({ fromIdx: i, toIdx: i, fromLabel: periods[i].label, toLabel: periods[i].label, worst: net[i] });
  }
  return {
    granularity, periods, actualSpend, arc, normalSpend, slowedSpend, perPeriodFunding, perPeriodRequirement,
    cumulativeRequirement, cumulativeFunding, net, overloaded, overloadedRanges,
    totalRequirement: cr, totalFunding: cf,
  };
}

/* legacy monthly view of the analysis — kept as the data source for ProjectPreviewModal */
function projectCashflow(sim) {
  const a = computeFundingAnalysis(sim, "M");
  return a.periods.map((p, i) => ({
    month: i + 1,
    required: +(a.perPeriodRequirement[i] - a.arc[i]).toFixed(3),
    arc: +a.arc[i].toFixed(3),
    // balance available before this month's spend = headroom after it + the spend itself
    available: +Math.max(0, a.net[i] + a.perPeriodRequirement[i]).toFixed(3),
    actual: p.past,
  }));
}

/* ---- shared funding-display UI ---- */
function FundingCallout({ analysis }) {
  const over = analysis.overloadedRanges;
  const ok = over.length === 0;
  const color = ok ? FUND_OK : FUND_BAD;
  const Icon = ok ? CheckCheck : AlertTriangle;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 12, color,
      background: color + "14", border: `1px solid ${color}44`, borderRadius: 8, padding: "6px 10px" }}>
      <Icon size={14} style={{ flexShrink: 0, marginTop: 1 }} />
      <span>
        {ok
          ? "No funding overload — cumulative funding covers the cash requirement in every period."
          : <>Funding overload: {over.map((r) =>
              `${r.fromLabel}${r.toLabel !== r.fromLabel ? ` – ${r.toLabel}` : ""} (worst shortfall ${money(-r.worst)})`).join(" · ")}</>}
      </span>
    </div>
  );
}

const GRAN_LABELS = { M: "Monthly", Q: "Quarterly", Y: "Yearly" };
function GranToggle({ gran, setGran }) {
  return (
    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
      {Object.keys(GRAN_LABELS).map((g) => (
        <Chip key={g} active={gran === g} onClick={() => setGran(g)}>{GRAN_LABELS[g]}</Chip>
      ))}
    </div>
  );
}

const ChartCaption = ({ children }) => (
  <div style={{ flexShrink: 0, textAlign: "center", fontSize: 11, color: T.faint, marginTop: 4 }}>{children}</div>
);

function CashFlowTab({ sim, gran, setGran }) {
  const analysis = useMemo(() => computeFundingAnalysis(sim, gran), [sim, gran]);
  const arcOn = !!sim.config?.arcEnabled;
  const required = totalDemandAt(sim, sim.month);
  const avail = sim.availableBalance;
  const net = avail - required;
  const data = useMemo(() => analysis.periods.map((p, i) => ({
    label: p.label,
    actualSpend: +analysis.actualSpend[i].toFixed(3),
    normal: +analysis.normalSpend[i].toFixed(3),
    slowed: +analysis.slowedSpend[i].toFixed(3),
    arc: +analysis.arc[i].toFixed(3),
    cumReq: +analysis.cumulativeRequirement[i].toFixed(3),
    cumFund: +analysis.cumulativeFunding[i].toFixed(3),
  })), [analysis]);
  const currentLabel = analysis.periods.find((p) => p.current)?.label;
  const hasActuals = analysis.actualSpend.some((v) => v > 0);
  const hasSlowed = analysis.slowedSpend.some((v) => v > 0);
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflowY: "auto", paddingRight: 2 }}>
      <div style={{ flexShrink: 0, display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}><FundingCallout analysis={analysis} /></div>
        <GranToggle gran={gran} setGran={setGran} />
      </div>
      <div className="sim-chart" style={{ flexGrow: 1, flexShrink: 1, minHeight: 200, maxHeight: 440 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 0, left: -8, bottom: 0 }} barCategoryGap="25%">
            <CartesianGrid stroke={T.lineSoft} vertical={false} />
            <XAxis dataKey="label" stroke={T.faint} fontSize={10.5} tickLine={false} />
            <YAxis yAxisId="bars" stroke={T.faint} fontSize={11} tickLine={false} width={44} />
            <YAxis yAxisId="cum" orientation="right" stroke={T.faint} fontSize={11} tickLine={false} width={48} />
            <Tooltip contentStyle={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: T.muted }} formatter={(v, n) => [money(v), n]} />
            {analysis.overloadedRanges.map((r) => (
              <ReferenceArea key={r.fromIdx} yAxisId="bars" x1={analysis.periods[r.fromIdx].label} x2={analysis.periods[r.toIdx].label}
                fill={FUND_BAND} stroke="none" />
            ))}
            {currentLabel && <ReferenceLine yAxisId="bars" x={currentLabel} stroke={T.action} strokeWidth={1.5} />}
            {hasActuals && <Bar yAxisId="bars" dataKey="actualSpend" name="Actual spend" stackId="spend" fill={T.faint} opacity={0.8} />}
            <Bar yAxisId="bars" dataKey="normal" name="Project spending" stackId="spend" fill={SPEND_NORMAL} opacity={0.85} />
            {hasSlowed && <Bar yAxisId="bars" dataKey="slowed" name="Slowed projects" stackId="spend" fill={SPEND_SLOWED} opacity={0.85} />}
            {arcOn && <Bar yAxisId="bars" dataKey="arc" name="ARC (recurring)" stackId="spend" fill={T.arc} opacity={0.8} />}
            <Line yAxisId="cum" type="monotone" dataKey="cumReq" name="Total cash requirement (cum.)" stroke={FUND_BAD} strokeWidth={3.5} dot={false} />
            <Line yAxisId="cum" type="stepAfter" dataKey="cumFund" name="Cumulative funding" stroke={FUND_OK} strokeWidth={2.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div style={{ flexShrink: 0, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", fontSize: 11.5, color: T.muted, marginTop: 8 }}>
        {hasActuals && <span style={{ color: T.faint }}>■ Actual spend</span>}
        <span style={{ color: SPEND_NORMAL }}>■ Project spending</span>
        {hasSlowed && <span style={{ color: SPEND_SLOWED }}>■ Slowed projects</span>}
        {arcOn && <span style={{ color: T.arc }}>■ ARC</span>}
        <span style={{ color: FUND_BAD, fontWeight: 700 }}>— Total requirement</span>
        <span style={{ color: FUND_OK }}>— Cum. funding</span>
        <span style={{ color: T.action }}>▏Current period</span>
      </div>
      <ChartCaption>
        Bars show cash per period (left axis): blue = project spending, orange = slowed projects, purple = ARC. Thick red line = total cumulative cash requirement, green step = cumulative funding (right axis). Red bands mark underfunded periods.
      </ChartCaption>
      <div style={{ flexShrink: 0, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 10 }}>
        <Stat label={`Required · M${sim.month}`} value={money(required)} accent={required > avail ? T.expired : T.text} />
        <Stat label="Available" value={money(avail)} accent={T.completed} />
        <Stat label="Net this month" value={`${net >= 0 ? "+" : ""}${money(net)}`} accent={net >= 0 ? T.completed : T.expired} />
      </div>
    </div>
  );
}

function FundsTab({ sim, gran, setGran }) {
  const analysis = useMemo(() => computeFundingAnalysis(sim, gran), [sim, gran]);
  const data = useMemo(() => analysis.periods.map((p, i) => ({ label: p.label, net: +analysis.net[i].toFixed(3) })), [analysis]);
  const currentLabel = analysis.periods.find((p) => p.current)?.label;
  const finalNet = analysis.totalFunding - analysis.totalRequirement;
  const cell = { padding: "4px 10px", textAlign: "right", ...mono };
  const head = { ...cell, position: "sticky", top: 0, background: T.panel, color: T.muted, fontWeight: 600,
    textAlign: "right", fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".04em", borderBottom: `1px solid ${T.line}`, zIndex: 1 };
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflowY: "auto", paddingRight: 2 }}>
      <div style={{ flexShrink: 0, display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}><FundingCallout analysis={analysis} /></div>
        <GranToggle gran={gran} setGran={setGran} />
      </div>
      <div className="sim-chart" style={{ flexGrow: 0, flexShrink: 0, height: 210 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }} barCategoryGap="20%">
            <CartesianGrid stroke={T.lineSoft} vertical={false} />
            <XAxis dataKey="label" stroke={T.faint} fontSize={10.5} tickLine={false} />
            <YAxis stroke={T.faint} fontSize={11} tickLine={false} width={44} />
            <Tooltip contentStyle={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: T.muted }} formatter={(v) => [money(v), "Headroom"]} />
            <ReferenceLine y={0} stroke="#5a6268" strokeWidth={1} />
            {currentLabel && <ReferenceLine x={currentLabel} stroke={T.action} strokeWidth={1.5} />}
            <Bar dataKey="net" name="Headroom" opacity={0.85} radius={[2, 2, 0, 0]}>
              {data.map((_, i) => <Cell key={i} fill={analysis.overloaded[i] ? FUND_BAD : FUND_OK} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartCaption>
        Net funding headroom = cumulative funding − cumulative cash requirement. Red bars below zero are the periods where the portfolio runs out of money.
      </ChartCaption>
      <div style={{ flexGrow: 1, flexShrink: 0, flexBasis: "auto", minHeight: 150, maxHeight: 340, overflow: "auto", marginTop: 10, border: `1px solid ${T.lineSoft}`, borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5, color: T.text }}>
          <thead>
            <tr>
              <th style={{ ...head, textAlign: "left" }}>Period</th>
              <th style={head}>Funding release</th>
              <th style={head}>Cash requirement</th>
              <th style={head}>Cumulative funding</th>
              <th style={head}>Headroom</th>
            </tr>
          </thead>
          <tbody>
            {analysis.periods.map((p, i) => (
              <tr key={p.key} style={{
                background: analysis.overloaded[i] ? "rgba(220,53,69,0.07)" : p.current ? T.panel2 : "transparent",
                color: p.past ? T.faint : T.text,
                borderBottom: `1px solid ${T.lineSoft}`,
              }}>
                <td style={{ ...cell, textAlign: "left" }}>
                  {p.label}
                  {p.past && <span style={{ fontSize: 9.5, color: T.faint, marginLeft: 5 }}>actual</span>}
                  {p.current && <span style={{ fontSize: 9.5, color: T.action, marginLeft: 5 }}>now</span>}
                </td>
                <td style={cell}>{analysis.perPeriodFunding[i] ? money(analysis.perPeriodFunding[i]) : "—"}</td>
                <td style={cell}>{money(analysis.perPeriodRequirement[i])}</td>
                <td style={cell}>{money(analysis.cumulativeFunding[i])}</td>
                <td style={{ ...cell, color: analysis.overloaded[i] ? FUND_BAD : FUND_OK, fontWeight: 600 }}>{money(analysis.net[i])}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ position: "sticky", bottom: 0, background: T.panel, fontWeight: 700, borderTop: `2px solid ${T.line}` }}>
              <td style={{ ...cell, textAlign: "left" }}>Total</td>
              <td style={cell}>{money(analysis.totalFunding)}</td>
              <td style={cell}>{money(analysis.totalRequirement)}</td>
              <td style={cell}>{money(analysis.totalFunding)}</td>
              <td style={{ ...cell, color: finalNet < 0 ? FUND_BAD : FUND_OK }}>{money(finalNet)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function GanttTab({ sim }) {
  const portfolio = sim.projects.filter((p) => p.state !== "available");
  if (!portfolio.length) return <Empty msg="No projects in the portfolio yet. Add one from the Available pool." />;
  const W = 60;
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingRight: 4 }}>
      {portfolio.map((p) => {
        const start = p.startMonth || 1;
        let end;
        if (p.state === "completed") end = p.completionMonth;
        else if (p.state === "abandoned") {
          const dec = [...sim.decisions].reverse().find((d) => d.id === p.id && d.type === "abandon");
          end = dec ? dec.month : start;
        } else end = Math.min(60, start + (p.durationCurrent || 0));
        const left = ((start - 1) / W) * 100;
        const width = Math.max(1.5, (((end || start) - start + 1) / W) * 100);
        const color = projectColorById(sim, p.id);
        const dimmed = p.state === "suspended" || p.state === "abandoned" || p.state === "expired";
        return (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
            <div style={{ width: 128, flexShrink: 0, fontSize: 11.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              <span title={STATE_LABEL[p.state]} style={{ color: sc(p.state), fontSize: 9 }}>●</span>{" "}
              <span style={{ color: T.faint, ...mono }}>{p.id}</span> {p.title}
            </div>
            <div style={{ position: "relative", flex: 1, height: 18, background: T.panel2, borderRadius: 4 }}>
              <div style={{ position: "absolute", left: `${((sim.month - 1) / W) * 100}%`, top: -2, bottom: -2, width: 1.5, background: T.action }} />
              <div style={{ position: "absolute", left: `${left}%`, width: `${width}%`, top: 2, bottom: 2, background: color + (dimmed ? "66" : "cc"), borderRadius: 3, border: `1px solid ${color}` }}>
                {[0.25, 0.5, 0.75].map((m) => (
                  <div key={m} title={`${m * 100}%`} style={{ position: "absolute", left: `${m * 100}%`, top: 0, bottom: 0, width: 1, background: p.milestones.includes(m * 100) ? "#fff" : "#ffffff55" }} />
                ))}
                {sim.events.some((e) => e.id === p.id) && (
                  <Flag size={11} color="#fff" style={{ position: "absolute", right: 2, top: 2 }} />
                )}
              </div>
            </div>
          </div>
        );
      })}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", fontSize: 11, color: T.muted, marginTop: 10 }}>
        <span style={{ color: T.faint }}>bar colour = project · dot = status:</span>
        {Object.entries(STATE_LABEL).filter(([k]) => k !== "available").map(([k, l]) => (
          <span key={k} style={{ color: sc(k) }}>● {l}</span>
        ))}
      </div>
    </div>
  );
}

function SCurveTab({ sim }) {
  const list = sim.projects.filter((p) => ["active", "completed", "suspended", "expired"].includes(p.state) && p.sCurveBaseline.length && p.startMonth);
  const [pick, setPick] = useState("all");
  if (!list.length) return <Empty msg="Add and run projects to see their planned-versus-revised spend curves." />;
  const shown = pick === "all" ? list : list.filter((p) => p.id === pick);

  // each project's curves live on the portfolio timeline: startMonth → its own finish month.
  // value at month x = cumulative % of BAC at the END of month x, anchored at 0% on startMonth-1.
  const curves = shown.map((p) => {
    const bac = p.bacCurrent || 1;
    // baseline (original plan): % of baseline total, startMonth → planned finish
    const baseTotal = p.sCurveBaseline.reduce((a, b) => a + b, 0) || 1;
    const base = { [p.startMonth - 1]: 0 };
    let bSum = 0;
    p.sCurveBaseline.forEach((v, k) => { bSum += v; base[p.startMonth + k] = (bSum / baseTotal) * 100; });
    // current plan: recorded actual draws to date, then the remaining curve projected forward.
    // abs = cumulative nominal spend (also feeds the portfolio-total curve); cur = % of BAC.
    const abs = { [p.startMonth - 1]: 0 };
    const draws = p.drawHistory || [];
    if (draws.length) {
      let c = 0;
      draws.forEach((d) => { c += d.nom; abs[d.m] = c; });
    } else if (sim.month > p.startMonth) {
      // legacy saves without draw records: linear interpolation of what was consumed
      const consumed = Math.min(1, p.nominalSpent / bac);
      const elapsed = sim.month - p.startMonth;
      for (let k = 1; k <= elapsed; k++) abs[p.startMonth + k - 1] = consumed * bac * (k / elapsed);
    }
    let run = p.nominalSpent;
    p.sCurve.forEach((v, k) => { run += v; abs[sim.month + k] = run; });
    // flat-fill gaps (suspended months have no draw) so the line pauses instead of breaking
    const lastM = Math.max(...Object.keys(abs).map(Number));
    for (let x = p.startMonth; x <= lastM; x++) if (abs[x] == null) abs[x] = abs[x - 1];
    const cur = {};
    Object.entries(abs).forEach(([x, v]) => { cur[x] = Math.min(100, (v / bac) * 100); });
    return { p, base, cur, abs, bac, lastM };
  });
  // portfolio total (All view): every project's cumulative spend summed, as % of combined BAC;
  // a finished project's spend carries forward so the total never dips.
  const isAll = pick === "all";
  let total = null;
  if (isAll) {
    const totalBac = curves.reduce((a, c) => a + c.bac, 0) || 1;
    const maxLast = Math.min(60, Math.max(...curves.map((c) => c.lastM)));
    total = {};
    for (let x = 0; x <= maxLast; x++) {
      let s = 0;
      for (const c of curves) {
        if (x < c.p.startMonth - 1) continue;
        s += c.abs[Math.min(x, c.lastM)] ?? 0;
      }
      total[x] = Math.min(100, (s / totalBac) * 100);
    }
  }
  const data = [];
  for (let t = 0; t <= 60; t++) {
    const row = { t };
    curves.forEach(({ p, base, cur }) => {
      if (base[t] != null) row[`${p.id}_b`] = +base[t].toFixed(1);
      if (cur[t] != null) row[`${p.id}_a`] = +cur[t].toFixed(1);
    });
    if (total && total[t] != null) row.total = +total[t].toFixed(1);
    data.push(row);
  }
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ flexShrink: 0, display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        <Chip active={pick === "all"} onClick={() => setPick("all")}>All</Chip>
        {list.map((p) => (
          <Chip key={p.id} active={pick === p.id} onClick={() => setPick(p.id)} color={projectColorById(sim, p.id)}>
            <span title={STATE_LABEL[p.state]} style={{ color: sc(p.state), fontSize: 8 }}>●</span> {p.id}
          </Chip>
        ))}
      </div>
      <div className="sim-chart" style={{ flexGrow: 1, flexShrink: 1, minHeight: 0, maxHeight: 480 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
            <CartesianGrid stroke={T.lineSoft} vertical={false} />
            <XAxis dataKey="t" stroke={T.faint} fontSize={11} tickLine={false} label={{ value: "month", position: "insideBottom", offset: -2, fontSize: 10, fill: T.faint }} />
            <YAxis stroke={T.faint} fontSize={11} tickLine={false} width={40} domain={[0, 100]} />
            <Tooltip contentStyle={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 8, fontSize: 12 }} labelFormatter={(m) => `Month ${m}`} />
            <ReferenceLine x={sim.month} stroke={T.action} strokeWidth={1.5} />
            {isAll
              ? curves.map(({ p }) => (
                  <Line key={p.id + "a"} type="monotone" dataKey={`${p.id}_a`} stroke={projectColorById(sim, p.id)} strokeOpacity={0.45} strokeWidth={1.5} strokeDasharray="2 4" dot={false} />
                ))
              : curves.map(({ p }) => [
                  <Line key={p.id + "b"} type="monotone" dataKey={`${p.id}_b`} stroke={projectColorById(sim, p.id)} strokeWidth={1.5} strokeDasharray="4 4" dot={false} />,
                  <Line key={p.id + "a"} type="monotone" dataKey={`${p.id}_a`} stroke={projectColorById(sim, p.id)} strokeWidth={2} dot={false} />,
                ])}
            {isAll && <Line type="monotone" dataKey="total" name="Portfolio total" stroke={T.action} strokeWidth={3} dot={false} />}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={{ flexShrink: 0, textAlign: "center", fontSize: 11, color: T.muted, marginTop: 6 }}>
        {isAll
          ? "dotted = each project (actuals + current plan) · thick solid = portfolio total (cumulative % of combined BAC) · ▏current month"
          : "dashed = original baseline · solid = actuals + current plan (cumulative % of BAC) · ▏current month"}
      </div>
    </div>
  );
}

function KpiTab({ sim }) {
  const completed = sim.projects.filter((p) => p.state === "completed").length;
  const portfolioAligned = sim.projects.filter((p) => ["active", "completed"].includes(p.state));
  const avgAlign = portfolioAligned.length ? portfolioAligned.reduce((a, p) => a + p.alignment, 0) / portfolioAligned.length : 0;
  const used = sim.released - sim.availableBalance;
  const atRisk = actives(sim).filter((p) => {
    const projEnd = p.startMonth + (p.durationCurrent || 0);
    return projEnd > 58 || (p.sCurve[0] || 0) * inflator(sim.monthlyRate, sim.month) > sim.availableBalance * 0.5;
  }).length;
  const live = liveScore(sim);
  const arcOn = !!sim.config?.arcEnabled;
  const arcCumulative = sim.history.reduce((a, h) => a + (h.arc || 0), 0);
  const arcThisMonth = arcOn ? arcDemandAt(sim, sim.month) : 0;
  const benefitsOn = !!sim.config?.benefitsEnabled;
  const benefitTracked = sim.projects.filter(isBenefitTracked);
  const benefitsCumulative = benefitsOn ? benefitTracked.reduce((a, p) => a + (p.buCumulative || 0), 0) : 0;
  const benefitsThisMonth = benefitsOn ? benefitTracked.reduce((a, p) => a + benefitMonthlyFor(p, sim.month), 0) : 0;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 12, flex: 1, minHeight: 0, overflowY: "auto", alignContent: "start" }}>
      <Panel style={{ padding: 14, gridColumn: "span 1" }}>
        <Gauge270 value={Math.min(1, completed / Math.max(1, sim.maxComp))} label={`Delivered ${completed}/${sim.maxComp}`} color={T.completed} />
      </Panel>
      <Panel style={{ padding: 14 }}>
        <Gauge270 value={sim.released ? used / sim.released : 0} label="Budget used" color={T.action} />
      </Panel>
      <Panel style={{ padding: 14 }}>
        <Gauge270 value={live.final / 100} label={`Projected score (${live.band})`} color={live.final >= 70 ? T.completed : live.final >= 40 ? T.suspended : T.expired} />
      </Panel>
      <Stat label="Avg alignment (portfolio)" value={pct(avgAlign)} accent={avgAlign >= 0.7 ? T.completed : avgAlign >= 0.4 ? T.suspended : T.expired} />
      <Stat label="Projects at risk" value={atRisk} accent={atRisk ? T.suspended : T.text} sub="late finish or funding pressure" />
      <Stat label="Months remaining" value={Math.max(0, 61 - sim.month)} sub={`of 60 · now M${sim.month}`} />
      <Stat label="Available funds" value={money(sim.availableBalance)} accent={T.completed} />
      <Stat label="Total budget" value={money(sim.totalBudget)} sub={`release ${money(sim.quarterlyRelease)}/qtr`} />
      {arcOn
        ? <Stat label="ARC this month" value={money(arcThisMonth)} sub={`cumulative ${money(arcCumulative)} paid`} accent={T.arc} />
        : <Stat label="Integrated Budget Wallet" value="Off" sub="no recurring cost this run" />}
      {benefitsOn
        ? <>
            <Stat label="Benefits generated" value={`${benefitsCumulative.toFixed(1)} BU`} sub={`${money(benefitsCumulative * BU_VALUE)} social value`} accent={benefitsCumulative < 0 ? T.expired : T.completed} />
            <Stat label="Benefits this month" value={`${benefitsThisMonth.toFixed(1)} BU`} accent={benefitsThisMonth < 0 ? T.expired : T.completed} />
          </>
        : <Stat label="Social Benefits" value="Off" sub="no benefit tracking this run" />}
    </div>
  );
}

const Empty = ({ msg }) => (
  <div style={{ height: 300, display: "grid", placeItems: "center", color: T.faint, fontSize: 13, textAlign: "center", padding: 20 }}>{msg}</div>
);
const Chip = ({ active, onClick, children, color }) => (
  <button onClick={onClick} style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 999, cursor: "pointer", border: `1px solid ${active ? (color || T.action) : T.line}`, background: active ? (color || T.action) + "22" : "transparent", color: active ? (color || T.action) : T.muted }}>{children}</button>
);

/* ============================================================
   DECISION TIMELINE — visual dot-on-axis view of all decisions
   ============================================================ */
const DECISION_SYMBOLS = { add: "+", slow: "↓", speed: "↑", suspend: "⏸", resume: "↩", abandon: "✕", arc_reduce: "▽", arc_restore: "△", arc_cutoff: "⊘" };

function DecisionTimeline({ decisions }) {
  if (!decisions.length) return <div style={{ color: T.faint, fontSize: 12, padding: "8px 0" }}>No decisions recorded.</div>;

  // group by month for stacking
  const byMonth = {};
  decisions.forEach((d) => {
    if (!byMonth[d.month]) byMonth[d.month] = [];
    byMonth[d.month].push(d);
  });

  return (
    <div>
      {/* axis + dots */}
      <div style={{ position: "relative", height: 56, marginBottom: 6 }}>
        {/* axis line */}
        <div style={{ position: "absolute", top: 28, left: 0, right: 0, height: 2, background: T.lineSoft, borderRadius: 1 }} />
        {/* quarter ticks */}
        {Array.from({ length: 20 }, (_, qi) => (
          <div key={qi} style={{ position: "absolute", left: `${(qi / 20) * 100}%`, top: 24, width: 1, height: 10, background: qi % 4 === 0 ? T.line : T.lineSoft }} />
        ))}
        {/* decision dots */}
        {Object.entries(byMonth).map(([month, ds]) => {
          const x = ((+month - 0.5) / 60) * 100;
          return ds.map((d, di) => {
            const color = dc(d.type);
            const yOffset = di % 2 === 0 ? 8 : 36;  // alternate above/below axis
            return (
              <div key={`${month}-${di}`}
                title={`M${month} · ${d.type}${(d.s || d.a) ? ` ${Math.round((d.s || d.a) * 100)}%` : ""} · ${d.title}`}
                style={{
                  position: "absolute", left: `${x}%`, top: yOffset,
                  transform: "translateX(-50%)",
                  width: 18, height: 18, borderRadius: "50%",
                  background: color + "22", border: `1.5px solid ${color}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 700, color, cursor: "default",
                  zIndex: 1,
                }}>
                {DECISION_SYMBOLS[d.type] || "·"}
              </div>
            );
          });
        })}
      </div>
      {/* x-axis labels */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: T.faint }}>
        {[1, 12, 24, 36, 48, 60].map((m) => <span key={m}>M{m}</span>)}
      </div>
      {/* legend */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8, fontSize: 11, color: T.muted }}>
        {Object.entries(DECISION_SYMBOLS).map(([type, sym]) => (
          <span key={type} style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <span style={{ color: dc(type), fontWeight: 700 }}>{sym}</span> {type}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   DEBRIEF
   ============================================================ */
function Debrief({ sim, onRestart }) {
  const s = sim.score;
  const opt = useMemo(() => optimalBenchmark(sim), [sim]);
  const completed = sim.projects.filter((p) => p.state === "completed");
  const deliveredAlign = completed.length ? completed.reduce((a, p) => a + p.alignment, 0) / completed.length : 0;
  const poolAlign = sim.projects.reduce((a, p) => a + p.alignment, 0) / sim.projects.length;
  const [timelineView, setTimelineView] = useState(true);
  const bandColor = s.final >= 70 ? T.completed : s.final >= 40 ? T.suspended : T.expired;

  // Save to leaderboard once on mount and remember the entry for highlighting.
  // Also upload the run to the server (best-effort; local save is the fallback).
  const lbEntryRef = useRef(null);
  useEffect(() => {
    if (!lbEntryRef.current) {
      lbEntryRef.current = saveToLeaderboard(sim);
      saveRunToServer(sim);
    }
  }, []);

  const [showAssessment, setShowAssessment] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  return (
    <div style={{ minHeight: "100vh", padding: "32px 20px", display: "grid", placeItems: "start center" }}>
      <div style={{ width: "min(840px, 96vw)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Award size={24} color={bandColor} /><h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Run debrief</h1>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={() => setShowLeaderboard(true)} title="View leaderboard">
              <Award size={14} /> Leaderboard
            </Btn>
            <Btn kind="primary" onClick={() => setShowAssessment(true)} style={{ padding: "9px 14px" }}>
              <Lightbulb size={14} /> Assessment
            </Btn>
          </div>
        </div>
        <p style={{ color: T.muted, margin: "0 0 20px" }}>
          {sim.playerName && sim.playerName !== "Anonymous" ? <><strong>{sim.playerName}</strong> · </> : null}
          {sim.name} · {sim.annualRate ? (sim.annualRate * 100).toFixed(1) : 0}% inflation
          · <Badge color={T.faint}>{PRESET_LABELS[sim.config?.preset] || "Custom"}</Badge>
        </p>

        {s.insolvent && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.expired + "14", border: `1px solid ${T.expired}55`, borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
            <AlertTriangle size={16} color={T.expired} />
            <span style={{ fontSize: 13, color: T.expired, fontWeight: 600 }}>
              Simulation ended early at Month {sim.endMonth} of 60 — no funds were available to continue (−10 pts).
            </span>
          </div>
        )}

        <Panel style={{ padding: 24, display: "flex", gap: 28, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 64, fontWeight: 800, color: bandColor, lineHeight: 1, ...mono }}>{Math.round(s.final)}</div>
            <Badge color={bandColor}>{s.band}</Badge>
          </div>
          <div style={{ flex: 1, minWidth: 240, display: "grid", gap: 10 }}>
            <ScoreBar label="Delivery" value={s.delivery} max={s.deliveryMax} color={T.completed} note={`${s.completed} of ${sim.maxComp} possible`} />
            <ScoreBar label="Strategic alignment" value={s.alignment} max={s.alignmentMax} color={T.action} note={`avg ${pct(deliveredAlign)} of completed`} />
            <ScoreBar label="Budget efficiency" value={s.efficiency} max={s.efficiencyMax} color={T.suspended} note={`${pct(s.wasted)} wasted`} />
            {s.benefitsOn && (
              <ScoreBar label="Social benefits" value={s.benefits} max={15} color={T.arc}
                note={`${s.benefitsBU.toFixed(1)} of ${s.benefitsPotentialBU.toFixed(1)} potential BU`} />
            )}
            <div style={{ fontSize: 12, color: T.muted, ...mono, borderTop: `1px solid ${T.lineSoft}`, paddingTop: 8 }}>
              raw {s.raw.toFixed(1)} − penalties {s.penalty} (abandoned {s.abandoned}×2, expired {s.expired}×1{s.arcReductions ? `, ARC-reduced ${s.arcReductions}×2` : ""}{s.insolvent ? `, insolvency −10` : ""}) = <b style={{ color: T.text }}>{s.final.toFixed(1)}</b>
            </div>
          </div>
        </Panel>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <Panel style={{ padding: 18 }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>You vs the optimal portfolio</h3>
            <CompareRow label="Projects delivered" a={s.completed} b={opt.count} />
            <CompareRow label="Avg alignment delivered" a={pct(deliveredAlign)} b={pct(opt.avgAlignment)} />
            <CompareRow label="Pool average alignment" a={pct(poolAlign)} b="" mute />
            <p style={{ fontSize: 11.5, color: T.faint, margin: "10px 0 0", lineHeight: 1.5 }}>
              Optimal = greedy alignment-per-dollar selection within budget, ignoring timing and inflation. A reference, not a ceiling.
            </p>
          </Panel>
          <Panel style={{ padding: 18 }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>Outcome mix</h3>
            {["completed", "expired", "abandoned"].map((st) => {
              const n = sim.projects.filter((p) => p.state === st).length;
              return (
                <div key={st} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 88, fontSize: 12, color: sc(st) }}>{STATE_LABEL[st]}</span>
                  <div style={{ flex: 1, height: 8, background: T.panel2, borderRadius: 999 }}>
                    <div style={{ width: `${(n / 30) * 100}%`, height: "100%", background: sc(st), borderRadius: 999 }} />
                  </div>
                  <span style={{ width: 22, textAlign: "right", fontSize: 12, ...mono }}>{n}</span>
                </div>
              );
            })}
          </Panel>
        </div>

        <Panel style={{ padding: 18, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 14 }}>Decision timeline</h3>
            <div style={{ display: "flex", gap: 6 }}>
              <Chip active={timelineView} onClick={() => setTimelineView(true)}>📈 Visual</Chip>
              <Chip active={!timelineView} onClick={() => setTimelineView(false)}>📋 List</Chip>
            </div>
          </div>
          {timelineView ? (
            <DecisionTimeline decisions={sim.decisions} />
          ) : (
            <div style={{ maxHeight: 220, overflowY: "auto" }}>
              {sim.decisions.length === 0 && <div style={{ color: T.faint, fontSize: 12 }}>No decisions recorded.</div>}
              {sim.decisions.map((d, i) => (
                <div key={i} style={{ display: "flex", gap: 10, fontSize: 12.5, padding: "5px 0", borderBottom: `1px solid ${T.lineSoft}` }}>
                  <span style={{ width: 40, color: T.faint, ...mono }}>M{d.month}</span>
                  <span style={{ width: 70, color: dc(d.type), fontWeight: 600, textTransform: "capitalize" }}>{d.type}{(d.s || d.a) ? ` ${Math.round((d.s || d.a) * 100)}%` : ""}</span>
                  <span style={{ color: T.muted }}>{d.title}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Btn kind="primary" onClick={onRestart} style={{ padding: "11px 18px" }}><Play size={15} /> New run</Btn>
      </div>

      {showAssessment && <AssessmentModal sim={sim} onClose={() => setShowAssessment(false)} />}
      {showLeaderboard && <LeaderboardModal onClose={() => setShowLeaderboard(false)} highlightEntry={lbEntryRef.current} />}
    </div>
  );
}
function ScoreBar({ label, value, max, color, note }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 3 }}>
        <span>{label} <span style={{ color: T.faint }}>{note}</span></span>
        <span style={{ ...mono, color }}>{value.toFixed(1)}/{max}</span>
      </div>
      <div style={{ height: 7, background: T.panel2, borderRadius: 999 }}>
        <div style={{ width: `${(value / max) * 100}%`, height: "100%", background: color, borderRadius: 999 }} />
      </div>
    </div>
  );
}
function CompareRow({ label, a, b, mute }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0", borderBottom: `1px solid ${T.lineSoft}` }}>
      <span style={{ color: T.muted }}>{label}</span>
      <span style={{ ...mono }}>
        <b style={{ color: T.text }}>{a}</b>{b !== "" && <span style={{ color: mute ? T.faint : T.action }}> vs {b}</span>}
      </span>
    </div>
  );
}

/* ============================================================
   ASSESSMENT MODAL — personalised post-run feedback
   ============================================================ */
function AssessmentModal({ sim, onClose }) {
  const assessment = useMemo(() => generateAssessment(sim), [sim]);
  const s = sim.score || {};
  const bandColor = (s.final || 0) >= 70 ? T.completed : (s.final || 0) >= 40 ? T.suspended : T.expired;

  return (
    <Overlay onClose={onClose}>
      <div style={{ maxHeight: "80vh", overflowY: "auto", paddingRight: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <Lightbulb size={20} color={T.suspended} />
          <h3 style={{ margin: 0, fontSize: 17 }}>
            Performance Assessment{sim.playerName ? ` — ${sim.playerName}` : ""}
          </h3>
        </div>
        <p style={{ color: T.muted, fontSize: 13, margin: "0 0 16px", lineHeight: 1.5 }}>
          A personalised review of your run — what you did well, where you can improve, and the single most important lesson.
        </p>

        {/* Decision summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
          <Stat label="Projects added" value={assessment.adds} />
          <Stat label="Tempo actions" value={assessment.slows + assessment.speeds} sub={`${assessment.slows} slow · ${assessment.speeds} speed`} />
          <Stat label="Abandonments" value={assessment.abandons} />
        </div>

        {/* Strengths */}
        {assessment.strengths.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: T.completed, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
              <Award size={13} /> What you did well
            </div>
            {assessment.strengths.map((str, i) => (
              <div key={i} style={{ display: "flex", gap: 9, marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: T.completed, flexShrink: 0, fontWeight: 700 }}>✓</span>
                <span style={{ color: T.text, lineHeight: 1.55 }}>{str}</span>
              </div>
            ))}
          </div>
        )}

        {/* Improvements */}
        {assessment.improvements.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: T.suspended, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
              <ArrowRight size={13} /> Where to improve
            </div>
            {assessment.improvements.map((str, i) => (
              <div key={i} style={{ display: "flex", gap: 9, marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: T.suspended, flexShrink: 0, fontWeight: 700 }}>→</span>
                <span style={{ color: T.text, lineHeight: 1.55 }}>{str}</span>
              </div>
            ))}
          </div>
        )}

        {/* Key insight */}
        <div style={{ background: T.panel2, borderRadius: 10, padding: "12px 15px", borderLeft: `3px solid ${bandColor}`, marginBottom: 16 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 5 }}>Key insight</div>
          <div style={{ fontSize: 13.5, color: T.text, lineHeight: 1.65 }}>{assessment.keyInsight}</div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Btn kind="primary" onClick={onClose}>Close</Btn>
        </div>
      </div>
    </Overlay>
  );
}

/* ============================================================
   LEADERBOARD MODAL
   ============================================================ */
const PRESET_LABELS = { learning: "Learning", standard: "Standard", advanced: "Advanced", custom: "Custom" };

function LeaderboardModal({ onClose, highlightEntry }) {
  // Default to "all" when opened from setup (no highlightEntry); default to the run's preset from debrief
  const [activeTab, setActiveTab] = useState(highlightEntry?.preset || "all");
  // Shared leaderboard from the server, falling back to the local board when offline.
  const [board, setBoard] = useState([]);
  useEffect(() => {
    let live = true;
    (async () => {
      let rows;
      try { rows = await fetchServerLeaderboard("all", 500); }
      catch { rows = loadLeaderboard(); }
      if (live) setBoard(rows);
    })();
    return () => { live = false; };
  }, []);

  const rows = (activeTab === "all" ? board : board.filter((e) => e.preset === activeTab))
    .sort((a, b) => b.score - a.score)
    .slice(0, 50);

  return (
    <Overlay onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <Award size={20} color={T.action} />
        <h3 style={{ margin: 0, fontSize: 17 }}>Leaderboard</h3>
        <span style={{ marginLeft: "auto", fontSize: 11, color: T.faint }}>{board.length} total run{board.length !== 1 ? "s" : ""}</span>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        <Chip active={activeTab === "all"} onClick={() => setActiveTab("all")}>All</Chip>
        {Object.entries(PRESET_LABELS).map(([id, label]) => (
          <Chip key={id} active={activeTab === id} onClick={() => setActiveTab(id)}>
            {label} <span style={{ color: T.faint, fontSize: 10 }}>({board.filter(e => e.preset === id).length})</span>
          </Chip>
        ))}
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: "28px 0", textAlign: "center", color: T.faint, fontSize: 13 }}>
          No runs recorded yet{activeTab !== "all" ? <> for <strong>{PRESET_LABELS[activeTab]}</strong> mode</> : null}.<br />
          <span style={{ fontSize: 12 }}>Complete a run to appear here.</span>
        </div>
      ) : (
        <div style={{ overflowX: "auto", maxHeight: 380, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead style={{ position: "sticky", top: 0, background: T.panel }}>
              <tr style={{ borderBottom: `1px solid ${T.line}` }}>
                <th style={{ padding: "5px 6px", textAlign: "center", color: T.muted, fontWeight: 600, width: 28 }}>#</th>
                <th style={{ padding: "5px 6px", textAlign: "left", color: T.muted, fontWeight: 600 }}>Player</th>
                <th style={{ padding: "5px 6px", textAlign: "left", color: T.muted, fontWeight: 600 }}>Run</th>
                {activeTab === "all" && <th style={{ padding: "5px 6px", textAlign: "left", color: T.muted, fontWeight: 600 }}>Mode</th>}
                <th style={{ padding: "5px 6px", textAlign: "right", color: T.muted, fontWeight: 600 }}>Score</th>
                <th style={{ padding: "5px 6px", textAlign: "center", color: T.muted, fontWeight: 600 }}>✓</th>
                <th style={{ padding: "5px 6px", textAlign: "right", color: T.muted, fontWeight: 600, fontSize: 11 }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e, i) => {
                const bandColor = e.score >= 70 ? T.completed : e.score >= 40 ? T.suspended : T.expired;
                const isHighlight = highlightEntry &&
                  e.playerName === highlightEntry.playerName &&
                  e.date === highlightEntry.date &&
                  e.time === highlightEntry.time;
                return (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.lineSoft}`, background: isHighlight ? T.action + "18" : "transparent" }}>
                    <td style={{ padding: "7px 6px", textAlign: "center", color: i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : i === 2 ? "#b45309" : T.faint, fontWeight: i < 3 ? 700 : 400, ...mono }}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                    </td>
                    <td style={{ padding: "7px 6px", fontWeight: 600, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.playerName}</td>
                    <td style={{ padding: "7px 6px", color: T.muted, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.runName}</td>
                    {activeTab === "all" && <td style={{ padding: "7px 6px", color: T.faint, fontSize: 11 }}>{PRESET_LABELS[e.preset] || e.preset}</td>}
                    <td style={{ padding: "7px 6px", textAlign: "right" }}>
                      <span style={{ color: bandColor, fontWeight: 700, ...mono }}>{e.score.toFixed(1)}</span>
                      <span style={{ color: T.faint, fontSize: 10.5, marginLeft: 4 }}>{e.band}</span>
                    </td>
                    <td style={{ padding: "7px 6px", textAlign: "center", color: T.completed, fontWeight: 600, ...mono }}>{e.completed}</td>
                    <td style={{ padding: "7px 6px", textAlign: "right", color: T.faint, fontSize: 11 }}>{e.date}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
        <Btn onClick={onClose}>Close</Btn>
      </div>
    </Overlay>
  );
}

/* ============================================================
   QUARTER TIMELINE — replaces the thin progress bar in the header
   ============================================================ */
function QuarterTimeline({ sim, nextQ, projScore, blindScore }) {
  const [hoveredQ, setHoveredQ] = useState(null);
  const currentQ = Math.floor((sim.month - 1) / 3);  // 0-indexed quarter
  const tfreq = sim.config?.fundingFrequency ?? 3;
  const nextReleaseQ = (nextQ <= 60) ? Math.floor((nextQ - 1) / tfreq) : -1;

  return (
    <div style={{ flex: 1, minWidth: 200 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: T.muted, marginBottom: 5, ...mono }}>
        <span>Month {sim.month} / 60</span>
        {!blindScore && <span style={{ color: T.faint }}>proj. {Math.round(projScore)}</span>}
      </div>
      <div style={{ display: "flex", gap: 2, position: "relative" }}>
        {Array.from({ length: 20 }, (_, qi) => {
          const startM = qi * 3 + 1;
          const endM   = qi * 3 + 3;
          const isPast    = qi < currentQ;
          const isCurrent = qi === currentQ;
          const isDanger  = qi >= 16;   // Q17–Q20, months 49–60
          const isRelease = qi === nextReleaseQ;
          return (
            <div key={qi}
              onMouseEnter={() => setHoveredQ(qi)}
              onMouseLeave={() => setHoveredQ(null)}
              title={`Q${qi + 1} · M${startM}–${endM}${isDanger ? " · danger zone" : ""}${isRelease ? " · next release" : ""}`}
              style={{
                flex: 1, height: 10, borderRadius: 3, cursor: "default", position: "relative",
                background: isPast ? T.action : isCurrent ? T.action + "bb" : isDanger ? T.expired + "33" : T.panel2,
                border: `1px solid ${isCurrent ? T.action : isDanger ? T.expired + "55" : T.line}`,
                opacity: hoveredQ !== null && hoveredQ !== qi ? 0.55 : 1,
                transition: "opacity .1s",
              }}
            >
              {isCurrent && (
                <div style={{ position: "absolute", top: -4, left: "50%", transform: "translateX(-50%)", width: 7, height: 7, borderRadius: "50%", background: T.action, border: `2px solid ${T.bg}`, zIndex: 1 }} />
              )}
              {isRelease && (
                <div title="Next quarterly release" style={{ position: "absolute", bottom: -5, left: "50%", transform: "translateX(-50%)", width: 3, height: 4, background: T.completed, borderRadius: 1 }} />
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 9, color: T.faint }}>
        <span>Q1</span><span>Q5</span><span>Q10</span><span>Q15</span>
        <span style={{ color: T.expired + "bb" }}>Q20 ⚠</span>
      </div>
    </div>
  );
}

/* ============================================================
   PORTFOLIO DASHBOARD — three dial strip above the main grid
   ============================================================ */
function PortfolioDashboard({ sim }) {
  const completed = sim.projects.filter((p) => p.state === "completed");
  const active = sim.projects.filter((p) => p.state === "active");

  // a) Funding efficiency: budget committed / budget released
  const committed = sim.released - sim.availableBalance;
  const fundingEfficiency = sim.released > 0 ? Math.min(1, committed / sim.released) : 0;

  // b) Budget-weighted strategic alignment across active + completed projects
  const inPlay = [...active, ...completed];
  const totalBac = inPlay.reduce((s, p) => s + (p.bacCurrent || 0), 0);
  const weightedAlign = totalBac > 0
    ? inPlay.reduce((s, p) => s + p.alignment * (p.bacCurrent || 0), 0) / totalBac
    : 0;

  // c) Completed projects ratio
  const completedRatio = sim.maxComp > 0 ? completed.length / sim.maxComp : 0;

  const blind = sim.config?.blindAlignment;
  const arcOn = !!sim.config?.arcEnabled;
  const arcCumulative = sim.history.reduce((a, h) => a + (h.arc || 0), 0);
  const arcRunRate = arcOn ? arcDemandAt(sim, sim.month) : 0;
  const benefitsOn = !!sim.config?.benefitsEnabled;
  const benefitTracked = sim.projects.filter(isBenefitTracked);
  const benefitsCumulative = benefitsOn ? benefitTracked.reduce((a, p) => a + (p.buCumulative || 0), 0) : 0;
  const benefitsPotential = benefitsOn ? benefitTracked.reduce((a, p) => a + benefitPotentialFor(p, sim.month), 0) : 0;

  const KpiCard = ({ icon: Icon, label, bigNum, bigColor, sub, barValue, barColor }) => (
    <div style={{ flex: 1, padding: "10px 16px", borderRight: `1px solid ${T.line}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6, fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".05em" }}>
        <Icon size={12} color={T.action} /> {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: bigColor, lineHeight: 1, ...mono, marginBottom: 3 }}>{bigNum}</div>
      <div style={{ fontSize: 11.5, color: T.muted, marginBottom: 6 }}>{sub}</div>
      <div style={{ height: 4, background: T.panel2, borderRadius: 999 }}>
        <div style={{ width: `${Math.min(100, barValue * 100).toFixed(1)}%`, height: "100%", background: barColor, borderRadius: 999, transition: "width .4s" }} />
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexShrink: 0, borderBottom: `1px solid ${T.line}`, background: T.panel }}>
      <KpiCard
        icon={Zap}
        label="Funding Efficiency"
        bigNum={pct(fundingEfficiency)}
        bigColor={fundingEfficiency >= 0.8 ? T.completed : fundingEfficiency >= 0.5 ? T.action : T.suspended}
        sub={`${money(committed)} of ${money(sim.released)}`}
        barValue={fundingEfficiency}
        barColor={fundingEfficiency >= 0.8 ? T.completed : fundingEfficiency >= 0.5 ? T.action : T.suspended}
      />
      <KpiCard
        icon={Target}
        label={blind ? "Strategic Alignment (hidden)" : "Strategic Alignment"}
        bigNum={blind ? "—" : pct(weightedAlign)}
        bigColor={blind ? T.faint : weightedAlign >= 0.7 ? T.completed : weightedAlign >= 0.4 ? T.suspended : T.expired}
        sub={inPlay.length ? `${inPlay.length} project${inPlay.length !== 1 ? "s" : ""} · budget-weighted` : "No projects yet"}
        barValue={blind ? 0 : weightedAlign}
        barColor={weightedAlign >= 0.7 ? T.completed : weightedAlign >= 0.4 ? T.suspended : T.expired}
      />
      <KpiCard
        icon={Award}
        label="Completed"
        bigNum={`${completed.length}/${sim.maxComp}`}
        bigColor={completedRatio >= 0.75 ? T.completed : completedRatio >= 0.4 ? T.action : T.suspended}
        sub="projects delivered vs target"
        barValue={completedRatio}
        barColor={completedRatio >= 0.75 ? T.completed : completedRatio >= 0.4 ? T.action : T.suspended}
      />
      {arcOn && (
        <KpiCard
          icon={RotateCcw}
          label="ARC Exposure"
          bigNum={money(arcCumulative)}
          bigColor={T.arc}
          sub={`${money(arcRunRate)}/mo · ${completed.length} completed project${completed.length !== 1 ? "s" : ""}`}
          barValue={sim.totalBudget > 0 ? Math.min(1, arcCumulative / sim.totalBudget) : 0}
          barColor={T.arc}
        />
      )}
      {benefitsOn && (
        <KpiCard
          icon={Flag}
          label="Social Benefits"
          bigNum={`${benefitsCumulative.toFixed(0)} BU`}
          bigColor={benefitsCumulative < 0 ? T.expired : T.completed}
          sub={`${money(benefitsCumulative * BU_VALUE)} social value · ${benefitTracked.length} tracked`}
          barValue={benefitsPotential > 0 ? Math.max(0, Math.min(1, benefitsCumulative / benefitsPotential)) : 0}
          barColor={benefitsCumulative < 0 ? T.expired : T.completed}
        />
      )}
    </div>
  );
}

/* ============================================================
   MAIN APP
   ============================================================ */
const TABS = [
  { id: "cash", label: "Cash Flow", icon: TrendingUp },
  { id: "funds", label: "Funds", icon: BarChart3 },
  { id: "gantt", label: "Gantt", icon: LayoutGrid },
  { id: "scurve", label: "S-Curves", icon: Activity },
  { id: "devmap", label: "Development Map", icon: Building2 },
  { id: "kpi", label: "KPIs", icon: Gauge },
];

export default function App() {
  const [sim, setSim] = useState(null);
  const [tab, setTab] = useState("cash");
  const [gran, setGranState] = useState(() => {
    try { return GRAN_SPAN[localStorage.getItem("sim.granularity")] ? localStorage.getItem("sim.granularity") : "M"; } catch { return "M"; }
  });
  const setGran = (g) => { setGranState(g); try { localStorage.setItem("sim.granularity", g); } catch { /* private mode */ } };
  const [leftTab, setLeftTab] = useState("portfolio");
  const [slowTarget, setSlowTarget] = useState(null);
  const [speedTarget, setSpeedTarget] = useState(null);
  const [shortfall, setShortfall] = useState(false);
  const [hasSave, setHasSave] = useState(false);
  const [toast, setToast] = useState("");
  const [theme, setTheme] = useState("light");
  const [showHint, setShowHint] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [previewProject, setPreviewProject] = useState(null);
  const [showOverflow, setShowOverflow] = useState(false);
  const [showAdvancePreview, setShowAdvancePreview] = useState(false);
  const overflowRef = useRef(null);
  applyTheme(theme);                                   // mutate live palette before children render

  useEffect(() => { loadSession().then((s) => setHasSave(!!s)); }, []);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(""), 3500); return () => clearTimeout(t); } }, [toast]);
  useEffect(() => {
    if (!showOverflow) return;
    const h = (e) => { if (overflowRef.current && !overflowRef.current.contains(e.target)) setShowOverflow(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showOverflow]);
  // auto-switch right panel to cash flow when risk alerts fire
  useEffect(() => {
    if (sim?.alerts?.length > 0) setTab("cash");
  }, [sim?.alerts?.length]);
  // auto-switch to cash when previewing a project
  useEffect(() => {
    if (previewProject) setTab("cash");
  }, [previewProject]);

  const commit = (mut) => setSim((prev) => { const next = clone(prev); mut(next); return next; });

  // cash-crunch warning dot: any current-or-future period where cumulative funding
  // falls short of the cumulative cash requirement
  const crunchAhead = useMemo(() => {
    if (!sim || sim.status === "ended") return false;
    const a = computeFundingAnalysis(sim, "M");
    return a.overloaded.some((o, i) => o && i + 1 >= sim.month);
  }, [sim]);

  const start = (cfg) => { setSim(newSim(cfg)); setTab("cash"); };
  const resume = async () => { const s = await loadSession(); if (s) setSim(s); };
  const applyHint = (a) => {
    if (a?.type === "add") commit((n) => addProject(n, a.id));
    else if (a?.type === "speed") commit((n) => speedProject(n, a.id, a.a));
  };

  const tryAdvance = () => {
    const demand = totalDemandAt(sim, sim.month);
    if (demand > sim.availableBalance + 1e-6) { setShortfall(true); return; }
    doAdvance();
  };
  const doAdvance = () => {
    setShortfall(false);
    const next = clone(sim);
    const prevMonth = next.month;
    const rng = mkRng((next.seed + next.month * 2654435761) >>> 0);
    deductAndProgress(next, rng);
    saveSession(next);
    setSim(next);
    // build rich toast summary
    const h = next.history[next.history.length - 1];
    const justCompleted = next.projects.filter((p) => p.completionMonth === prevMonth);
    const wasRelease = ((next.month - 1) % 3 === 0);
    const qi = Math.floor((next.month - 1) / 3);
    const parts = [`Month ${prevMonth} complete`, `${money((h?.demand ?? 0) + (h?.arc ?? 0))} spent`];
    if (justCompleted.length) parts.push(`✓ ${justCompleted.map((p) => p.id).join(", ")} delivered`);
    if (next.alerts.length) parts.push(`⚠ ${next.alerts.length} risk event${next.alerts.length > 1 ? "s" : ""}`);
    if (wasRelease) parts.push(`Q${qi} released`);
    setToast(parts.join(" · "));
  };

  if (!sim) return <Shell><SetupScreen onStart={start} onResume={resume} hasSave={hasSave} /></Shell>;
  if (sim.status === "ended") return <Shell><Debrief sim={sim} onRestart={() => { setSim(null); loadSession().then((s) => setHasSave(!!s)); }} /></Shell>;

  const live = liveScore(sim);
  const simFreq = sim.config?.fundingFrequency ?? 3;
  const nextQ = sim.month + ((simFreq - ((sim.month - 1) % simFreq)) % simFreq || simFreq);
  const activeList = actives(sim);
  const suspendedList = sim.projects.filter((p) => p.state === "suspended");
  const pendingList = sim.projects.filter((p) => p.state === "pending");
  const completedList = sim.projects.filter((p) => p.state === "completed");
  const blindScore = sim.config?.blindScore;
  const demandThisMonth = totalDemandAt(sim, sim.month);
  const advanceKind = demandThisMonth > sim.availableBalance ? "danger" : demandThisMonth > sim.availableBalance * 0.8 ? "warn" : "primary";

  return (
    <Shell>
      <div className="sim-shell" style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* header */}
      <div style={{ flexShrink: 0, zIndex: 20, background: T.bg + "f2", backdropFilter: "blur(6px)", borderBottom: `1px solid ${T.line}`, padding: "10px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          {/* logo + name */}
          <div style={{ display: "flex", alignItems: "center", gap: 9, flexShrink: 0 }}>
            <Gauge size={20} color={T.action} />
            <strong style={{ fontSize: 15 }}>{sim.name}</strong>
          </div>
          {/* quarter timeline */}
          <QuarterTimeline sim={sim} nextQ={nextQ} projScore={live.final} blindScore={blindScore} />
          {/* right actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: ".05em" }}>Available</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.completed, ...mono }}>{money(sim.availableBalance)}</div>
            </div>
            <Btn onClick={() => setShowHint(true)} title="Get a hint"><Lightbulb size={15} color={T.suspended} /> Hint</Btn>
            <Btn onClick={() => setTheme(theme === "light" ? "dark" : "light")} title="Toggle light / dark">
              {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
            </Btn>
            <Btn onClick={() => { saveSession(sim); setToast("Session saved"); }} title="Save session"><Save size={15} /></Btn>
            {/* overflow menu */}
            <div ref={overflowRef} style={{ position: "relative" }}>
              <Btn onClick={() => setShowOverflow(!showOverflow)} title="More options"><MoreHorizontal size={15} /></Btn>
              {showOverflow && (
                <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: T.panel, border: `1px solid ${T.line}`, borderRadius: 10, boxShadow: T.shadow, zIndex: 30, minWidth: 160, overflow: "hidden" }}>
                  <button onClick={() => { setShowReport(true); setShowOverflow(false); }}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "transparent", border: "none", cursor: "pointer", fontSize: 13, color: T.text, textAlign: "left" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = T.panel2}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                    <FileText size={14} color={T.action} /> Status report
                  </button>
                </div>
              )}
            </div>
            {/* advance button with hover demand preview */}
            <div style={{ position: "relative" }}
              onMouseEnter={() => setShowAdvancePreview(true)}
              onMouseLeave={() => setShowAdvancePreview(false)}>
              {showAdvancePreview && (
                <div style={{ position: "absolute", bottom: "calc(100% + 8px)", right: 0, background: T.panel, border: `1px solid ${T.line}`, borderRadius: 10, padding: "12px 14px", fontSize: 12.5, zIndex: 40, minWidth: 215, boxShadow: T.shadow, pointerEvents: "none" }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: T.muted, marginBottom: 8 }}>Month {sim.month} preview</div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 4 }}>
                    <span style={{ color: T.muted }}>Demand</span>
                    <span style={{ ...mono, color: demandThisMonth > sim.availableBalance ? T.expired : T.text }}>{money(demandThisMonth)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 8 }}>
                    <span style={{ color: T.muted }}>Available</span>
                    <span style={{ ...mono, color: T.completed }}>{money(sim.availableBalance)}</span>
                  </div>
                  <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 700, color: T.text }}>Net</span>
                    <span style={{ ...mono, fontWeight: 700, color: sim.availableBalance - demandThisMonth >= 0 ? T.completed : T.expired }}>
                      {sim.availableBalance - demandThisMonth >= 0 ? "+" : ""}{money(sim.availableBalance - demandThisMonth)}
                    </span>
                  </div>
                  {nextQ <= 60 && (nextQ - sim.month) >= 1 && (nextQ - sim.month) <= 3 && (
                    <div style={{ marginTop: 8, fontSize: 11, color: T.completed }}>⚡ {FREQ_SHORT[simFreq] ?? "Q"} release in {nextQ - sim.month} month{nextQ - sim.month !== 1 ? "s" : ""} · {money(sim.quarterlyRelease)}</div>
                  )}
                </div>
              )}
              <Btn kind={advanceKind} onClick={tryAdvance} style={{ padding: "9px 16px" }}>Advance <ChevronRight size={16} /></Btn>
            </div>
          </div>
        </div>
      </div>

      <PortfolioDashboard sim={sim} />

      <div style={{ display: "grid", gridTemplateColumns: "minmax(340px, 420px) 1fr", gap: 16, padding: 16, flex: 1, minHeight: 0 }} className="sim-grid">
        {/* LEFT — decisions */}
        <div className="sim-left" style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          {sim.alerts.length > 0 && (
            <div style={{ marginBottom: 12, flexShrink: 0 }}>
              {sim.alerts.map((a, i) => (
                <div key={i} style={{ background: T.expired + "14", border: `1px solid ${T.expired}55`, borderRadius: 10, padding: "10px 12px", marginBottom: 8, position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, color: T.expired }}>
                    <AlertTriangle size={14} /> Risk event — {a.title}
                  </div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 4, ...mono }}>
                    {a.milestone}% milestone
                    {a.costDelta ? ` · cost ${a.costDelta > 0 ? "+" : ""}${(a.costDelta * 100).toFixed(0)}% → ${money(a.newBac)}` : ""}
                    {a.durDelta ? ` · duration ${a.durDelta > 0 ? "+" : ""}${(a.durDelta * 100).toFixed(0)}%` : ""}
                  </div>
                  <button onClick={() => commit((n) => { n.alerts.splice(i, 1); })} style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", color: T.muted, cursor: "pointer" }}><X size={14} /></button>
                </div>
              ))}
            </div>
          )}

          {/* left-pane tabs: Portfolio (things you hold) vs Add projects (things to acquire) */}
          <div style={{ display: "flex", flexShrink: 0, gap: 4, marginBottom: 10, background: T.panel2, padding: 3, borderRadius: 10, border: `1px solid ${T.lineSoft}` }}>
            {[
              ["portfolio", "Portfolio", activeList.length + pendingList.length + suspendedList.length],
              ["add", "Add projects", sim.projects.filter((p) => p.state === "available").length],
            ].map(([id, label, cnt]) => (
              <button key={id} onClick={() => setLeftTab(id)} style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "7px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", border: "none", borderRadius: 7,
                background: leftTab === id ? T.panel : "transparent",
                color: leftTab === id ? T.text : T.muted,
                boxShadow: leftTab === id ? "0 1px 2px #0000001f" : "none",
                textTransform: "uppercase", letterSpacing: ".04em",
              }}>
                {label} <span style={{ ...mono, color: leftTab === id ? T.action : T.faint }}>{cnt}</span>
              </button>
            ))}
          </div>

          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflowY: leftTab === "portfolio" ? "auto" : "hidden" }}>
            {leftTab === "portfolio" ? (
              <>
                <Section title="Active" count={activeList.length} color={T.active}>
                  {activeList.length ? activeList.map((p) => (
                    <ActiveRow key={p.id} sim={sim} p={p}
                      onSlow={(pr) => setSlowTarget(pr)}
                      onSpeed={(pr) => setSpeedTarget(pr)}
                      onSuspend={(id) => commit((n) => suspendProject(n, id))}
                      onAbandon={(id) => commit((n) => abandonProject(n, id))} />
                  )) : <Empty msg="No active projects. Add one from the Add projects tab." />}
                </Section>

                {pendingList.length > 0 && (
                  <Section title="Pending approval" count={pendingList.length} color={T.action}>
                    {pendingList.map((p) => <PendingRow key={p.id} sim={sim} p={p} />)}
                  </Section>
                )}

                {suspendedList.length > 0 && (
                  <Section title="Suspended" count={suspendedList.length} color={T.suspended}>
                    {suspendedList.map((p) => (
                      <SuspendedRow key={p.id} sim={sim} p={p}
                        onResume={(id) => commit((n) => resumeProject(n, id))}
                        onAbandon={(id) => commit((n) => abandonProject(n, id))} />
                    ))}
                  </Section>
                )}

                {(sim.config?.arcEnabled || sim.config?.benefitsEnabled) && completedList.length > 0 && (
                  <Section title="Completed" count={completedList.length} color={T.completed} defaultOpen={false}>
                    {completedList.map((p) => (
                      <CompletedRow key={p.id} sim={sim} p={p}
                        onRestore={(id) => commit((n) => restoreArcFunding(n, id))} />
                    ))}
                  </Section>
                )}
              </>
            ) : (
              <>
                <Section title="Top Picks" color={T.action}>
                  <QuickAddStrip sim={sim} onAdd={(id) => commit((n) => addProject(n, id))} onPreview={(p) => setPreviewProject(p)} />
                </Section>

                <Section title="Available pool" count={sim.projects.filter((p) => p.state === "available").length} color={T.available} fill>
                  <AvailableTable sim={sim} onAdd={(id) => commit((n) => addProject(n, id))} onPreview={(p) => setPreviewProject(p)} />
                </Section>
              </>
            )}
          </div>
        </div>

        {/* RIGHT — dashboard */}
        <Panel className="sim-dash" style={{ padding: 0, overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", flexShrink: 0, borderBottom: `1px solid ${T.line}` }}>
            {TABS.map((t) => {
              const Icon = t.icon;
              const hasCrunch = t.id === "cash" && crunchAhead;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  padding: "11px 8px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", background: "transparent",
                  border: "none", borderBottom: `2px solid ${tab === t.id ? T.action : "transparent"}`,
                  color: tab === t.id ? T.text : T.muted, position: "relative",
                }}>
                  <Icon size={14} /> {t.label}
                  {hasCrunch && <span title="Projected cash shortfall ahead" style={{ position: "absolute", top: 6, right: 6, width: 7, height: 7, borderRadius: "50%", background: T.expired, border: `1.5px solid ${T.panel}` }} />}
                </button>
              );
            })}
          </div>
          <div className="sim-dash-body" style={{ padding: 16, flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ flexShrink: 0, fontSize: 11, color: T.faint, marginBottom: 10 }}>
              Next {FREQ_SHORT[simFreq]?.toLowerCase() ?? "quarterly"} release: Month {nextQ <= 60 ? nextQ : "—"} · {money(sim.quarterlyRelease)}
            </div>
            {tab === "cash" && <CashFlowTab sim={sim} gran={gran} setGran={setGran} />}
            {tab === "funds" && <FundsTab sim={sim} gran={gran} setGran={setGran} />}
            {tab === "gantt" && <GanttTab sim={sim} />}
            {tab === "scurve" && <SCurveTab sim={sim} />}
            {tab === "devmap" && (
              <Suspense fallback={<div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: T.muted, fontSize: 13 }}>Loading Development Map…</div>}>
                <DevelopmentMapTab
                  sim={sim}
                  theme={theme}
                  actions={{
                    onAdd:     (id) => commit((n) => addProject(n, id)),
                    onSuspend: (id) => commit((n) => suspendProject(n, id)),
                    onResume:  (id) => commit((n) => resumeProject(n, id)),
                    onAbandon: (id) => commit((n) => abandonProject(n, id)),
                    onRestore: (id) => commit((n) => restoreArcFunding(n, id)),
                    onSlow:    (p)  => setSlowTarget(p),
                    onSpeed:   (p)  => setSpeedTarget(p),
                    onPreview: (p)  => setPreviewProject(p),
                  }}
                />
              </Suspense>
            )}
            {tab === "kpi" && <KpiTab sim={sim} />}
          </div>
        </Panel>
      </div>
      </div>

      {slowTarget && (
        <SlowModal sim={sim} project={sim.projects.find((p) => p.id === slowTarget.id)}
          onApply={(id, s) => commit((n) => slowProject(n, id, s))} onClose={() => setSlowTarget(null)} />
      )}
      {speedTarget && (
        <SpeedModal sim={sim} project={sim.projects.find((p) => p.id === speedTarget.id)}
          onApply={(id, a) => commit((n) => speedProject(n, id, a))} onClose={() => setSpeedTarget(null)} />
      )}
      {shortfall && (
        <ShortfallPanel sim={sim} month={sim.month}
          onSlow={(id, s) => commit((n) => slowProject(n, id, s))}
          onSuspend={(id) => commit((n) => suspendProject(n, id))}
          onAbandon={(id) => commit((n) => abandonProject(n, id))}
          onReduceArc={(id) => commit((n) => reduceArcFunding(n, id))}
          onCutArc={(id) => commit((n) => cutArcCompletely(n, id))}
          onInsolvent={() => { setShortfall(false); commit((n) => endInsolvent(n)); }}
          onConfirm={doAdvance} />
      )}
      {showReport && (
        <PortfolioReportModal sim={sim} onClose={() => setShowReport(false)} />
      )}
      {previewProject && (
        <ProjectPreviewModal
          sim={sim}
          project={sim.projects.find((p) => p.id === previewProject.id)}
          onAdd={(id) => commit((n) => addProject(n, id))}
          onClose={() => setPreviewProject(null)}
        />
      )}
      {showHint && (
        <HintModal sim={sim} onClose={() => setShowHint(false)} onApply={applyHint} />
      )}
      {toast && (
        <div style={{ position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)", background: T.panel, border: `1px solid ${T.line}`, borderRadius: 10, padding: "9px 16px", fontSize: 13, zIndex: 60 }}>{toast}</div>
      )}
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        input[type=range]{ height: 4px; }
        ::-webkit-scrollbar{ width:8px; height:8px; }
        ::-webkit-scrollbar-thumb{ background:${T.line}; border-radius:8px; }
        ::-webkit-scrollbar-track{ background:transparent; }
        @media (max-width: 880px){
          .sim-grid{ grid-template-columns: 1fr !important; }
          .sim-shell{ height: auto !important; overflow: visible !important; }
          .sim-dash{ height: auto !important; }
          .sim-chart{ flex: none !important; height: 320px !important; max-height: none !important; }
          .sim-pool-scroll{ overflow: visible !important; }
        }
      `}</style>
      {children}
    </div>
  );
}
