import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarCheck2,
  CalendarClock,
  Check,
  Clock3,
  Plus,
  Sparkles,
  UsersRound,
} from "lucide-react";
import {
  activityData,
  activeFollowUps,
  followUpState,
  formatDate,
  HELP,
  sortLeads,
} from "../lib/leads";
import {
  Avatar,
  Button,
  EmptyState,
  HelpTip,
  SectionHeading,
  SelectField,
  ViewLink,
} from "./ui";
import { LeadTable } from "./LeadTable";

export function Metrics({ stats }) {
  const metrics = [
    {
      label: "Total leads",
      value: stats.total,
      hint: "Across your pipeline",
      icon: UsersRound,
    },
    {
      label: "High-intent leads",
      value: stats.highIntent,
      hint: "Open leads scoring 70 or above",
      help: HELP.intent,
      icon: Sparkles,
    },
    {
      label: "Follow-ups due",
      value: stats.due,
      hint: "Today and overdue",
      help: "Open leads with a follow-up due today or earlier. Completed leads are excluded.",
      icon: CalendarClock,
    },
    {
      label: "Qualification rate",
      value: `${stats.qualifiedRate}%`,
      hint: "Qualified or closed leads",
      help: HELP.qualified,
      icon: ArrowUpRight,
    },
  ];
  return (
    <section className="metrics" aria-label="Pipeline summary">
      {metrics.map(({ label, value, hint, help, icon: Icon }) => (
        <div className="metric" key={label}>
          <div className="metric-label">
            <span>{label}</span>
            {help && <HelpTip label={label}>{help}</HelpTip>}
            <Icon
              size={17}
              strokeWidth={1.6}
              className="metric-icon"
              aria-hidden="true"
            />
          </div>
          <strong>{value}</strong>
          <span className="metric-hint">{hint}</span>
        </div>
      ))}
    </section>
  );
}

function ActivityTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>{payload[0].payload.fullDate}</strong>
      <span>
        <span className="status-dot" />
        {payload[0].value} {payload[0].value === 1 ? "lead" : "leads"} added
      </span>
    </div>
  );
}

