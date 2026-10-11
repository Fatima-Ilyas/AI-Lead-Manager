import { dateKey } from "../lib/leads";

const people = [
  [
    "Olivia Rhye",
    "olivia@northstar.example",
    "Northstar Studio",
    "$18,000",
    "Within 2 weeks",
    92,
    "new",
    -1,
    0,
    "A complete website refresh with a new brand system and a client booking flow.",
  ],
  [
    "Phoenix Baker",
    "phoenix@layers.example",
    "Layers",
    "$12,500",
    "This month",
    86,
    "qualified",
    -2,
    0,
    "A customer onboarding experience for a growing product team.",
  ],
  [
    "Lana Steiner",
    "lana@sisyphus.example",
    "Sisyphus",
    "$8,000",
    "Within 3 weeks",
    78,
    "contacted",
    -3,
    -1,
    "An inbound lead generation campaign with landing pages and reporting.",
  ],
  [
    "Demi Wilkinson",
    "demi@catalog.example",
    "Catalog",
    "$24,000",
    "Next month",
    95,
    "qualified",
    -4,
    1,
    "A refreshed ecommerce experience and a six-month creative partnership.",
  ],
  [
    "Drew Cano",
    "drew@circooles.example",
    "Circooles",
    "$5,500",
    "Within 6 weeks",
    62,
    "new",
    -5,
    2,
    "A focused brand strategy workshop and a set of reusable social templates.",
  ],
  [
    "Natali Craig",
    "natali@hourglass.example",
    "Hourglass",
    "$15,000",
    "Next month",
    81,
    "contacted",
    -5,
    3,
    "A website and positioning project for a new consulting practice.",
  ],
  [
    "Andi Lane",
    "andi@command.example",
    "Command+R",
    "$9,500",
    "Within 4 weeks",
    73,
    "new",
    -7,
    1,
    "A product launch campaign and a reusable content design system.",
  ],
  [
    "Kate Morrison",
    "kate@quotient.example",
    "Quotient",
    "$6,000",
    "This quarter",
    58,
    "contacted",
    -8,
    5,
    "A series of explainer pages and updates to the existing design library.",
  ],
  [
    "Orlando Diggs",
    "orlando@galileo.example",
    "Galileo",
    "$32,000",
    "Delivered",
    90,
    "closed",
    -9,
    null,
    "An end-to-end service website redesign for an international team.",
  ],
  [
    "Candice Wu",
    "candice@luminous.example",
    "Luminous",
    "$4,000",
    "Exploring options",
    38,
    "new",
    -10,
    7,
    "An initial consultation to explore a brand and marketing refresh.",
  ],
  [
    "Alec Whitten",
    "alec@capsule.example",
    "Capsule",
    "$16,000",
    "Within 5 weeks",
    84,
    "qualified",
    -11,
    4,
    "A multi-page website with a resource library and customer stories.",
  ],
  [
    "Kelly Williams",
    "kelly@feather.example",
    "Feather",
    "$11,000",
    "Delivered",
    76,
    "closed",
    -13,
    null,
    "A content strategy and campaign identity for a seasonal launch.",
  ],
];

function relativeDate(offset) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return dateKey(date);
}

export function createSampleLeads() {
  return people.map(
    (
      [
        name,
        email,
        company,
        budget,
        timeline,
        score,
        status,
        created,
        followup,
        requirement,
      ],
      index,
    ) => ({
      id: `sample-${index + 1}`,
      name,
      email,
      company,
      budget,
      timeline,
      requirement,
      lead_score: score,
      status,
      created_at: `${relativeDate(created)}T10:00:00`,
      follow_up_date: followup === null ? null : relativeDate(followup),
      ai_follow_up_days: score >= 70 ? 1 : score >= 40 ? 3 : 7,
      score_reason:
        score >= 70
          ? "A clear project scope, an established budget, and a near-term timeline make this a strong conversation to prioritize."
          : "There is a useful starting point here. Clarifying the scope and decision timeline would help qualify the opportunity.",
      ai_response: `Hi ${name.split(" ")[0]},\n\nThanks for sharing what ${company} is working on. We would love to learn more about your project and what a successful outcome looks like for your team.\n\nWould you have 20 minutes this week for an introductory conversation? We can discuss your priorities, timeline, and next steps.\n\nBest,\nThe sales team`,
    }),
  );
}

export function previewAnalysis(form) {
  const numericBudget = Number(form.budget.replace(/[^\d.]/g, ""));
  const score = Math.min(
    90,
    30 +
      (form.requirement.length >= 60 ? 20 : 10) +
      (numericBudget >= 10000 ? 25 : numericBudget > 0 ? 15 : 0) +
      (/week|month|urgent|soon/i.test(form.timeline) ? 15 : 5),
  );
  const days = score >= 70 ? 1 : score >= 40 ? 3 : 7;
  return {
    lead_score: score,
    score_reason:
      "Preview estimate based on the information you entered. Live AI analysis becomes available when the connected backend is configured.",
    ai_response: `Hi ${form.name.split(" ")[0]},\n\nThank you for reaching out about ${form.requirement.charAt(0).toLowerCase() + form.requirement.slice(1)}\n\nWe would be happy to discuss the project, your ${form.budget} budget, and your ${form.timeline} timeline. When would a short introductory conversation work for you?\n\nBest,\nThe sales team`,
    ai_follow_up_days: days,
    follow_up_date: relativeDate(days),
  };
}
