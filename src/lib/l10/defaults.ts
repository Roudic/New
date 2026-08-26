export const DEFAULT_BRING_LABELS = [
  "This week's scorecard numbers (sales, labor, OSAT, SOS)",
  "Rock status — on track or off track",
  "Issues list for IDS",
  "Last week's to-dos",
  "Customer and employee headlines",
  "Personal + business good news for segue",
  "Printouts or reports to share",
  "Cascade messages for the team",
] as const;

export const L10_AGENDA = [
  {
    id: "segue",
    title: "Segue",
    minutes: 5,
    blurb: "Personal and business good news. Get everyone present.",
  },
  {
    id: "scorecard",
    title: "Scorecard",
    minutes: 5,
    blurb: "Hit the numbers. Anything off track becomes an issue.",
  },
  {
    id: "rocks",
    title: "Rock Review",
    minutes: 5,
    blurb: "On track or off track. Off-track rocks go to IDS.",
  },
  {
    id: "headlines",
    title: "Customer / Employee Headlines",
    minutes: 5,
    blurb: "One-line news. Raise anything that needs solving.",
  },
  {
    id: "todos",
    title: "To-Do List",
    minutes: 5,
    blurb: "Done or not done. Two weeks late becomes an issue.",
  },
  {
    id: "ids",
    title: "IDS",
    minutes: 60,
    blurb: "Identify, Discuss, Solve. Rank the top 3 and work them in order.",
  },
  {
    id: "conclude",
    title: "Conclude",
    minutes: 5,
    blurb: "Recap to-dos, cascade messages, rate the meeting 1–10.",
  },
] as const;

export const L10_TOTAL_MINUTES = L10_AGENDA.reduce((sum, section) => sum + section.minutes, 0);

export const STATUS_LABEL: Record<string, string> = {
  prep: "Prepping",
  ready: "Ready",
  in_meeting: "In meeting",
  done: "Wrapped",
};
