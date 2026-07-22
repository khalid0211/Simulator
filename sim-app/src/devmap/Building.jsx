/* ============================================================
   Development Map — a single plot (pad + category-shaped building)
   Presentational only: receives a resolved height + colour and reports
   click/hover back up. No engine logic, no layout math.
   ============================================================ */

import React, { useState } from "react";
import { shapeForCategory } from "./buildingShape.js";

/* Category silhouettes, built from three primitives:
     · tower  — flat-top box
     · gabled — box body + 4-sided pyramid roof (house-like)
     · silo   — cylinder body + hemispherical dome cap
   `height` is the metric-driven body height; roofs/domes sit on top of it. */
function Massing({ kind, footprint, roof, height, color, emissiveIntensity }) {
  const fp = footprint;
  const mat = (
    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={emissiveIntensity} roughness={0.72} metalness={0.05} />
  );

  if (kind === "silo") {
    const r = fp / 2;
    return (
      <group>
        <mesh position={[0, height / 2, 0]} castShadow>
          <cylinderGeometry args={[r, r, height, 18]} />
          {mat}
        </mesh>
        <mesh position={[0, height, 0]} scale={[1, Math.max(0.35, roof), 1]} castShadow>
          <sphereGeometry args={[r, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          {mat}
        </mesh>
      </group>
    );
  }

  if (kind === "gabled") {
    const roofH = fp * roof;
    return (
      <group>
        <mesh position={[0, height / 2, 0]} castShadow>
          <boxGeometry args={[fp, height, fp]} />
          {mat}
        </mesh>
        <mesh position={[0, height + roofH / 2, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[fp * 0.78, roofH, 4]} />
          {mat}
        </mesh>
      </group>
    );
  }

  // tower (default)
  return (
    <mesh position={[0, height / 2, 0]} castShadow>
      <boxGeometry args={[fp, height, fp]} />
      {mat}
    </mesh>
  );
}

export default function Building({
  building,      // { id, category, x, z }
  height,        // resolved world height for the active metric
  color,         // status colour
  padColor,      // plot pad colour (scene chrome)
  accent,        // selection ring colour
  addable,       // true → project can be added right now (gold highlighted base)
  addColor,      // gold highlight colour
  selected,
  onSelect,      // (id) => void
  onHover,       // (id | null) => void
}) {
  const [hovered, setHovered] = useState(false);
  const shape = shapeForCategory(building.category);
  const fp = shape.footprint;

  const emissiveIntensity = selected ? 0.55 : hovered ? 0.32 : 0.08;

  return (
    <group position={[building.x, 0, building.z]}>
      {/* plot pad — gold + glowing when the project can be added right now */}
      <mesh position={[0, addable ? 0.09 : 0.06, 0]} receiveShadow>
        <boxGeometry args={[fp * (addable ? 1.5 : 1.3), addable ? 0.18 : 0.12, fp * (addable ? 1.5 : 1.3)]} />
        <meshStandardMaterial
          color={addable ? addColor : padColor}
          emissive={addable ? addColor : "#000000"}
          emissiveIntensity={addable ? 0.5 : 0}
          roughness={addable ? 0.5 : 0.95}
          metalness={0}
        />
      </mesh>

      {/* selection ring */}
      {selected && (
        <mesh position={[0, 0.14, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[fp * 0.92, 0.07, 10, 28]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.9} roughness={0.4} />
        </mesh>
      )}

      {/* building massing — the interactive target */}
      <group
        position={[0, 0.12, 0]}
        onClick={(e) => { e.stopPropagation(); onSelect(building.id); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); onHover(building.id); document.body.style.cursor = "pointer"; }}
        onPointerOut={(e) => { e.stopPropagation(); setHovered(false); onHover(null); document.body.style.cursor = "auto"; }}
      >
        <Massing
          kind={shape.kind}
          footprint={fp}
          roof={shape.roof}
          height={Math.max(height, 0.12)}
          color={color}
          emissiveIntensity={emissiveIntensity}
        />
      </group>
    </group>
  );
}
