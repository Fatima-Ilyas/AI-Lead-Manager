import { ArrowUpRight, Sparkles } from "lucide-react";
import { ActivityChart, Metrics } from "../components/Dashboard";
import { Button, HelpTip, SectionHeading } from "../components/ui";
import { HELP, scoreValue } from "../lib/leads";

export function Insights({ leads, stats, navigate }) {
  const bands = [
    {
      label: "High intent",
      range: "70–100",
      count: leads.filter((lead) => scoreValue(lead.lead_score) >= 70).length,
      color: "green",
    },
    {
      label: "Worth exploring",
      range: "40–69",
      count: leads.filter(
        (lead) =>
          scoreValue(lead.lead_score) >= 40 && scoreValue(lead.lead_score) < 70,
      ).length,
      color: "amber",
    },
    {
      label: "Early conversations",
      range: "0–39",
      count: leads.filter(
        (lead) =>
          scoreValue(lead.lead_score) !== null &&
          scoreValue(lead.lead_score) < 40,
      ).length,
      color: "blue",
    },
    {
      label: "Not yet scored",
      range: "Pending",
      count: leads.filter((lead) => scoreValue(lead.lead_score) === null)
        .length,
      color: "neutral",
    },
  ];
  return (
    <>
      <Metrics stats={stats} />
      <div className="insights-grid">
        <ActivityChart leads={leads} tall />
        <section className="panel intent-panel">
          <SectionHeading
            title="Lead quality"
            subtitle="Score distribution across the workspace."
            help={HELP.score}
          />
          <div className="average-score">
            <span>Average lead score</span>
            <strong>
              {stats.average}
              <small>/ 100</small>
            </strong>
            <p>
              Based on{" "}
              {
                leads.filter((lead) => scoreValue(lead.lead_score) !== null)
                  .length
              }{" "}
              scored leads
            </p>
          </div>
          <div className="score-bands">
            {bands.map((band) => (
              <div key={band.label}>
                <div>
                  <span>
                    <span className={`stage-dot dot-${band.color}`} />
                    {band.label}
                  </span>
                  <strong>{band.count}</strong>
                </div>
                <div className="band-track">
                  <span
                    className={`segment-${band.color}`}
                    style={{
                      width: `${stats.total ? (band.count / stats.total) * 100 : 0}%`,
                    }}
                  />
                </div>
                <small>
                  {band.color === "neutral"
                    ? "Awaiting assessment"
                    : `Score ${band.range}`}
                </small>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="panel stage-report">
        <SectionHeading
          title="Pipeline breakdown"
          subtitle="Lead count and share by stage."
          help={HELP.pipeline}
        />
        <div className="stage-report-list">
          {stats.stages.map((stage) => (
            <div key={stage.value}>
              <span>
                <span className={`stage-dot dot-${stage.color}`} />
                {stage.label}
              </span>
              <div className="stage-report-track">
                <span
                  className={`segment-${stage.color}`}
                  style={{
                    width: `${stats.total ? (stage.count / stats.total) * 100 : 0}%`,
                  }}
                />
              </div>
              <strong>
                {stage.count}
                <small>{stage.count === 1 ? "lead" : "leads"}</small>
              </strong>
              <span>
                {stats.total
                  ? Math.round((stage.count / stats.total) * 100)
                  : 0}
                %
              </span>
            </div>
          ))}
        </div>
        <div className="insight-note">
          <Sparkles size={19} />
          <div>
            <strong>
              {stats.highIntent
                ? `${stats.highIntent} open high-intent ${stats.highIntent === 1 ? "lead" : "leads"}`
                : "No open high-intent leads"}
            </strong>
            <p>
              {stats.highIntent
                ? "Review these leads and confirm the next action for each."
                : "Review lead requirements and scores as your pipeline grows."}
            </p>
          </div>
          <Button variant="secondary" onClick={() => navigate("leads")}>
            View leads
            <ArrowUpRight size={16} />
          </Button>
        </div>
      </section>
      <p className="report-footnote">
        All insights reflect the complete workspace. Stage counts describe
        progress, not won revenue.{" "}
        <HelpTip label="qualification rate">{HELP.qualified}</HelpTip>
      </p>
    </>
  );
}
