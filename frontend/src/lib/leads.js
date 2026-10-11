export const STAGES = [
  { value: "new", label: "New", color: "blue" },
  { value: "contacted", label: "Contacted", color: "amber" },
  { value: "qualified", label: "Qualified", color: "green" },
  { value: "closed", label: "Closed", color: "plum" },
];

export const STAGE_OPTIONS = STAGES.map(({ value, label }) => ({
  value,
  label,
}));
export const LEAD_SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name A–Z" },
  { value: "name-desc", label: "Name Z–A" },
  { value: "company", label: "Company A–Z" },
  { value: "company-desc", label: "Company Z–A" },
  { value: "score", label: "Highest score" },
  { value: "score-asc", label: "Lowest score" },
];

export function sortLeads(leads, sort = "newest") {
  const key = sort.startsWith("name")
    ? "name"
    : sort.startsWith("company")
      ? "company"
      : sort.startsWith("score")
        ? "lead_score"
        : "created_at";
  const ascending = ["name", "company", "score-asc", "oldest"].includes(sort);
  return [...leads].sort((a, b) => {
    const value = (lead) =>
      key === "lead_score"
        ? scoreValue(lead[key])
        : key === "created_at"
          ? (parseDate(lead[key])?.getTime() ?? null)
          : String(lead[key] || "").trim() || null;
    const left = value(a);
    const right = value(b);
    if (left === null || right === null)
      return left === right ? 0 : left === null ? 1 : -1;
    const comparison =
      typeof left === "string"
        ? left.localeCompare(right, undefined, {
            sensitivity: "base",
            numeric: true,
          })
        : left - right;
    return ascending ? comparison : -comparison;
  });
}
export const HELP = {
  score:
    "A score from 0 to 100 based on the lead’s budget, requirements, timeline, and business context. It helps you prioritize; it is not a guarantee of a sale.",
  intent:
    "High-intent leads have a score of 70 or more. Review their requirements and reach out while the opportunity is fresh.",
  qualified:
    "The share of all leads that are qualified or closed. It shows how much of your pipeline has progressed beyond initial outreach.",
  pipeline:
    "Move leads from New to Contacted, Qualified, and Closed as the conversation progresses. Closed means the conversation is complete, not necessarily a won deal.",
  followup:
    "Follow-up dates are suggested from the lead’s urgency. You can choose a different date in the lead details. Dates use your device’s local timezone.",
  response:
    "A suggested reply based on the lead’s requirements. Review and personalize it before sending. This workspace never sends it automatically.",
  activity:
    "Counts leads by the date they were added. Changing the period updates this chart only; the rest of the workspace shows your complete pipeline.",
};

export function initials(name = "") {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?"
  );
}

export function scoreValue(value) {
  if (value === null || value === undefined || value === "") return null;
  const score = Number(value);
  return Number.isFinite(score)
    ? Math.round(Math.max(0, Math.min(100, score)))
    : null;
}

export function parseDate(value) {
  if (!value) return null;
  const parsed = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value,
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function dateInput(value) {
  const date = parseDate(value);
  return date ? dateKey(date) : "";
}

export function formatDate(value, options = {}) {
  const date = parseDate(value);
  return date
    ? new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        ...options,
      }).format(date)
    : "Not scheduled";
}

export function followUpState(value) {
  const date = parseDate(value);
  if (!date) return "none";
  const key = dateKey(date);
  const today = dateKey();
  return key < today ? "overdue" : key === today ? "today" : "upcoming";
}

export function activeFollowUps(leads) {
  return leads
    .filter(
      (lead) => lead.status !== "closed" && parseDate(lead.follow_up_date),
    )
    .sort((a, b) => parseDate(a.follow_up_date) - parseDate(b.follow_up_date));
}

export function getStats(leads) {
  const scored = leads.filter((lead) => scoreValue(lead.lead_score) !== null);
  const stages = STAGES.map((stage) => ({
    ...stage,
    count: leads.filter((lead) => lead.status === stage.value).length,
  }));
  const followups = activeFollowUps(leads);
  return {
    total: leads.length,
    highIntent: leads.filter(
      (lead) => scoreValue(lead.lead_score) >= 70 && lead.status !== "closed",
    ).length,
    average: scored.length
      ? Math.round(
          scored.reduce((sum, lead) => sum + scoreValue(lead.lead_score), 0) /
            scored.length,
        )
      : 0,
    qualifiedRate: leads.length
      ? Math.round(((stages[2].count + stages[3].count) / leads.length) * 100)
      : 0,
    due: followups.filter((lead) =>
      ["today", "overdue"].includes(followUpState(lead.follow_up_date)),
    ).length,
    stages,
  };
}

export function activityData(leads, days) {
  const counts = new Map();
  leads.forEach((lead) => {
    const date = parseDate(lead.created_at);
    if (date) counts.set(dateKey(date), (counts.get(dateKey(date)) || 0) + 1);
  });
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - days + index + 1);
    const key = dateKey(date);
    return {
      date: formatDate(key),
      fullDate: formatDate(key, { year: "numeric" }),
      count: counts.get(key) || 0,
    };
  });
}

export function exportLeads(leads) {
  const cell = (value) => {
    let text = String(value ?? "");
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  const keys = [
    "name",
    "email",
    "company",
    "status",
    "lead_score",
    "budget",
    "timeline",
    "follow_up_date",
  ];
  const rows = [
    [
      "Name",
      "Email",
      "Company",
      "Stage",
      "Score",
      "Budget",
      "Timeline",
      "Follow-up",
    ],
    ...leads.map((lead) => keys.map((key) => lead[key])),
  ];
  const blob = new Blob(
    ["\uFEFF", rows.map((row) => row.map(cell).join(",")).join("\r\n")],
    { type: "text/csv;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `leads-${dateKey()}.csv`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