export function ActivityChart({ leads, tall = false }) {
  const [days, setDays] = useState("14");
  const data = useMemo(() => activityData(leads, Number(days)), [leads, days]);
  const count = data.reduce((sum, day) => sum + day.count, 0);
  return (
    <section className="panel activity-panel">
      <SectionHeading
        title="Lead activity"
        subtitle="Leads added over time."
        help={HELP.activity}
      >
        <SelectField
          label="Activity period"
          value={days}
          onChange={setDays}
          options={[
            { value: "14", label: "Last 14 days" },
            { value: "30", label: "Last 30 days" },
          ]}
        />
      </SectionHeading>
      <div className="chart-summary">
        <span className="chart-legend-dot" />
        {count} {count === 1 ? "lead" : "leads"} added
        <span className="chart-summary-period">in this period</span>
      </div>
      <div
        className={`activity-chart ${tall ? "chart-tall" : ""}`}
        role="img"
        aria-label={`${count} leads added over the last ${days} days. Daily counts are available in the table below.`}
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart
            data={data}
            margin={{ top: 14, right: 12, bottom: 0, left: -27 }}
            accessibilityLayer
          >
            <defs>
              <linearGradient
                id={tall ? "activity-fill-tall" : "activity-fill"}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="var(--accent)"
                  stopOpacity={0.17}
                />
                <stop
                  offset="100%"
                  stopColor="var(--accent)"
                  stopOpacity={0.01}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeDasharray="3 5"
            />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              minTickGap={32}
              tickMargin={12}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              domain={[0, (maximum) => Math.max(3, maximum)]}
              tickCount={4}
            />
            <ChartTooltip
              content={<ActivityTooltip />}
              cursor={{ stroke: "var(--accent)", strokeDasharray: "3 3" }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="var(--accent)"
              strokeWidth={2.5}
              fill={`url(#${tall ? "activity-fill-tall" : "activity-fill"})`}
              isAnimationActive={false}
              activeDot={{
                r: 5,
                fill: "var(--accent)",
                stroke: "var(--surface)",
                strokeWidth: 3,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Daily leads added</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Leads</th>
          </tr>
        </thead>
        <tbody>
          {data.map((day) => (
            <tr key={day.fullDate}>
              <td>{day.fullDate}</td>
              <td>{day.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="chart-footer">
        <span>
          <span className="chart-legend-dot" />
          New leads
        </span>
        <span>Grouped by date added</span>
      </div>
    </section>
  );
}

export function Pipeline({ stats, navigate }) {
  return (
    <section className="panel pipeline-panel">
      <SectionHeading
        title="Pipeline stages"
        subtitle="Current lead distribution."
        help={HELP.pipeline}
      />
      <div className="pipeline-bar" aria-hidden="true">
        {stats.stages.map((stage) => (
          <span
            key={stage.value}
            className={`pipeline-segment segment-${stage.color}`}
            style={{ flexGrow: stage.count || (stats.total ? 0 : 1) }}
          />
        ))}
      </div>
      <div className="pipeline-stages">
        {stats.stages.map((stage) => (
          <div key={stage.value}>
            <span className={`stage-dot dot-${stage.color}`} />
            <span>{stage.label}</span>
            <strong>{stage.count}</strong>
            <small>
              {stats.total ? Math.round((stage.count / stats.total) * 100) : 0}%
            </small>
          </div>
        ))}
      </div>
      <ViewLink onClick={() => navigate("insights")}>Explore insights</ViewLink>
    </section>
  );
}

export function AttentionList({ leads, navigate }) {
  const due = activeFollowUps(leads).filter((lead) =>
    ["overdue", "today"].includes(followUpState(lead.follow_up_date)),
  );
  return (
    <section className="panel attention-panel">
      <SectionHeading
        title="Follow-ups due"
        subtitle={
          due.length
            ? `${due.length} ${due.length === 1 ? "lead is" : "leads are"} due today or overdue.`
            : "No follow-ups due today or overdue."
        }
      />
      {due.length ? (
        <div className="attention-list">
          {due.slice(0, 3).map((lead) => (
            <button
              key={lead.id}
              className="attention-item"
              type="button"
              onClick={() => navigate(`lead/${lead.id}`)}
            >
              <Avatar name={lead.name} size="small" />
              <span className="attention-person">
                <strong>{lead.name}</strong>
                <span>{lead.company}</span>
              </span>
              <span
                className={`due-label ${followUpState(lead.follow_up_date)}`}
              >
                {followUpState(lead.follow_up_date) === "overdue" ? (
                  <>
                    <Clock3 size={12} />
                    Overdue
                  </>
                ) : (
                  "Today"
                )}
              </span>
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={CalendarCheck2}
          title="No follow-ups due"
          description="Your next scheduled follow-up will appear here."
          compact
        />
      )}
      <ViewLink onClick={() => navigate("follow-ups")}>
        View all follow-ups
      </ViewLink>
    </section>
  );
}

export function Overview({ leads, stats, navigate }) {
  const recent = sortLeads(leads, "newest").slice(0, 5);
  return (
    <>
      <Metrics stats={stats} />
      <div className="overview-grid">
        <ActivityChart leads={leads} />
        <div className="overview-aside">
          <Pipeline stats={stats} navigate={navigate} />
          <AttentionList leads={leads} navigate={navigate} />
        </div>
      </div>
      <section className="panel recent-panel">
        <SectionHeading
          title="Recent leads"
          subtitle="Latest additions to your pipeline."
        >
          <ViewLink onClick={() => navigate("leads")}>View all leads</ViewLink>
        </SectionHeading>
        {recent.length ? (
          <LeadTable
            leads={recent}
            onOpen={(id) => navigate(`lead/${id}`)}
            caption="Your five most recent leads"
          />
        ) : (
          <EmptyState
            title="No leads yet"
            description="Add a lead to start tracking your pipeline."
          >
            <Button icon={Plus} onClick={() => navigate("new-lead")}>
              Add a lead
            </Button>
          </EmptyState>
        )}
        {recent.length > 0 && (
          <div className="recent-footer">
            <span>
              <Check size={14} />
              Showing your {recent.length} most recent leads
            </span>
            <span>Sorted by date added</span>
          </div>
        )}
      </section>
    </>
  );
}

export function FollowUps({ leads, navigate }) {
  const [filter, setFilter] = useState("all");
  const scheduled = activeFollowUps(leads);
  const groups = [
    {
      value: "overdue",
      label: "Overdue",
      icon: Clock3,
      description: "Follow-ups scheduled before today.",
    },
    {
      value: "today",
      label: "Today",
      icon: CalendarClock,
      description: "Follow-ups scheduled for today.",
    },
    {
      value: "upcoming",
      label: "Upcoming",
      icon: CalendarCheck2,
      description: "Follow-ups scheduled after today.",
    },
  ];
  return (
    <div className="followups-workspace">
      <div
        className="followup-tabs"
        role="group"
        aria-label="Filter follow-ups"
      >
        {[{ value: "all", label: "All follow-ups" }, ...groups].map(
          ({ value, label }) => (
            <button
              type="button"
              key={value}
              aria-pressed={filter === value}
              className={filter === value ? "is-active" : ""}
              onClick={() => setFilter(value)}
            >
              {label}
              <span>
                {value === "all"
                  ? scheduled.length
                  : scheduled.filter(
                      (lead) => followUpState(lead.follow_up_date) === value,
                    ).length}
              </span>
            </button>
          ),
        )}
      </div>
      {scheduled.length === 0 ? (
        <section className="panel">
          <EmptyState
            icon={CalendarCheck2}
            title="No scheduled follow-ups"
            description="Open a lead and choose a follow-up date to add it here."
          >
            <Button variant="secondary" onClick={() => navigate("leads")}>
              Browse leads
            </Button>
          </EmptyState>
        </section>
      ) : (
        groups
          .filter((group) => filter === "all" || filter === group.value)
          .map(({ value, label, icon: Icon, description }) => {
            const records = scheduled.filter(
              (lead) => followUpState(lead.follow_up_date) === value,
            );
            return (
              <section className="panel followup-group" key={value}>
                <SectionHeading
                  title={
                    <>
                      <Icon size={18} className={`followup-${value}`} />
                      <span>{label}</span>
                      <span className="section-count">{records.length}</span>
                    </>
                  }
                  subtitle={description}
                />
                {records.length ? (
                  <div className="followup-records">
                    {records.map((lead) => (
                      <div key={lead.id} className="followup-record">
                        <div className="lead-person-static">
                          <Avatar name={lead.name} />
                          <div>
                            <strong>{lead.name}</strong>
                            <span>{lead.company}</span>
                          </div>
                        </div>
                        <div className="followup-context">
                          <span>{lead.requirement}</span>
                          <small>
                            {lead.ai_follow_up_days
                              ? `Suggested follow-up window: ${lead.ai_follow_up_days} ${lead.ai_follow_up_days === 1 ? "day" : "days"}`
                              : "Your scheduled conversation"}
                          </small>
                        </div>
                        <time
                          className={`followup-record-date followup-${value}`}
                          dateTime={lead.follow_up_date}
                        >
                          {formatDate(lead.follow_up_date)}
                        </time>
                        <Button
                          variant="secondary"
                          onClick={() => navigate(`lead/${lead.id}`)}
                        >
                          View lead
                          <ArrowRight size={15} />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="group-empty">
                    No {label.toLowerCase()} follow-ups.
                  </div>
                )}
              </section>
            );
          })
      )}
    </div>
  );
}
