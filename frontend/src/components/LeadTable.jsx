import {
  ArrowRight,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Avatar,
  Button,
  EmptyState,
  HelpTip,
  Score,
  SelectField,
  StageBadge,
} from "./ui";
import {
  exportLeads,
  followUpState,
  formatDate,
  HELP,
  LEAD_SORT_OPTIONS,
  sortLeads,
  scoreValue,
  STAGE_OPTIONS,
} from "../lib/leads";

export function LeadTable({
  leads,
  onOpen,
  caption = "Business leads",
  sort,
  onSort,
}) {
  return (
    <>
      <div
        className="desktop-table"
        tabIndex={0}
        role="region"
        aria-label={caption + " table"}
      >
        <table className="lead-table">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              <SortColumn
                label="Lead"
                ascending="name"
                descending="name-desc"
                sort={sort}
                onSort={onSort}
              />
              <SortColumn
                label="Company"
                ascending="company"
                descending="company-desc"
                sort={sort}
                onSort={onSort}
              />
              <th scope="col">Stage</th>
              <SortColumn
                label="AI score"
                ascending="score-asc"
                descending="score"
                sort={sort}
                onSort={onSort}
                help={HELP.score}
                preferDescending
              />
              <th scope="col" className="budget-cell">
                Budget
              </th>
              <th scope="col">Follow-up</th>
              <th scope="col">
                <span className="sr-only">View details</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id}>
                <td>
                  <button
                    type="button"
                    className="lead-person"
                    onClick={() => onOpen(lead.id)}
                  >
                    <Avatar name={lead.name} size="small" />
                    <span>
                      <strong title={lead.name}>{lead.name}</strong>
                      <span title={lead.email}>{lead.email}</span>
                    </span>
                  </button>
                </td>
                <td>
                  <span
                    className="company-name"
                    title={lead.company || "Independent"}
                  >
                    {lead.company || "Independent"}
                  </span>
                </td>
                <td>
                  <StageBadge status={lead.status} />
                </td>
                <td>
                  <div
                    className={
                      "score-cell score-" +
                      (scoreValue(lead.lead_score) >= 70
                        ? "high"
                        : scoreValue(lead.lead_score) >= 40
                          ? "medium"
                          : "low")
                    }
                  >
                    <Score value={lead.lead_score} compact />
                    <span className="score-cell-track" aria-hidden="true">
                      <span
                        style={{
                          width: (scoreValue(lead.lead_score) ?? 0) + "%",
                        }}
                      />
                    </span>
                  </div>
                </td>
                <td className="budget-cell">{lead.budget || "Not provided"}</td>
                <td>
                  <FollowUpLabel lead={lead} />
                </td>
                <td>
                  <Button
                    variant="icon"
                    aria-label={`View ${lead.name}`}
                    onClick={() => onOpen(lead.id)}
                  >
                    <ArrowRight size={17} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mobile-leads">
        {leads.map((lead) => (
          <article className="mobile-lead" key={lead.id}>
            <div className="mobile-lead-top">
              <button
                type="button"
                className="lead-person"
                onClick={() => onOpen(lead.id)}
              >
                <Avatar name={lead.name} />
                <span>
                  <strong>{lead.name}</strong>
                  <span>{lead.company}</span>
                </span>
              </button>
              <StageBadge status={lead.status} />
            </div>
            <div className="mobile-lead-data">
              <span>
                <small>AI score</small>
                <Score value={lead.lead_score} compact />
              </span>
              <span>
                <small>Budget</small>
                <strong>{lead.budget || "Not provided"}</strong>
              </span>
              <span>
                <small>Follow-up</small>
                <FollowUpLabel lead={lead} />
              </span>
            </div>
            <Button
              variant="text"
              className="mobile-lead-link"
              onClick={() => onOpen(lead.id)}
            >
              View lead
              <ArrowRight size={16} />
            </Button>
          </article>
        ))}
      </div>
    </>
  );
}

function SortColumn({
  label,
  ascending,
  descending,
  sort,
  onSort,
  help,
  preferDescending,
}) {
  const direction =
    sort === ascending
      ? "ascending"
      : sort === descending
        ? "descending"
        : "none";
  return (
    <th scope="col" aria-sort={onSort ? direction : undefined}>
      <span className="heading-with-help">
        {onSort ? (
          <button
            type="button"
            className={
              "column-sort" + (direction !== "none" ? " is-sorted" : "")
            }
            aria-label={
              "Sort by " +
              label +
              ", " +
              (direction === "ascending"
                ? "descending"
                : direction === "descending"
                  ? "ascending"
                  : preferDescending
                    ? "descending"
                    : "ascending")
            }
            onClick={() =>
              onSort(
                direction === "ascending"
                  ? descending
                  : direction === "descending"
                    ? ascending
                    : preferDescending
                      ? descending
                      : ascending,
              )
            }
          >
            {label}
            {direction === "ascending" ? (
              <ArrowUp size={13} />
            ) : direction === "descending" ? (
              <ArrowDown size={13} />
            ) : (
              <ArrowUpDown size={13} />
            )}
          </button>
        ) : (
          label
        )}
        {help && <HelpTip label={label}>{help}</HelpTip>}
      </span>
    </th>
  );
}

