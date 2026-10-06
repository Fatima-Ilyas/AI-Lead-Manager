import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedLeadId, setExpandedLeadId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    requirement: "",
    budget: "",
    timeline: "",
  });

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const response = await axios.get("http://127.0.0.1:8000/leads");
      setLeads(response.data);
    } catch (error) {
      console.error("Error fetching leads:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSubmitting(true);

    try {
      await axios.post(
        "http://127.0.0.1:8000/leads",
        form
      );

      setForm({
        name: "",
        email: "",
        company: "",
        requirement: "",
        budget: "",
        timeline: "",
      });

      await fetchLeads();

    } catch (error) {
      console.error("Error creating lead:", error);
      alert("Could not create lead.");
    } finally {
      setSubmitting(false);
    }
  };

  const clearFilters = () => {
  setSearchTerm("");
  setStatusFilter("all");
};

  const updateStatus = async (leadId, newStatus) => {
  try {
    await axios.put(
      `http://127.0.0.1:8000/leads/${leadId}/status`,
      null,
      {
        params: {
          status: newStatus,
        },
      }
    );

    await fetchLeads();
  } catch (error) {
    console.error("Error updating lead status:", error);
    alert("Could not update lead status.");
  }
};

  const getPriority = (score) => {
  if (score >= 70) {
    return "High";
  }

  if (score >= 40) {
    return "Medium";
  }

  return "Low";
};

const getFollowUpStatus = (followUpDate) => {
  if (!followUpDate) return "none";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const followUp = new Date(followUpDate);
  followUp.setHours(0, 0, 0, 0);

  if (followUp < today) {
    return "overdue";
  }

  if (followUp.getTime() === today.getTime()) {
    return "today";
  }

  return "upcoming";
};

const updateFollowUpDate = async (leadId, followUpDate) => {
  try {
    await axios.put(
      `http://127.0.0.1:8000/leads/${leadId}/follow-up`,
      null,
      {
        params: {
          follow_up_date: followUpDate,
        },
      }
    );

    await fetchLeads();
  } catch (error) {
    console.error("Error updating follow-up date:", error);
    alert("Could not update follow-up date.");
  }
};

const filteredLeads = leads
  .filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.company.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      lead.status === statusFilter;

    return matchesSearch && matchesStatus;
  })
  .sort((a, b) => {
    return (b.lead_score || 0) - (a.lead_score || 0);
  });


const totalLeads = leads.length;

const highIntentLeads = leads.filter(
  (lead) => lead.lead_score >= 70
).length;

const newLeads = leads.filter(
  (lead) => lead.status === "new"
).length;

const contactedLeads = leads.filter(
  (lead) => lead.status === "contacted"
).length;

const qualifiedLeads = leads.filter(
  (lead) => lead.status === "qualified"
).length;

const closedLeads = leads.filter(
  (lead) => lead.status === "closed"
).length;

const averageScore =
  totalLeads > 0
    ? Math.round(
        leads.reduce(
          (total, lead) => total + (lead.lead_score || 0),
          0
        ) / totalLeads
      )
    : 0;

    const overdueFollowUps = leads.filter(
  (lead) => getFollowUpStatus(lead.follow_up_date) === "overdue"
).length;

const todayFollowUps = leads.filter(
  (lead) => getFollowUpStatus(lead.follow_up_date) === "today"
).length;

const upcomingFollowUps = leads.filter(
  (lead) => getFollowUpStatus(lead.follow_up_date) === "upcoming"
).length;

