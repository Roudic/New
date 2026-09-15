import {
  SECOND_BRAIN_CATEGORIES,
  type Classification,
  type SecondBrainCategory,
} from "./types";

interface Signal {
  phrase: string;
  category: SecondBrainCategory;
  weight: number;
}

const SIGNALS: Signal[] = [
  { phrase: "sysco", category: "vendor", weight: 4 },
  { phrase: "pepsico", category: "vendor", weight: 4 },
  { phrase: "pepsi", category: "vendor", weight: 3 },
  { phrase: "coca-cola", category: "vendor", weight: 4 },
  { phrase: "coke", category: "vendor", weight: 2 },
  { phrase: "cfa supply", category: "vendor", weight: 4 },
  { phrase: "chick-fil-a supply", category: "vendor", weight: 4 },
  { phrase: "credit memo", category: "vendor", weight: 4 },
  { phrase: "order guide", category: "vendor", weight: 4 },
  { phrase: "invoice", category: "vendor", weight: 3 },
  { phrase: "vendor", category: "vendor", weight: 3 },
  { phrase: "distributor", category: "vendor", weight: 3 },
  { phrase: "delivery truck", category: "vendor", weight: 3 },
  { phrase: "truck shorted", category: "vendor", weight: 4 },
  { phrase: "shorted", category: "vendor", weight: 2 },
  { phrase: "produce", category: "vendor", weight: 2 },

  { phrase: "new hire", category: "training", weight: 4 },
  { phrase: "food safety video", category: "training", weight: 5 },
  { phrase: "pathway progress", category: "training", weight: 4 },
  { phrase: "pathway", category: "training", weight: 3 },
  { phrase: "onboarding", category: "training", weight: 4 },
  { phrase: "shadowing", category: "training", weight: 3 },
  { phrase: "shadow", category: "training", weight: 2 },
  { phrase: "trainee", category: "training", weight: 4 },
  { phrase: "trainer", category: "training", weight: 3 },
  { phrase: "training", category: "training", weight: 3 },
  { phrase: "certification", category: "training", weight: 3 },
  { phrase: "certified", category: "training", weight: 3 },

  { phrase: "guest complaint", category: "incidents", weight: 5 },
  { phrase: "incident report", category: "incidents", weight: 5 },
  { phrase: "health department", category: "incidents", weight: 5 },
  { phrase: "food safety incident", category: "incidents", weight: 5 },
  { phrase: "wrong order refund", category: "incidents", weight: 4 },
  { phrase: "incident", category: "incidents", weight: 4 },
  { phrase: "injured", category: "incidents", weight: 4 },
  { phrase: "injury", category: "incidents", weight: 4 },
  { phrase: "slipped", category: "incidents", weight: 4 },
  { phrase: "slip", category: "incidents", weight: 2 },
  { phrase: "fell", category: "incidents", weight: 3 },
  { phrase: "fall", category: "incidents", weight: 2 },
  { phrase: "complaint", category: "incidents", weight: 3 },
  { phrase: "accident", category: "incidents", weight: 4 },
  { phrase: "walkout", category: "incidents", weight: 4 },
  { phrase: "walked out", category: "incidents", weight: 4 },
  { phrase: "burn", category: "incidents", weight: 3 },
  { phrase: "police", category: "incidents", weight: 4 },
  { phrase: "ems", category: "incidents", weight: 3 },

  { phrase: "called out", category: "shift-notes", weight: 4 },
  { phrase: "call-outs", category: "shift-notes", weight: 4 },
  { phrase: "call-out", category: "shift-notes", weight: 4 },
  { phrase: "callout", category: "shift-notes", weight: 4 },
  { phrase: "no-show", category: "shift-notes", weight: 4 },
  { phrase: "drive-thru", category: "shift-notes", weight: 3 },
  { phrase: "drive thru", category: "shift-notes", weight: 3 },
  { phrase: "window time", category: "shift-notes", weight: 3 },
  { phrase: "end of night", category: "shift-notes", weight: 3 },
  { phrase: "pre-close", category: "shift-notes", weight: 3 },
  { phrase: "shift lead", category: "shift-notes", weight: 3 },
  { phrase: "closing", category: "shift-notes", weight: 2 },
  { phrase: "close was", category: "shift-notes", weight: 3 },
  { phrase: "opening", category: "shift-notes", weight: 2 },
  { phrase: "coverage", category: "shift-notes", weight: 2 },
  { phrase: "handhelds", category: "shift-notes", weight: 2 },
  { phrase: "hustle", category: "shift-notes", weight: 2 },
  { phrase: "labor", category: "shift-notes", weight: 2 },
  { phrase: "sos", category: "shift-notes", weight: 2 },
  { phrase: "boh", category: "shift-notes", weight: 2 },
  { phrase: "foh", category: "shift-notes", weight: 2 },
  { phrase: "shift", category: "shift-notes", weight: 2 },

  { phrase: "time-off", category: "schedules", weight: 4 },
  { phrase: "time off", category: "schedules", weight: 4 },
  { phrase: "shift trade", category: "schedules", weight: 4 },
  { phrase: "cover my shift", category: "schedules", weight: 4 },
  { phrase: "hours scheduled", category: "schedules", weight: 4 },
  { phrase: "availability", category: "schedules", weight: 4 },
  { phrase: "schedule", category: "schedules", weight: 3 },
  { phrase: "roster", category: "schedules", weight: 3 },
  { phrase: "pto", category: "schedules", weight: 3 },
  { phrase: "punch", category: "schedules", weight: 2 },
];

function emptyScores(): Record<SecondBrainCategory, number> {
  return {
    "shift-notes": 0,
    vendor: 0,
    training: 0,
    incidents: 0,
    schedules: 0,
    general: 0,
  };
}

function containsPhrase(text: string, phrase: string): boolean {
  const escaped = phrase
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "\\s+");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(text);
}

export function classify(title: string, body: string): Classification {
  const text = `${title}\n${body}`.trim();
  const scores = emptyScores();
  const reasons: string[] = [];

  for (const signal of SIGNALS) {
    if (!containsPhrase(text, signal.phrase)) continue;
    scores[signal.category] += signal.weight;
    reasons.push(`${signal.category}: "${signal.phrase}" (+${signal.weight})`);
  }

  const ranked = SECOND_BRAIN_CATEGORIES
    .filter((category) => category !== "general")
    .map((category) => ({ category, score: scores[category] }))
    .sort((a, b) => b.score - a.score);

  const top = ranked[0];
  const second = ranked[1];
  const ambiguous = !top || top.score === 0 || (top.score < 3 && top.score - (second?.score ?? 0) < 1);

  const category: SecondBrainCategory = ambiguous ? "general" : top.category;
  if (category === "general") {
    reasons.push(
      top && top.score > 0
        ? "signals were weak or tied — filed as general"
        : "no category signals — filed as general"
    );
  }

  const confidence =
    category === "general"
      ? Math.min(0.45, (top?.score ?? 0) / 10)
      : Math.min(0.99, top.score / (top.score + (second?.score ?? 0) + 2));

  return { category, confidence, scores, reasons };
}
