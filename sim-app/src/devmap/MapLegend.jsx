/* ============================================================
   Development Map — HUD overlay: height-metric switcher + legends
   Plain DOM overlay (rendered outside the R3F Canvas).
   ============================================================ */

import React from "react";
import { HEIGHT_METRICS, STATE_ORDER, STATE_COLORS, STATE_LABELS } from "./mapPalette.js";
import { CATEGORY_KEYS, CATEGORY_SHORT, CATEGORY_SHAPE } from "./buildingShape.js";

const SHAPE_LABEL = { tower: "Tower", gabled: "Gabled", silo: "Silo / dome" };

export default function MapLegend({ metric, setMetric, chrome }) {
  const panel = {
    background: chrome.background + "e6",
    border: `1px solid ${chrome.grid}`,
    borderRadius: 10,
    padding: "10px 12px",
    color: chrome.hudText,
    fontSize: 11.5,
    lineHeight: 1.4,
    boxShadow: "0 6px 20px #0003",
    backdropFilter: "blur(3px)",
    pointerEvents: "auto",
  };
  const swatch = (bg, extra) => ({
    width: 11, height: 11, borderRadius: 3, background: bg, flexShrink: 0, ...extra,
  });

  return (
    <>
      {/* Height metric switcher — top-left */}
      <div style={{ position: "absolute", top: 12, left: 12, ...panel }}>
        <div style={{ fontWeight: 700, marginBottom: 6, color: chrome.hudMuted, textTransform: "uppercase", letterSpacing: 0.4, fontSize: 10 }}>
          Building height
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {HEIGHT_METRICS.map((m) => {
            const on = metric === m.key;
            return (
              <button
                key={m.key}
                onClick={() => setMetric(m.key)}
                title={`Scale building height by ${m.label}`}
                style={{
                  padding: "5px 9px", fontSize: 11.5, fontWeight: 600, cursor: "pointer",
                  borderRadius: 6, border: `1px solid ${on ? chrome.hudText : chrome.grid}`,
                  background: on ? chrome.hudText : "transparent",
                  color: on ? chrome.background : chrome.hudMuted,
                }}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Status + shape legend — bottom-left */}
      <div style={{ position: "absolute", bottom: 12, left: 12, ...panel, maxWidth: 220 }}>
        <div style={{ fontWeight: 700, marginBottom: 6, color: chrome.hudMuted, textTransform: "uppercase", letterSpacing: 0.4, fontSize: 10 }}>
          Status
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 12px", marginBottom: 10 }}>
          {STATE_ORDER.map((s) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={swatch(STATE_COLORS[s])} />
              <span>{STATE_LABELS[s]}</span>
            </div>
          ))}
        </div>
        <div style={{ fontWeight: 700, marginBottom: 6, color: chrome.hudMuted, textTransform: "uppercase", letterSpacing: 0.4, fontSize: 10 }}>
          Shape = category
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {CATEGORY_KEYS.map((c) => (
            <div key={c} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={swatch(chrome.hudMuted, { borderRadius: 2 })} />
              <span>{CATEGORY_SHORT[c]} — {SHAPE_LABEL[CATEGORY_SHAPE[c].kind]}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
