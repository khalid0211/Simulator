/* ============================================================
   Development Map — inspector popup for the selected building
   A centred popup (scrim + card) scoped to the map area, so it never
   truncates regardless of how many stats/actions a project has. Available
   projects don't use this — they open the app's existing preview modal — so
   this handles ongoing/terminal states and offers only the state-valid
   actions, routed through the same commit()/modal callbacks the rest of the
   app uses. Owns no engine logic.
   ============================================================ */

import React from "react";
import {
  Pause, RotateCcw, Trash2, FastForward, Rewind, RefreshCw, X,
} from "lucide-react";
import { stateColor, STATE_LABELS, riskLevel } from "./mapPalette.js";
import { CATEGORY_SHORT } from "./buildingShape.js";

const money = (n) =>
  n == null ? "—" : "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "M";
const pct = (n) => Math.round(n * 100) + "%";

function Stat({ label, value, chrome }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "4px 0" }}>
      <span style={{ color: chrome.hudMuted }}>{label}</span>
      <span style={{ color: chrome.hudText, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

export default function MapInspector({ sim, project, actions, chrome, onClose }) {
  if (!project) return null;
  const p = project;
  const color = stateColor(p.state);

  const politicalLocked = p.political && p.lockUntil && sim.month <= p.lockUntil;
  const benefitsOn = !!sim.config?.benefitsEnabled;
  const arcOn = !!sim.config?.arcEnabled;
  const bac = p.bacCurrent || p.bacInitial;
  const arcMonthly = bac * (p.arcRate || 0) / 12;
  const progress = p.bacCurrent > 0 && p.nominalSpent != null
    ? Math.min(1, p.nominalSpent / p.bacCurrent) : null;

  // close the popup after an action so the map returns to focus
  const act = (fn) => { fn(); onClose(); };

  const btn = (icon, label, onClick, tone, disabled = false, title = "") => {
    const Icon = icon;
    return (
      <button
        key={label}
        onClick={onClick}
        disabled={disabled}
        title={disabled ? title : label}
        style={{
          display: "flex", alignItems: "center", gap: 6, padding: "9px 12px",
          fontSize: 12.5, fontWeight: 600, borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer",
          border: `1px solid ${tone}${disabled ? "44" : "88"}`,
          background: disabled ? "transparent" : tone + "18",
          color: disabled ? chrome.hudMuted : tone, opacity: disabled ? 0.6 : 1,
        }}
      >
        <Icon size={15} /> {label}
      </button>
    );
  };

  const actionButtons = [];
  if (p.state === "active") {
    actionButtons.push(btn(Rewind, "Slow", () => act(() => actions.onSlow(p)), "#d97706"));
    actionButtons.push(btn(FastForward, "Speed up", () => act(() => actions.onSpeed(p)), "#2563eb"));
    actionButtons.push(btn(Pause, "Suspend", () => act(() => actions.onSuspend(p.id)), "#d97706"));
    actionButtons.push(btn(Trash2, "Abandon", () => act(() => actions.onAbandon(p.id)), "#d1483f", politicalLocked, "Politically locked project"));
  } else if (p.state === "suspended") {
    actionButtons.push(btn(RotateCcw, "Resume", () => act(() => actions.onResume(p.id)), "#2563eb"));
    actionButtons.push(btn(Trash2, "Abandon", () => act(() => actions.onAbandon(p.id)), "#d1483f", politicalLocked, "Politically locked project"));
  } else if (p.state === "completed" && p.arcReduced) {
    actionButtons.push(btn(RefreshCw, "Restore ARC funding", () => act(() => actions.onRestore(p.id)), "#4f46e5"));
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "absolute", inset: 0, zIndex: 20, display: "flex",
        alignItems: "center", justifyContent: "center", padding: 20,
        background: "#0008", backdropFilter: "blur(1px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 300, maxWidth: "100%", maxHeight: "90%", overflowY: "auto",
          background: chrome.background, border: `1px solid ${chrome.grid}`,
          borderRadius: 14, padding: 16, color: chrome.hudText, fontSize: 12.5,
          boxShadow: "0 18px 48px #0006",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div>
            <div style={{ fontSize: 10, color: chrome.hudMuted, fontWeight: 700, letterSpacing: 0.4 }}>{p.id}</div>
            <div style={{ fontWeight: 700, fontSize: 14.5, lineHeight: 1.25 }}>{p.title}</div>
          </div>
          <button onClick={onClose} title="Close" style={{ background: "transparent", border: "none", cursor: "pointer", color: chrome.hudMuted, padding: 2 }}>
            <X size={17} />
          </button>
        </div>

        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, margin: "10px 0 12px", padding: "3px 10px", borderRadius: 20, background: color + "22", border: `1px solid ${color}` }}>
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
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
            {actionButtons}
          </div>
        )}
      </div>
    </div>
  );
}