const followUpLeads = leads
  .filter((lead) => lead.follow_up_date)
  .sort(
    (a, b) =>
      new Date(a.follow_up_date) -
      new Date(b.follow_up_date)
  );

  return (
    <div className="app">

      <header className="header">
        <div>
          <h1>AI Lead Manager</h1>
          <p>
            Qualify leads, prioritize opportunities, and never miss a follow-up.
          </p>
        </div>
      </header>

      <main className="container">

        <div className="dashboard-title">
          <h2>Dashboard</h2>
          <p>
            Overview of your incoming business leads
          </p>
        </div>

        <div className="stats">

  <div className="stat-card">
    <h3>Total Leads</h3>
    <p>{totalLeads}</p>
  </div>

  <div className="stat-card">
    <h3>High-Intent Leads</h3>
    <p>{highIntentLeads}</p>
  </div>

  <div className="stat-card">
    <h3>Average Lead Score</h3>
    <p>{averageScore}</p>
  </div>

  <div className="stat-card">
    <h3>New</h3>
    <p>{newLeads}</p>
  </div>

  <div className="stat-card">
    <h3>Contacted</h3>
    <p>{contactedLeads}</p>
  </div>

  <div className="stat-card">
    <h3>Qualified</h3>
    <p>{qualifiedLeads}</p>
  </div>

  <div className="stat-card">
    <h3>Closed</h3>
    <p>{closedLeads}</p>
  </div>

</div>
<div className="follow-up-section">
  <div className="follow-up-header">
    <div>
      <h2>Follow-ups</h2>
      <p>Keep track of leads that need attention.</p>
    </div>
  </div>

  <div className="follow-up-cards">

    <div className="follow-up-card overdue">
      <span className="follow-up-label">Overdue</span>
      <strong>{overdueFollowUps}</strong>
      <p>Need follow-up</p>
    </div>

    <div className="follow-up-card today">
      <span className="follow-up-label">Today</span>
      <strong>{todayFollowUps}</strong>
      <p>Follow up today</p>
    </div>

    <div className="follow-up-card upcoming">
      <span className="follow-up-label">Upcoming</span>
      <strong>{upcomingFollowUps}</strong>
      <p>Scheduled follow-ups</p>
    </div>

  </div>
  <div className="follow-up-list">

  {followUpLeads.length === 0 ? (
    <p className="no-follow-ups">
      No follow-ups scheduled.
    </p>
  ) : (
    followUpLeads.map((lead) => {
      const followUpStatus = getFollowUpStatus(
        lead.follow_up_date
      );

      return (
        <div className="follow-up-item" key={lead.id}>

          <div className="follow-up-info">
            <h3>{lead.name}</h3>
            <p>{lead.company}</p>

            <span
              className={`follow-up-status ${followUpStatus}`}
            >
              {followUpStatus === "overdue"
                ? "Overdue"
                : followUpStatus === "today"
                ? "Today"
                : "Upcoming"}
            </span>
          </div>

          <div className="follow-up-date">
            <strong>Follow-up</strong>

            <span>
              {new Date(
                lead.follow_up_date
              ).toLocaleDateString()}
            </span>

            {lead.ai_follow_up_days && (
              <small>
                AI Suggested: Follow up in{" "}
                {lead.ai_follow_up_days}{" "}
                {lead.ai_follow_up_days === 1
                  ? "day"
                  : "days"}
              </small>
            )}
          </div>

          <button
            className="view-lead-button"
            onClick={() => {
              setExpandedLeadId(lead.id);

              setTimeout(() => {
                const leadElement = document.getElementById(
                  `lead-${lead.id}`
                );

                if (leadElement) {
                  leadElement.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                  });
                }
              }, 100);
            }}
          >
            View Lead
          </button>

        </div>
      );
    })
  )}

</div>
</div>
        <div className="lead-form-card">

          <h2>Add New Lead</h2>

          <form onSubmit={handleSubmit}>

            <div className="form-grid">

              <div className="form-group">
                <label>Name</label>

                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="John Smith"
                  required
                />
              </div>

              <div className="form-group">
                <label>Email</label>

                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="john@example.com"
                  required
                />
              </div>

              <div className="form-group">
                <label>Company</label>

                <input
                  type="text"
                  name="company"
                  value={form.company}
                  onChange={handleChange}
                  placeholder="ABC Company"
                  required
                />
              </div>

              <div className="form-group">
                <label>Budget</label>

                <input
                  type="text"
                  name="budget"
                  value={form.budget}
                  onChange={handleChange}
                  placeholder="$10,000"
                  required
                />
              </div>

              <div className="form-group">
                <label>Timeline</label>

                <input
                  type="text"
                  name="timeline"
                  value={form.timeline}
                  onChange={handleChange}
                  placeholder="Next month"
                  required
                />
              </div>

            </div>

            <div className="form-group">
              <label>Requirement</label>

              <textarea
                name="requirement"
                value={form.requirement}
                onChange={handleChange}
                placeholder="Describe what the customer needs..."
                rows="4"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
            >
              {submitting
                ? "Analyzing Lead..."
                : "Create & Analyze Lead"}
            </button>

          </form>

        </div>

        <div className="leads-section-header">

  <div>
  <h2>Recent Leads ({filteredLeads.length})</h2>

  <p>
    Showing {filteredLeads.length} of {totalLeads} leads
  </p>
