import {
  CalendarClock,
  Keyboard,
  MessageSquareText,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { PageHeading } from "../components/AppShell";
import { HELP } from "../lib/leads";

export function Guide() {
  return (
    <>
      <PageHeading
        title="Workspace guide"
        description="Lead management, assessments and keyboard shortcuts."
      />
      <section className="panel guide-panel">
        {[
          {
            title: "Add and find leads",
            icon: UsersRound,
            content:
              "Add a lead’s contact information, project requirements, budget, and timeline. Use All leads to search your workspace, filter by stage, and export your current selection.",
          },
          {
            title: "Use scores as a starting point",
            icon: Sparkles,
            content: HELP.score,
          },
          {
            title: "Keep the pipeline current",
            icon: UsersRound,
            content: HELP.pipeline,
          },
          {
            title: "Schedule follow-ups",
            icon: CalendarClock,
            content: `${HELP.followup} Closed leads are excluded from active follow-ups.`,
          },
          {
            title: "Review suggested replies",
            icon: MessageSquareText,
            content: HELP.response,
          },
        ].map(({ title, icon: Icon, content }) => (
          <article className="guide-item" key={title}>
            <span>
              <Icon size={22} strokeWidth={1.6} />
            </span>
            <div>
              <h2>{title}</h2>
              <p>{content}</p>
            </div>
          </article>
        ))}
      </section>
      <section className="panel shortcut-panel">
        <div>
          <Keyboard size={23} />
          <h2>Keyboard shortcuts</h2>
        </div>
        <dl>
          <div>
            <dt>Find a lead</dt>
            <dd>
              <kbd>/</kbd>
            </dd>
          </div>
          <div>
            <dt>Add a new lead</dt>
            <dd>
              <kbd>N</kbd>
            </dd>
          </div>
          <div>
            <dt>Close a tooltip or menu</dt>
            <dd>
              <kbd>Esc</kbd>
            </dd>
          </div>
        </dl>
        <p>Shortcuts stay out of the way while you’re typing in a field.</p>
      </section>
    </>
  );
}
