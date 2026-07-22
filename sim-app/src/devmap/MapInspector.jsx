/* ============================================================
   Development Map — inspector panel for the selected building
   Shows the project's live details and offers only the actions that are
   valid for its current state. Actions route through the callbacks in
   `actions`, which are the SAME commit()/modal calls the rest of the app
   uses — this panel owns no engine logic.
   ============================================================ */

import React from "react";
import {
  Plus, Eye, Pause, RotateCcw, Trash2, FastForward, Rewind, RefreshCw, X,
} from "lucide-react";
import { stateColor, STATE_LABELS, riskLevel } from "./mapPalette.js";
import { CATEGORY_SHORT } from "./buildingShape.js";

const money = (n) =>
  n == null ? "—" : "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "M";
const pct = (n) => Math.round(n * 100) + "%";

function Stat({ label, value, chrome }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "3px 0" }}>
      <span style={{ color: chrome.hudMuted }}>{label}</span>
      <span style={{ color: chrome.hudText, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

export default function MapInspector({ sim, project, actions, chrome, onClose }) {
  if (!project) return null;
  const p = project;
  const color = stateColor(p.state);

  // --- action gating, mirroring the engine guards in App.jsx ---
  const cap = sim.config?.concurrentCap || 0;
  const live = sim.projects.filter((x) => x.state === "active" || x.state === "pending").length;
  const capReached = cap > 0 && live >= cap;
  const politicalLocked = p.political && p.lockUntil && sim.month <= p.lockUntil;

  const benefitsOn = !!sim.config?.benefitsEnabled;
  const arcOn = !!sim.config?.arcEnabled;
  const bac = p.bacCurrent || p.bacInitial;
  const arcMonthly = bac * (p.arcRate || 0) / 12;
  const progress = p.bacCurrent > 0 && p.nominalSpent != null
    ? Math.min(1, p.nominalSpent / p.bacCurrent) : null;

  const btn = (icon, label, onClick, tone, disabled = false, title = "") => {
    const Icon = icon;
    return (
      <button
        key={label}
        onClick={onClick}
        disabled={disabled}
        title={disabled ? title : label}
        style={{
          display: "flex", alignItems: "center", gap: 6, padding: "7px 10px",
          fontSize: 12, fontWeight: 600, borderRadius: 7, cursor: disabled ? "not-allowed" : "pointer",
          border: `1px solid ${tone}${disabled ? "44" : "88"}`,
          background: disabled ? "transparent" : tone + "18",
          color: disabled ? chrome.hudMuted : tone, opacity: disabled ? 0.6 : 1,
        }}
      >
        <Icon size={14} /> {label}
      </button>
    );
  };

  const actionButtons = [];
  if (p.state === "available") {
    actionButtons.push(btn(Plus, "Add", () => actions.onAdd(p.id), "#059669", capReached, "Concurrent project cap reached"));
    actionButtons.push(btn(Eye, "Preview", () => actions.onPreview(p), "#4f46e5"));
  } else if (p.state === "active") {
    actionButtons.push(btn(Rewind, "Slow", () => actions.onSlow(p), "#d97706"));
    actionButtons.push(btn(FastForward, "Speed up", () => actions.onSpeed(p), "#2563eb"));
    actionButtons.push(btn(Pause, "Suspend", () => actions.onSuspend(p.id), "#d97706"));
    actionButtons.push(btn(Trash2, "Abandon", () => actions.onAbandon(p.id), "#d1483f", politicalLocked, "Politically locked project"));
  } else if (p.state === "suspended") {
    actionButtons.push(btn(RotateCcw, "Resume", () => actions.onResume(p.id), "#2563eb"));
    actionButtons.push(btn(Trash2, "Abandon", () => actions.onAbandon(p.id), "#d1483f", politicalLocked, "Politically locked project"));
  } else if (p.state === "completed" && p.arcReduced) {
    actionButtons.push(btn(RefreshCw, "Restore ARC funding", () => actions.onRestore(p.id), "#4f46e5"));
  }

  return (
    <div
      style={{
        position: "absolute", top: 12, right: 12, width: 262,
        background: chrome.background + "f2", border: `1px solid ${chrome.grid}`,
        borderRadius: 12, padding: 14, color: chrome.hudText, fontSize: 12,
        boxShadow: "0 10px 34px #0004", backdropFilter: "blur(4px)", pointerEvents: "auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div>
          <div style={{ fontSize: 10, color: chrome.hudMuted, fontWeight: 700, letterSpacing: 0.4 }}>{p.id}</div>
          <div style={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1.25 }}>{p.title}</div>
        </div>
        <button onClick={onClose} title="Close" style={{ background: "transparent", border: "none", cursor: "pointer", color: chrome.hudMuted, padding: 2 }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, margin: "9px 0 12px", padding: "3px 9px", borderRadius: 20, background: color + "22", border: `1px solid ${color}` }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
        <span style={{ fontWeight: 700, fontSize: 11, color }}>{STATE_LABELS[p.state] || p.state}</span>
      </div>

      <div style={{ borderTop: `1px solid ${chrome.grid}`, paddingTop: 8 }}>
        <Stat label="Category" value={CATEGORY_SHORT[p.category] || "—"} chrome={chrome} />
        <Stat label="Type" value={p.subCategory} chrome={chrome} />
        <Stat label="Budget (BAC)" value={money(bac)} chrome={chrome} />
        <Stat label="Alignment" value={pct(p.alignment)} chrome={chrome} />
        <Stat label="Risk" value={riskLevel(p)} chrome={chrome} />
        <Stat label="Duration" value={`${p.durationCurrent || p.durationPlanned} mo`} chrome={chrome} />
        {arcOn && <Stat label="ARC / month" value={money(arcMonthly)} chrome={chrome} />}
        {benefitsOn && <Stat label="Benefit Units" value={`${(p.buRate || 0).toFixed(1)}/mo`} chrome={chrome} />}
        {progress != null && (p.state === "active" || p.state === "suspended") &&
          <Stat label="Progress" value={pct(progress)} chrome={chrome} />}
      </div>

      {actionButtons.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
          {actionButtons}
        </div>
      )}
    </div>
  );
}