function FollowUpLabel({ lead }) {
  const state = followUpState(lead.follow_up_date);
  if (lead.status === "closed") return <span className="muted">Complete</span>;
  return (
    <span className={`followup-label followup-${state}`}>
      {state === "today" ? (
        <>
          <CalendarDays size={13} aria-hidden="true" />
          Today
        </>
      ) : state === "overdue" ? (
        <>
          <span className="status-dot" />
          {formatDate(lead.follow_up_date)}
        </>
      ) : (
        formatDate(lead.follow_up_date)
      )}
    </span>
  );
}

export function LeadsWorkspace({ leads, navigate, search, setSearch }) {
  const [stage, setStage] = useState("all");
  const [intent, setIntent] = useState(false);
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return sortLeads(
      leads.filter(
        (lead) =>
          [lead.name, lead.company, lead.email].some((value) =>
            String(value || "")
              .toLowerCase()
              .includes(term),
          ) &&
          (stage === "all" || lead.status === stage) &&
          (!intent || scoreValue(lead.lead_score) >= 70),
      ),
      sort,
    );
  }, [leads, search, stage, intent, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages - 1);
  const shown = filtered.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  );
  const changeSort = (value) => {
    setSort(value);
    setPage(0);
  };
  const reset = () => {
    setSearch("");
    setStage("all");
    setIntent(false);
    setPage(0);
  };
  return (
    <section className="panel leads-workspace" aria-label="Lead directory">
      <div className="leads-toolbar">
        <div className="search-input">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            aria-label="Search leads"
            placeholder="Search names, companies, or emails"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
          />
        </div>
        <SelectField
          label="Filter by stage"
          value={stage}
          options={[{ value: "all", label: "All stages" }, ...STAGE_OPTIONS]}
          onChange={(value) => {
            setStage(value);
            setPage(0);
          }}
        />
        <button
          type="button"
          className={`button button-secondary intent-filter ${intent ? "filter-active" : ""}`}
          aria-pressed={intent}
          onClick={() => {
            setIntent(!intent);
            setPage(0);
          }}
        >
          <SlidersHorizontal size={16} />
          High intent
        </button>
        <HelpTip label="high intent">{HELP.intent}</HelpTip>
      </div>
      <div className="list-meta">
        <div>
          <strong>
            {filtered.length} {filtered.length === 1 ? "lead" : "leads"}
          </strong>
          <span>
            {stage === "all"
              ? "All stages"
              : STAGE_OPTIONS.find((option) => option.value === stage)?.label}
            {intent ? " · High intent" : ""}
          </span>
          {(search || stage !== "all" || intent) && (
            <Button
              variant="text"
              className="clear-filter"
              icon={X}
              onClick={reset}
            >
              Clear
            </Button>
          )}
        </div>
        <div className="list-meta-actions">
          <SelectField
            label="Sort leads"
            value={sort}
            onChange={changeSort}
            options={LEAD_SORT_OPTIONS}
          />
          <Button
            variant="secondary"
            icon={Download}
            disabled={!filtered.length}
            onClick={() => {
              exportLeads(filtered);
              toast.success("CSV export downloaded");
            }}
          >
            Export
          </Button>
        </div>
      </div>
      {shown.length ? (
        <LeadTable
          leads={shown}
          onOpen={(id) => navigate(`lead/${id}`)}
          sort={sort}
          onSort={changeSort}
        />
      ) : (
        <EmptyState
          title={
            leads.length
              ? "No leads match your filters"
              : "Your next opportunity starts here"
          }
          description={
            leads.length
              ? "Try a different name, company, or stage to find the conversation you’re looking for."
              : "Add your first lead to start building a clearer pipeline."
          }
        >
          {leads.length ? (
            <Button variant="secondary" onClick={reset}>
              Clear filters
            </Button>
          ) : (
            <Button icon={Plus} onClick={() => navigate("new-lead")}>
              Add your first lead
            </Button>
          )}
        </EmptyState>
      )}
      <div className="table-footer">
        <span>
          {filtered.length
            ? `${currentPage * pageSize + 1}–${Math.min((currentPage + 1) * pageSize, filtered.length)} of ${filtered.length} leads`
            : "0 leads"}
        </span>
        <div className="pagination">
          <div className="page-size-control">
            <span>Rows per page</span>
            <SelectField
              label="Rows per page"
              value={pageSize}
              onChange={(value) => {
                setPageSize(value);
                setPage(0);
              }}
              options={[10, 25, 50].map((value) => ({
                value,
                label: String(value),
              }))}
            />
          </div>
          <Button
            variant="icon"
            aria-label="Previous page"
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
          >
            <ChevronLeft size={17} />
          </Button>
          <span>
            Page {currentPage + 1} of {pages}
          </span>
          <Button
            variant="icon"
            aria-label="Next page"
            disabled={currentPage >= pages - 1}
            onClick={() => setPage(currentPage + 1)}
          >
            <ChevronRight size={17} />
          </Button>
        </div>
      </div>
    </section>
  );
}
