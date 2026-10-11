import { useState } from "react";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Check,
  Clipboard,
  Mail,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  Avatar,
  Button,
  HelpTip,
  Score,
  SectionHeading,
  SelectField,
  StageBadge,
} from "../components/ui";
import {
  dateInput,
  followUpState,
  formatDate,
  HELP,
  scoreValue,
  STAGE_OPTIONS,
} from "../lib/leads";

export function LeadDetail({ lead, navigate, updateLead, pending, mode }) {
  const [date, setDate] = useState(() => dateInput(lead.follow_up_date));
  const [copied, setCopied] = useState(false);
  const [dateError, setDateError] = useState("");
  const state = followUpState(lead.follow_up_date);
  const score = scoreValue(lead.lead_score);
  const assessment =
    score === null
      ? "pending"
      : score >= 70
        ? "high"
        : score >= 40
          ? "medium"
          : "low";
  const [emailCopied, setEmailCopied] = useState(false);
  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(lead.email);
      setEmailCopied(true);
    } catch {
      toast.error(
        "Couldn’t copy the email address. Select the text to copy it manually.",
      );
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(lead.ai_response);
      setCopied(true);
    } catch {
      toast.error("Copy is unavailable in this browser.", {
        description: "You can select and copy the reply text directly.",
      });
    }
  };
  const schedule = async (event) => {
    event.preventDefault();
    const saved = await updateLead(lead.id, "follow_up_date", date);
    setDateError(
      saved ? "" : "The follow-up couldn’t be saved. Please try again.",
    );
  };
  return (
    <>
      <Button
        variant="text"
        className="back-link"
        icon={ArrowLeft}
        onClick={() => navigate("leads")}
      >
        Back to leads
      </Button>
      <div className="detail-heading">
        <Avatar name={lead.name} size="large" />
        <div>
          <div className="heading-with-help">
            <h1 className="page-title" tabIndex={-1}>
              {lead.name}
            </h1>
            <StageBadge status={lead.status} />
          </div>
          <p>
            <Building2 size={15} />
            {lead.company || "Independent"}
            <span>·</span>Added{" "}
            {formatDate(lead.created_at, { year: "numeric" })}
          </p>
        </div>
        <a
          className="button button-secondary"
          href={`mailto:${encodeURIComponent(lead.email)}`}
        >
          <Mail size={17} />
          Email lead
        </a>
      </div>
      <div className="detail-layout">
        <div className="detail-main">
          <section className="panel detail-information">
            <SectionHeading title="Opportunity details" />
            <dl className="detail-facts">
              <div>
                <dt>Work email</dt>
                <dd>
                  <a
                    href={`mailto:${encodeURIComponent(lead.email)}`}
                    title={lead.email}
                  >
                    {lead.email}
                  </a>
                  <LabelledEmailCopy copied={emailCopied} onClick={copyEmail} />
                </dd>
              </div>
              <div>
                <dt>Company</dt>
                <dd>{lead.company || "Independent"}</dd>
              </div>
              <div>
                <dt>Project budget</dt>
                <dd>{lead.budget || "Not provided"}</dd>
              </div>
              <div>
                <dt>Timeline</dt>
                <dd>{lead.timeline || "Not provided"}</dd>
              </div>
            </dl>
            <div className="requirement-block">
              <h3>Project requirements</h3>
              <p>{lead.requirement || "No requirements provided yet."}</p>
            </div>
          </section>
          <section className="panel reply-panel">
            <SectionHeading
              title="Suggested reply"
              help={HELP.response}
              helpLabel="suggested reply"
            />
            <div className="reply-recipient">
              <span>To</span>
              <strong>{lead.email}</strong>
            </div>
            <div className="reply-text">
              {lead.ai_response ||
                "A suggested response will appear here after the lead is analyzed."}
            </div>
            <div className="reply-footer">
              <span>Review and personalize before sending.</span>
              <Button
                variant="secondary"
                icon={copied ? Check : Clipboard}
                disabled={!lead.ai_response}
                onClick={copy}
              >
                {copied ? "Copied" : "Copy reply"}
              </Button>
            </div>
          </section>
        </div>
        <aside
          className="detail-aside"
          aria-label="Lead management and assessment"
        >
          <section className="panel lead-management-panel">
            <SectionHeading title="Lead management" />
            <div className="management-stage">
              <div className="field-label">
                <label htmlFor="detail-stage">Pipeline stage</label>
                <HelpTip label="Pipeline stage">{HELP.pipeline}</HelpTip>
              </div>
              <SelectField
                id="detail-stage"
                label="Update lead stage"
                value={lead.status || "new"}
                options={STAGE_OPTIONS}
                onChange={(value) => updateLead(lead.id, "status", value)}
                disabled={pending.has(`${lead.id}:status`)}
                className="full-width"
              />
              <span className="field-hint" role="status">
                {pending.has(`${lead.id}:status`)
                  ? "Saving stage…"
                  : "Stage changes save automatically."}
              </span>
            </div>
            <div className="schedule-panel">
              <div
                className={
                  "schedule-current schedule-" +
                  (lead.status === "closed" ? "complete" : state)
                }
              >
                <CalendarDays size={20} />
                <div>
                  <strong>{formatDate(lead.follow_up_date)}</strong>
                  <span>
                    {lead.status === "closed"
                      ? "This lead is complete"
                      : state === "overdue"
                        ? "A follow-up is overdue"
                        : state === "today"
                          ? "Follow-up due today"
                          : state === "none"
                            ? "Choose a date below"
                            : "Upcoming follow-up"}
                  </span>
                </div>
              </div>
              <form onSubmit={schedule}>
                <div className="field-label">
                  <label htmlFor="follow-up-date">Follow-up date</label>
                  <HelpTip label="Follow-up date">{HELP.followup}</HelpTip>
                </div>
                <input
                  type="date"
                  id="follow-up-date"
                  value={date}
                  disabled={pending.has(`${lead.id}:follow_up_date`)}
                  onInput={(event) => {
                    setDate(event.currentTarget.value);
                    setDateError("");
                  }}
                  onChange={(event) => {
                    setDate(event.target.value);
                    setDateError("");
                  }}
                  required
                />
                <Button
                  type="submit"
                  variant="secondary"
                  className="full-width"
                  busy={pending.has(`${lead.id}:follow_up_date`)}
                  disabled={!date || date === dateInput(lead.follow_up_date)}
                >
                  Save follow-up
                </Button>
                {dateError && (
                  <p className="form-error" role="alert">
                    {dateError}
                  </p>
                )}
              </form>
              {lead.ai_follow_up_days > 0 && (
                <p className="schedule-hint">
                  <Sparkles size={14} />
                  Recommended: {lead.ai_follow_up_days}{" "}
                  {lead.ai_follow_up_days === 1 ? "day" : "days"} after adding
                  the lead.
                </p>
              )}
              {lead.status === "closed" && (
                <p className="schedule-hint">
                  Closed leads do not appear in active follow-ups. Change the
                  stage to reopen the conversation.
                </p>
              )}
            </div>
          </section>
          <section className={"panel analysis-panel assessment-" + assessment}>
            <SectionHeading
              title={mode === "sample" ? "Sample assessment" : "AI assessment"}
              help={HELP.score}
              helpLabel="lead assessment"
            />
            <div className="analysis-summary">
              <Score value={lead.lead_score} />
              <span>
                {score === null
                  ? "Assessment pending"
                  : score >= 70
                    ? "High intent"
                    : score >= 40
                      ? "Worth exploring"
                      : "Early conversation"}
              </span>
            </div>
            <p className="analysis-copy">
              {lead.score_reason ||
                "No analysis is available for this lead yet."}
            </p>
            {mode === "sample" && (
              <span className="sample-note">
                Illustrative score, not live AI analysis.
              </span>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}

function LabelledEmailCopy({ copied, onClick }) {
  return (
    <Button
      variant="icon"
      className="copy-email"
      aria-label={copied ? "Email address copied" : "Copy email address"}
      onClick={onClick}
    >
      {copied ? <Check size={14} /> : <Clipboard size={14} />}
    </Button>
  );
}
