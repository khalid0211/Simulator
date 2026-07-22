/* ============================================================
   Development Map — building shape by project category
   Pure descriptors. Maps each of the simulator's 3 categories to a
   silhouette "kind" plus footprint dimensions. The rendering layer turns a
   descriptor into actual three.js geometry; this module holds no three.js so
   it stays testable and framework-free.
   ============================================================ */

/* Canonical category strings — must match ARC_CATEGORIES in App.jsx exactly. */
export const CATEGORY_KEYS = [
  "Physical Infrastructure & Transport",
  "Social Sectors (Education & Health)",
  "Agriculture, Irrigation & Resources",
];

/* Short labels for legends / tight UI. */
export const CATEGORY_SHORT = {
  "Physical Infrastructure & Transport": "Infrastructure",
  "Social Sectors (Education & Health)": "Social",
  "Agriculture, Irrigation & Resources": "Agriculture",
};

/* Shape descriptors. `footprint` is the plan-view size (world units); the
   height comes from the active metric (see mapPalette.makeHeightScale), not
   from here. `kind` tells the renderer which silhouette to build:
     · "tower"  — square slab / high-rise block   (Infrastructure & Transport)
     · "gabled" — box body + pitched roof prism    (Social Sectors)
     · "silo"   — cylinder + dome cap              (Agriculture & Resources) */
export const CATEGORY_SHAPE = {
  "Physical Infrastructure & Transport": {
    kind: "tower",
    footprint: 2.2,
    roof: 0,            // flat top
  },
  "Social Sectors (Education & Health)": {
    kind: "gabled",
    footprint: 2.4,
    roof: 0.9,          // pitched-roof height as a fraction of footprint
  },
  "Agriculture, Irrigation & Resources": {
    kind: "silo",
    footprint: 2.0,     // used as diameter for the cylinder
    roof: 0.5,          // dome cap height as a fraction of radius
  },
};

const FALLBACK_SHAPE = CATEGORY_SHAPE[CATEGORY_KEYS[0]];

export const shapeForCategory = (category) =>
  CATEGORY_SHAPE[category] || FALLBACK_SHAPE;
