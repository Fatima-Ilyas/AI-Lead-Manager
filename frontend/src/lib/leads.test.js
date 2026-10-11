import test from "node:test";
import assert from "node:assert/strict";
import {
  activeFollowUps,
  activityData,
  dateInput,
  dateKey,
  followUpState,
  getStats,
  parseDate,
  scoreValue,
  sortLeads,
} from "./leads.js";

test("missing or invalid scores remain unscored rather than becoming zero", () => {
  for (const value of [null, undefined, "", "not a score"])
    assert.equal(scoreValue(value), null);
  assert.equal(scoreValue(120), 100);
  assert.equal(scoreValue(-20), 0);
});

test("table sorting is directional, keeps missing scores last and does not mutate records", () => {
  const leads = [
    { id: 1, name: "zoe", company: "Studio 10", lead_score: null },
    { id: 2, name: "Amir", company: "Studio 2", lead_score: 90 },
    { id: 3, name: "maya", company: "", lead_score: 42 },
  ];
  assert.deepEqual(
    sortLeads(leads, "name").map((lead) => lead.id),
    [2, 3, 1],
  );
  assert.deepEqual(
    sortLeads(leads, "name-desc").map((lead) => lead.id),
    [1, 3, 2],
  );
  assert.deepEqual(
    sortLeads(leads, "company").map((lead) => lead.id),
    [2, 1, 3],
  );
  assert.deepEqual(
    sortLeads(leads, "score").map((lead) => lead.id),
    [2, 3, 1],
  );
  assert.deepEqual(
    sortLeads(leads, "score-asc").map((lead) => lead.id),
    [3, 2, 1],
  );
  assert.deepEqual(
    leads.map((lead) => lead.id),
    [1, 2, 3],
  );
});

test("table date sorting keeps invalid dates last in either direction", () => {
  const leads = [
    { id: 1, created_at: "invalid" },
    { id: 2, created_at: "2026-10-10" },
    { id: 3, created_at: "2026-10-11" },
  ];
  assert.deepEqual(
    sortLeads(leads, "newest").map((lead) => lead.id),
    [3, 2, 1],
  );
  assert.deepEqual(
    sortLeads(leads, "oldest").map((lead) => lead.id),
    [2, 3, 1],
  );
});

test("date-only scheduling respects local calendar days and invalid dates are safe", () => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  assert.equal(followUpState(dateKey(today)), "today");
  assert.equal(followUpState(dateKey(yesterday)), "overdue");
  assert.equal(followUpState(dateKey(tomorrow)), "upcoming");
  assert.equal(followUpState("invalid"), "none");
  assert.equal(parseDate("invalid"), null);
  assert.equal(dateInput(dateKey(today)), dateKey(today));
});

test("closed leads do not inflate actionable follow-ups or open high-intent counts", () => {
  const leads = [
    { status: "new", lead_score: 90, follow_up_date: dateKey() },
    { status: "closed", lead_score: 95, follow_up_date: dateKey() },
    { status: "qualified", lead_score: null, follow_up_date: null },
  ];
  const stats = getStats(leads);
  assert.equal(activeFollowUps(leads).length, 1);
  assert.equal(stats.due, 1);
  assert.equal(stats.highIntent, 1);
  assert.equal(stats.average, 93);
  assert.equal(stats.qualifiedRate, 67);
});

test("activity uses creation dates and excludes records outside the selected period", () => {
  const outside = new Date();
  outside.setDate(outside.getDate() - 31);
  const data = activityData(
    [
      { created_at: `${dateKey()}T12:00:00` },
      { created_at: outside.toISOString() },
      { created_at: null },
    ],
    14,
  );
  assert.equal(data.length, 14);
  assert.equal(data.at(-1).count, 1);
  assert.equal(
    data.reduce((sum, day) => sum + day.count, 0),
    1,
  );
  assert.equal(getStats([]).qualifiedRate, 0);
});
