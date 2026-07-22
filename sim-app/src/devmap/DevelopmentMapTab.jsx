/* ============================================================
   Development Map — 3D city view of the 30-project portfolio
   Assembles the pure-logic layout/palette with an R3F scene. Reads the live
   `sim` as its only source of truth for status/metrics; drives actions
   through `actions` (the app's existing commit()/modal callbacks). Owns no
   funding, eligibility, or scoring logic.
   ============================================================ */

import React, { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Html } from "@react-three/drei";

import Building from "./Building.jsx";
import MapLegend from "./MapLegend.jsx";
import MapInspector from "./MapInspector.jsx";
import { computeLayout } from "./cityLayout.js";
import { CATEGORY_SHORT } from "./buildingShape.js";
import {
  makeHeightScale, stateColor, STATE_LABELS, DEFAULT_METRIC, sceneChrome,
} from "./mapPalette.js";

const ACCENT = "#43D9C7"; // selection ring / HUD accent (theme-independent)

function DistrictPlane({ district, chrome }) {
  return (
    <group>
      <mesh position={[district.centerX, 0.02, district.centerZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[district.width, district.depth]} />
        <meshStandardMaterial color={district.tint} transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <Html
        position={[district.centerX, 0.05, district.centerZ + district.depth / 2 + 0.6]}
        center
        distanceFactor={26}
        style={{ pointerEvents: "none" }}
      >
        <div style={{ whiteSpace: "nowrap", fontSize: 12, fontWeight: 700, color: chrome.hudMuted, letterSpacing: 0.5, textTransform: "uppercase" }}>
          {CATEGORY_SHORT[district.category]}
        </div>
      </Html>
    </group>
  );
}

export default function DevelopmentMapTab({ sim, theme, actions }) {
  const [metric, setMetric] = useState(DEFAULT_METRIC);
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);

  const chrome = sceneChrome(theme);
  const projects = sim.projects;

  const { buildings, districts, bounds } = useMemo(() => computeLayout(projects), [projects]);
  const heightScale = useMemo(() => makeHeightScale(metric, projects), [metric, projects]);
  const byId = useMemo(() => {
    const m = {};
    for (const p of projects) m[p.id] = p;
    return m;
  }, [projects]);

  const selected = selectedId ? byId[selectedId] : null;
  const hovered = hoveredId ? byId[hoveredId] : null;
  const hoveredPos = hoveredId ? buildings.find((b) => b.id === hoveredId) : null;

  const camDist = Math.max(bounds.width, 30) * 0.62;

  return (
    <div style={{ position: "relative", flex: 1, minHeight: 320, borderRadius: 10, overflow: "hidden", background: chrome.background }}>
      <Canvas
        camera={{ position: [0, camDist * 0.78, camDist], fov: 42, near: 0.1, far: 500 }}
        onPointerMissed={() => setSelectedId(null)}
        dpr={[1, 2]}
      >
        <color attach="background" args={[chrome.background]} />
        <ambientLight intensity={chrome.ambient} />
        <directionalLight position={[24, 34, 18]} intensity={chrome.directional} />
        <directionalLight position={[-20, 18, -14]} intensity={chrome.directional * 0.35} />

        {/* ground + grid */}
        <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[bounds.width + 40, bounds.depth + 60]} />
          <meshStandardMaterial color={chrome.ground} roughness={1} metalness={0} />
        </mesh>
        <Grid
          position={[0, 0.01, 0]}
          args={[bounds.width + 40, bounds.depth + 60]}
          cellSize={4}
          cellColor={chrome.grid}
          sectionSize={16}
          sectionColor={chrome.grid}
          fadeDistance={camDist * 3}
          fadeStrength={1}
          infiniteGrid={false}
        />

        {districts.map((d) => (
          <DistrictPlane key={d.category} district={d} chrome={chrome} />
        ))}

        {buildings.map((b) => {
          const p = byId[b.id];
          if (!p) return null;
          return (
            <Building
              key={b.id}
              building={b}
              height={heightScale(p)}
              color={stateColor(p.state)}
              padColor={chrome.grid}
              accent={ACCENT}
              selected={selectedId === b.id}
              onSelect={setSelectedId}
              onHover={setHoveredId}
            />
          );
        })}

        {/* hover tooltip */}
        {hovered && hoveredPos && (
          <Html
            position={[hoveredPos.x, heightScale(hovered) + 1.4, hoveredPos.z]}
            center
            distanceFactor={20}
            style={{ pointerEvents: "none" }}
          >
            <div style={{
              whiteSpace: "nowrap", fontSize: 12, padding: "4px 8px", borderRadius: 6,
              background: chrome.background + "f2", border: `1px solid ${chrome.grid}`,
              color: chrome.hudText, boxShadow: "0 4px 14px #0004",
            }}>
              <strong>{hovered.id}</strong> {hovered.title}
              <span style={{ color: stateColor(hovered.state), fontWeight: 700 }}> · {STATE_LABELS[hovered.state]}</span>
            </div>
          </Html>
        )}

        <OrbitControls
          target={[0, 1.5, 0]}
          enablePan
          enableDamping
          maxPolarAngle={Math.PI / 2.15}
          minDistance={10}
          maxDistance={bounds.width * 1.8 + 40}
        />
      </Canvas>

      <MapLegend metric={metric} setMetric={setMetric} chrome={chrome} />
      {selected && (
        <MapInspector
          sim={sim}
          project={selected}
          actions={actions}
          chrome={chrome}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