</div>

  <div className="lead-filters">

    <input
      type="text"
      placeholder="Search by name, email or company..."
      value={searchTerm}
      onChange={(event) => setSearchTerm(event.target.value)}
    />

    <select
      value={statusFilter}
      onChange={(event) => setStatusFilter(event.target.value)}
    >
      <option value="all">All Statuses</option>
      <option value="new">New</option>
      <option value="contacted">Contacted</option>
      <option value="qualified">Qualified</option>
      <option value="closed">Closed</option>
    </select>

    <button
  className="clear-filters-button"
  onClick={clearFilters}
>
  Clear Filters
</button>

  </div>

</div>

{loading ? (
          <p>Loading leads...</p>
        ) : filteredLeads.length === 0 ? (
          <p>No matching leads found.</p>
        ) : (
          filteredLeads.map((lead) => (

            <div
              className="lead-card"
              id={`lead-${lead.id}`}
            >

              <div className="lead-header">

  <h3>{lead.name}</h3>

  <div className="lead-actions">

    <div className="score-info">

  <span className="score">
    Score: {lead.lead_score}
  </span>

  <span
    className={`priority priority-${getPriority(
      lead.lead_score
    ).toLowerCase()}`}
  >
    {getPriority(lead.lead_score)} Priority
  </span>

</div>

    <select
      value={lead.status || "new"}
      onChange={(event) =>
        updateStatus(lead.id, event.target.value)
      }
    >
      <option value="new">New</option>
      <option value="contacted">Contacted</option>
      <option value="qualified">Qualified</option>
      <option value="closed">Closed</option>
    </select>

  </div>

</div>
<button
  className="details-button"
  onClick={() =>
    setExpandedLeadId(
      expandedLeadId === lead.id ? null : lead.id
    )
  }
>
  {expandedLeadId === lead.id
    ? "Hide Details"
    : "View Details"}
</button>

              <div className="info-grid">

                <div className="info-item">
                  <strong>Company</strong>
                  {lead.company}
                </div>

                <div className="info-item">
                  <strong>Email</strong>
                  {lead.email}
                </div>

                <div className="info-item">
                  <strong>Budget</strong>
                  {lead.budget}
                </div>

                <div className="info-item">
                  <strong>Timeline</strong>
                  {lead.timeline}
                </div>

                <div className="info-item">
                  <strong>Follow-up Date</strong>

                  <input
                    type="date"
                    value={
                      lead.follow_up_date
                        ? lead.follow_up_date.substring(0, 10)
                        : ""
                    }
                    onChange={(event) =>
                      updateFollowUpDate(
                        lead.id,
                        event.target.value
                      )
                    }
                  />
                </div>

              </div>

              {expandedLeadId === lead.id && (
  <>
    <div className="section">
      <h4>Requirement</h4>
      <p>{lead.requirement}</p>
    </div>

    <div className="section">
      <h4>AI Analysis</h4>

      <p>
        {lead.score_reason ||
          "No AI analysis available."}
      </p>
    </div>

    <div className="section">
      <h4>AI Response</h4>

      <div className="ai-response">
        {lead.ai_response ||
          "No AI response available."}
      </div>
    </div>
  </>
)}

            </div>

          ))
        )}

      </main>

    </div>
  );
}

export default App;