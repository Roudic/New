import type { ChecklistTemplate } from "./types";

export const checklistTemplates: ChecklistTemplate[] = [
  {
    id: "store-opening",
    name: "Store Opening",
    description:
      "Daily opening procedures to get the location ready before customers arrive.",
    category: "opening",
    schedule: "daily",
    estimatedMinutes: 25,
    items: [
      {
        id: "open-1",
        title: "Unlock doors and disable alarm",
        type: "checkbox",
        required: true,
        trainingNote: "Verify alarm panel shows 'Ready' before opening doors.",
      },
      {
        id: "open-2",
        title: "Turn on lights, HVAC, and music",
        type: "checkbox",
        required: true,
      },
      {
        id: "open-3",
        title: "Walk-through complete — store is clean and presentable",
        type: "yes_no",
        required: true,
        description: "Floors swept, tables set, restrooms stocked.",
      },
      {
        id: "open-4",
        title: "Front-of-house photo proof",
        type: "photo",
        required: true,
        description: "Capture the dining area from the entrance.",
      },
      {
        id: "open-5",
        title: "Cash drawer counted and verified",
        type: "number",
        required: true,
        description: "Enter opening cash amount in dollars.",
      },
      {
        id: "open-6",
        title: "Opening notes for next shift",
        type: "text",
        required: false,
      },
    ],
  },
  {
    id: "store-closing",
    name: "Store Closing",
    description:
      "End-of-day checklist to secure the location and prep for tomorrow.",
    category: "closing",
    schedule: "daily",
    estimatedMinutes: 30,
    items: [
      {
        id: "close-1",
        title: "All customers exited and doors locked",
        type: "checkbox",
        required: true,
      },
      {
        id: "close-2",
        title: "Kitchen equipment powered down",
        type: "yes_no",
        required: true,
        trainingNote: "Grill off, fryers filtered, hood lights off.",
      },
      {
        id: "close-3",
        title: "Refrigerator temperature",
        type: "temperature",
        required: true,
        minTemp: 33,
        maxTemp: 41,
        description: "Record walk-in cooler temp (°F).",
      },
      {
        id: "close-4",
        title: "Freezer temperature",
        type: "temperature",
        required: true,
        minTemp: -10,
        maxTemp: 0,
        description: "Record walk-in freezer temp (°F).",
      },
      {
        id: "close-5",
        title: "Restrooms cleaned and stocked",
        type: "photo",
        required: true,
        description: "Photo of each restroom after cleaning.",
      },
      {
        id: "close-6",
        title: "Closing cash count",
        type: "number",
        required: true,
      },
      {
        id: "close-7",
        title: "Alarm set and building secured",
        type: "checkbox",
        required: true,
      },
    ],
  },
  {
    id: "food-safety-temps",
    name: "Food Safety Temperature Log",
    description:
      "Critical temperature checks for food safety compliance and health inspections.",
    category: "food_safety",
    schedule: "per_shift",
    estimatedMinutes: 15,
    items: [
      {
        id: "fs-1",
        title: "Hot holding station #1",
        type: "temperature",
        required: true,
        minTemp: 135,
        maxTemp: 180,
        trainingNote: "Hot-held food must stay at 135°F or above.",
      },
      {
        id: "fs-2",
        title: "Cold prep line",
        type: "temperature",
        required: true,
        minTemp: 33,
        maxTemp: 41,
      },
      {
        id: "fs-3",
        title: "Sanitizer bucket concentration verified",
        type: "yes_no",
        required: true,
        description: "Test strip shows correct ppm range.",
      },
      {
        id: "fs-4",
        title: "Handwashing stations stocked",
        type: "checkbox",
        required: true,
      },
      {
        id: "fs-5",
        title: "Date labels applied to all prep items",
        type: "yes_no",
        required: true,
      },
      {
        id: "fs-6",
        title: "Corrective action notes (if any temps out of range)",
        type: "text",
        required: false,
      },
    ],
  },
  {
    id: "shift-change",
    name: "Shift Change Handoff",
    description:
      "Pass critical information between outgoing and incoming team members.",
    category: "shift",
    schedule: "per_shift",
    estimatedMinutes: 10,
    items: [
      {
        id: "shift-1",
        title: "Outstanding customer issues communicated",
        type: "yes_no",
        required: true,
      },
      {
        id: "shift-2",
        title: "Equipment issues or maintenance needs",
        type: "text",
        required: true,
        description: "List anything broken, low stock, or needing manager attention.",
      },
      {
        id: "shift-3",
        title: "Cash drawer reconciled",
        type: "checkbox",
        required: true,
      },
      {
        id: "shift-4",
        title: "Workstation photo — ready for next shift",
        type: "photo",
        required: true,
      },
      {
        id: "shift-5",
        title: "Incoming shift lead confirms handoff",
        type: "checkbox",
        required: true,
      },
    ],
  },
  {
    id: "dining-cleaning",
    name: "Dining Room Standards",
    description:
      "Brand-standard cleaning checklist with photo accountability.",
    category: "cleaning",
    schedule: "daily",
    estimatedMinutes: 20,
    items: [
      {
        id: "clean-1",
        title: "Tables sanitized and reset",
        type: "checkbox",
        required: true,
      },
      {
        id: "clean-2",
        title: "Floors swept and mopped",
        type: "checkbox",
        required: true,
      },
      {
        id: "clean-3",
        title: "Condiment station restocked and wiped",
        type: "yes_no",
        required: true,
      },
      {
        id: "clean-4",
        title: "Dining room photo proof",
        type: "photo",
        required: true,
        trainingNote: "Capture wide angle showing all seating areas.",
      },
      {
        id: "clean-5",
        title: "Trash emptied and liners replaced",
        type: "checkbox",
        required: true,
      },
    ],
  },
  {
    id: "weekly-audit",
    name: "Weekly Deep Clean Audit",
    description:
      "Manager audit for weekly deep-clean tasks and brand compliance.",
    category: "audit",
    schedule: "weekly",
    estimatedMinutes: 45,
    items: [
      {
        id: "audit-1",
        title: "Ceiling vents and light fixtures cleaned",
        type: "yes_no",
        required: true,
      },
      {
        id: "audit-2",
        title: "Behind-equipment deep clean completed",
        type: "yes_no",
        required: true,
      },
      {
        id: "audit-3",
        title: "Grease trap / hood filter inspection",
        type: "checkbox",
        required: true,
      },
      {
        id: "audit-4",
        title: "Storage area organized — FIFO verified",
        type: "yes_no",
        required: true,
      },
      {
        id: "audit-5",
        title: "Audit photo documentation",
        type: "photo",
        required: true,
        description: "Photo of any areas flagged for follow-up.",
      },
      {
        id: "audit-6",
        title: "Audit score (0–100)",
        type: "number",
        required: true,
      },
      {
        id: "audit-7",
        title: "Manager follow-up action items",
        type: "text",
        required: false,
      },
    ],
  },
];

export function getTemplateById(id: string): ChecklistTemplate | undefined {
  return checklistTemplates.find((t) => t.id === id);
}
