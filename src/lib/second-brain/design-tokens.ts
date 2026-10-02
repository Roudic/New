/**
 * Second Brain visual tokens (JS).
 * Keep hexes in sync with src/app/brain/brain.css and docs/brain-design.md.
 * Visual only — do not use these to invent live Drive / Calendar / Notion data.
 */

export const BRAIN_CATEGORY_COLORS = {
  "shift-notes": "#4C9BE0",
  vendor: "#E8A317",
  training: "#2DB8A0",
  incidents: "#E85A48",
  schedules: "#8B7AE8",
  general: "#B08978",
} as const;

/** Map node + dashboard chip colors. `drive` is reserved for live Drive files. */
export const MAP_CATEGORY_COLORS: Record<string, string> = {
  "shift-notes": BRAIN_CATEGORY_COLORS["shift-notes"],
  vendor: BRAIN_CATEGORY_COLORS.vendor,
  training: BRAIN_CATEGORY_COLORS.training,
  incidents: BRAIN_CATEGORY_COLORS.incidents,
  schedules: BRAIN_CATEGORY_COLORS.schedules,
  general: BRAIN_CATEGORY_COLORS.general,
  inbox: "#F0A87A",
  drive: "#3EC4E0",
};

/** Accents for connector panel chrome. Not a signal that the app is connected. */
export const BRAIN_CONNECTOR_COLORS = {
  drive: "#3EC4E0",
  calendar: "#F0B429",
  notion: "#6B66D8",
} as const;

export const BRAIN_MAP_THEME = {
  bgInner: "#2A1812",
  bgOuter: "#0C0908",
  linkNote: "rgba(246, 235, 227, 0.32)",
  linkDrive: "rgba(62, 196, 224, 0.55)",
  selectedFill: "#FFF8F2",
  selectedStroke: "#FFF8F2",
  nodeStroke: "rgba(12, 9, 8, 0.55)",
  labelStroke: "rgba(12, 9, 8, 0.88)",
  labelFill: "#F6EBE3",
  fallbackNode: BRAIN_CATEGORY_COLORS.general,
} as const;
