import { useState } from "react";
import { ArrowLeft, CheckCheck, Plus } from "lucide-react";
import { Button, HelpTip } from "../components/ui";
import { PageHeading } from "../components/AppShell";

const EMPTY = {
  name: "",
  email: "",
  company: "",
  budget: "",
  timeline: "",
  requirement: "",
};
const DRAFT_KEY = "lead-manager-draft-v1";

function readDraft() {
  try {
    const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY));
    return Object.fromEntries(
      Object.keys(EMPTY).map((key) => [
        key,
        typeof draft?.[key] === "string" ? draft[key] : "",
      ]),
    );
  } catch {
    return EMPTY;
  }
}

export function LeadForm({ createLead, pending, mode, navigate }) {
  const [form, setForm] = useState(readDraft);
  const [error, setError] = useState("");
  const submitting = pending.has("create");
  const change = (event) => {
    const next = { ...form, [event.target.name]: event.target.value };
    setForm(next);
    setError("");
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));
    } catch {
      /* The in-memory draft remains available. */
    }
  };
  const submit = async (event) => {
    event.preventDefault();
    const clean = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [key, value.trim()]),
    );
    if (Object.values(clean).some((value) => !value)) {
      setError("Complete the required fields before creating this lead.");
      event.currentTarget.elements
        .namedItem(Object.keys(clean).find((key) => !clean[key]))
        ?.focus();
      return;
    }
    const id = await createLead(clean);
    if (id !== false && id !== undefined) {
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        /* Storage may be unavailable. */
      }
      navigate(`lead/${id}`);
    } else
      setError(
        "We couldn’t add this lead. Your draft is saved, so you can try again.",
      );
  };
  return (
    <div className="lead-form-page">
      <Button
        variant="text"
        className="back-link"
        icon={ArrowLeft}
        onClick={() => navigate("leads")}
      >
        Back to leads
      </Button>
      <PageHeading
        title="New lead"
        description="Add the contact and project details to your pipeline."
      >
        <span className="form-required">All fields required</span>
      </PageHeading>
      <section className="panel form-panel">
        <form onSubmit={submit}>
          <fieldset className="form-section" disabled={submitting}>
            <legend>Contact details</legend>
            <div className="form-grid">
              <FormField
                label="Full name"
                name="name"
                value={form.name}
                onChange={change}
                placeholder="e.g. Alex Morgan"
                autoComplete="name"
              />
              <FormField
                label="Work email"
                name="email"
                value={form.email}
                onChange={change}
                placeholder="alex@company.com"
                type="email"
                autoComplete="email"
              />
              <FormField
                label="Company"
                name="company"
                value={form.company}
                onChange={change}
                placeholder="e.g. Northstar Studio"
                autoComplete="organization"
                className="field-full"
              />
            </div>
          </fieldset>
          <fieldset className="form-section" disabled={submitting}>
            <legend>Opportunity details</legend>
            <div className="form-grid">
              <FormField
                label="Project budget"
                name="budget"
                value={form.budget}
                onChange={change}
                placeholder="e.g. $12,000 or £8,000"
                help="Include the currency and an approximate amount or range. If the budget is undecided, enter ‘To be confirmed’."
              />
              <FormField
                label="Timeline"
                name="timeline"
                value={form.timeline}
                onChange={change}
                placeholder="e.g. Within 4 weeks"
                help="When does the lead want to start or finish? Include a clear timeframe if you know it. Otherwise, enter ‘Exploring options’."
              />
              <div className="form-field field-full">
                <label htmlFor="lead-requirement">Project requirements</label>
                <textarea
                  id="lead-requirement"
                  name="requirement"
                  value={form.requirement}
                  onChange={change}
                  rows={4}
                  placeholder="Describe the project, goals and key requirements."
                  required
                  maxLength={8000}
                  aria-describedby="requirement-hint"
                />
                <span id="requirement-hint" className="field-hint">
                  Include the scope, priorities and any relevant context.
                </span>
              </div>
            </div>
          </fieldset>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <span>
              <CheckCheck size={15} />
              Draft saves automatically
            </span>
            <Button
              variant="secondary"
              disabled={submitting}
              onClick={() => navigate("leads")}
            >
              Cancel
            </Button>
            <Button type="submit" icon={Plus} busy={submitting}>
              {submitting
                ? "Creating lead…"
                : mode === "sample"
                  ? "Create sample lead"
                  : "Create lead"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

function FormField({ label, name, help, className = "", ...props }) {
  return (
    <div className={`form-field ${className}`}>
      <div className="field-label">
        <label htmlFor={`lead-${name}`}>{label}</label>
        {help && <HelpTip label={label}>{help}</HelpTip>}
      </div>
      <input
        id={`lead-${name}`}
        name={name}
        type="text"
        required
        maxLength={300}
        {...props}
      />
    </div>
  );
}
