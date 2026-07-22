/* ============================================================
   Development Map — city layout (neighborhoods by category)
   Pure function: given the project list, place all 30 plots into three
   category "districts" on a stable grid. Deterministic — a project's world
   position depends only on its id and category, never on its state, so a
   building never jumps around the map as the run progresses.
   No three.js, no React.
   ============================================================ */

import { CATEGORY_KEYS } from "./buildingShape.js";

const CELL = 4;            // centre-to-centre spacing of plots within a district
const COLS = 4;            // plots per row inside a district grid
const DISTRICT_GAP = 8;    // gap between adjacent districts (world units)
const GROUND_PAD = 2.5;    // padding of the tinted district plane around its grid

/* District ground tints — desaturated, low-key hues intentionally kept OFF the
   status palette (no blue/green/red/amber) so a district plane can never be
   mistaken for a building's status colour. Keyed by category. */
export const DISTRICT_TINTS = {
  "Physical Infrastructure & Transport": "#7C74A8", // muted violet-grey
  "Social Sectors (Education & Health)": "#5FA1A8", // muted teal
  "Agriculture, Irrigation & Resources": "#9AA36B", // muted olive
};

const tintFor = (category) => DISTRICT_TINTS[category] || "#7C74A8";

/* Grid dimensions (in plots) for a district holding `count` members. */
function gridDims(count) {
  const cols = Math.min(Math.max(count, 1), COLS);
  const rows = Math.max(1, Math.ceil(count / COLS));
  return { cols, rows };
}

/**
 * computeLayout(projects) -> { buildings, districts, bounds }
 *
 *  buildings: [{ id, category, districtIndex, x, z }]   world positions (y is height, applied at render)
 *  districts: [{ category, index, centerX, centerZ, width, depth, tint }]
 *  bounds:    { width, depth }                          overall footprint, for camera framing
 *
 * Districts are laid left-to-right along X in CATEGORY_KEYS order and centred
 * on the origin. Within a district, members fill a COLS-wide grid ordered by
 * id (P01, P02, …) so placement is stable across re-renders.
 */
export function computeLayout(projects) {
  // Group by category, stable order by id within each group.
  const groups = CATEGORY_KEYS.map((category, index) => {
    const ids = projects
      .filter((p) => p.category === category)
      .map((p) => p.id)
      .sort((a, b) => a.localeCompare(b));
    const { cols, rows } = gridDims(ids.length);
    return {
      category,
      index,
      ids,
      cols,
      rows,
      gridWidth: cols * CELL,
      gridDepth: rows * CELL,
    };
  });

  // Total span across districts (grid widths + gaps), to centre on the origin.
  const totalWidth =
    groups.reduce((a, g) => a + g.gridWidth, 0) +
    DISTRICT_GAP * (groups.length - 1);

  const buildings = [];
  const districts = [];

  let cursorX = -totalWidth / 2; // left edge of the first district

  for (const g of groups) {
    const districtLeft = cursorX;
    const centerX = districtLeft + g.gridWidth / 2;

    // Place each member within the district grid, centred on z = 0.
    g.ids.forEach((id, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = districtLeft + col * CELL + CELL / 2;
      const z = -g.gridDepth / 2 + row * CELL + CELL / 2;
      buildings.push({ id, category: g.category, districtIndex: g.index, x, z });
    });

    districts.push({
      category: g.category,
      index: g.index,
      centerX,
      centerZ: 0,
      width: g.gridWidth + GROUND_PAD * 2,
      depth: g.gridDepth + GROUND_PAD * 2,
      tint: tintFor(g.category),
    });

    cursorX += g.gridWidth + DISTRICT_GAP;
  }

  const maxDepth = groups.reduce((a, g) => Math.max(a, g.gridDepth), 0);

  return {
    buildings,
    districts,
    bounds: {
      width: totalWidth + GROUND_PAD * 2,
      depth: maxDepth + GROUND_PAD * 2,
    },
  };
}
