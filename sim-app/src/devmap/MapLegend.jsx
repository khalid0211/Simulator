/* ============================================================
   Development Map — HUD overlay: height-metric switcher + legends
   Plain DOM overlay (rendered outside the R3F Canvas). The switcher sits
   top-centre; the status/shape legend is a single horizontal bar along the
   bottom-centre, so neither overlaps the city.
   ============================================================ */

import React from "react";
import { HEIGHT_METRICS, STATE_ORDER, STATE_COLORS, STATE_LABELS } from "./mapPalette.js";
import { CATEGORY_KEYS, CATEGORY_SHORT, CATEGORY_SHAPE } from "./buildingShape.js";

const SHAPE_LABEL = { tower: "Tower", gabled: "Gabled", silo: "Silo / dome" };

export default function MapLegend({ metric, setMetric, chrome }) {
  const bar = {
    background: chrome.background + "e6",
    border: `1px solid ${chrome.grid}`,
    borderRadius: 10,
    color: chrome.hudText,
    fontSize: 11.5,
    boxShadow: "0 6px 20px #0003",
    backdropFilter: "blur(3px)",
    pointerEvents: "auto",
  };
  const swatch = (bg, radius = 3) => ({ width: 11, height: 11, borderRadius: radius, background: bg, flexShrink: 0 });
  const item = { display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" };

  return (
    <>
      {/* Height-metric switcher — top centre */}
      <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", ...bar, display: "flex", alignItems: "center", gap: 8, padding: "6px 8px 6px 12px" }}>
        <span style={{ color: chrome.hudMuted, textTransform: "uppercase", letterSpacing: 0.4, fontSize: 10, fontWeight: 700 }}>Height</span>
        <div style={{ display: "flex", gap: 4 }}>
          {HEIGHT_METRICS.map((m) => {
            const on = metric === m.key;
            return (
              <button
                key={m.key}
                onClick={() => setMetric(m.key)}
                title={`Scale building height by ${m.label}`}
                style={{
                  padding: "5px 10px", fontSize: 11.5, fontWeight: 600, cursor: "pointer",
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

      {/* Status + shape legend — bottom centre, slim two-row bar */}
      <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", ...bar, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "7px 14px", maxWidth: "96%", fontSize: 10.5 }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "3px 12px" }}>
          {STATE_ORDER.map((s) => (
            <span key={s} style={item}>
              <span style={swatch(STATE_COLORS[s], 3)} />
              {STATE_LABELS[s]}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "3px 12px", color: chrome.hudMuted }}>
          <span style={{ fontWeight: 700, letterSpacing: 0.3 }}>SHAPE:</span>
          {CATEGORY_KEYS.map((c) => (
            <span key={c} style={item}>
              <span style={swatch(chrome.hudMuted, 2)} />
              {CATEGORY_SHORT[c]} — {SHAPE_LABEL[CATEGORY_SHAPE[c].kind]}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
