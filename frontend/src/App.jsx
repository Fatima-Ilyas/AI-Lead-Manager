import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Tooltip } from "@base-ui/react/tooltip";
import { Toaster, toast } from "sonner";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useLeads } from "./hooks/useLeads";
import { useRoute } from "./hooks/useRoute";
import { getToken, signOut, subscribe } from "./lib/auth";
import { getStats } from "./lib/leads";
import { AppShell, AddLeadButton, PageHeading } from "./components/AppShell";
import { Button, EmptyState, Skeleton } from "./components/ui";
import { LeadsWorkspace } from "./components/LeadTable";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Login } from "./pages/Login";
import "./App.css";

const Overview = lazy(() =>
  import("./components/Dashboard").then((module) => ({
    default: module.Overview,
  })),
);
const FollowUps = lazy(() =>
  import("./components/Dashboard").then((module) => ({
    default: module.FollowUps,
  })),
);
const LeadForm = lazy(() =>
  import("./pages/LeadForm").then((module) => ({ default: module.LeadForm })),
);
const LeadDetail = lazy(() =>
  import("./pages/LeadDetail").then((module) => ({
    default: module.LeadDetail,
  })),
);
const Insights = lazy(() =>
  import("./pages/Insights").then((module) => ({ default: module.Insights })),
);
const Guide = lazy(() =>
  import("./pages/Guide").then((module) => ({ default: module.Guide })),
);

const headings = {
  overview: {
    title: "Overview",
    description:
      "Pipeline performance and the conversations that need your attention.",
  },
  leads: {
    title: "All leads",
    description: "Review, qualify and track every opportunity.",
  },
  "follow-ups": {
    title: "Follow-ups",
    description: "Keep upcoming and overdue conversations on track.",
  },
  insights: {
    title: "Insights",
    description: "Track lead quality, activity and pipeline progress.",
  },
};

// Shows the login page until there is a token. The workspace is keyed by the
// token, so signing out (or the server rejecting the token) unmounts it and
// drops every lead held in memory; the next sign-in starts from a blank slate.
export default function App() {
  const token = useSyncExternalStore(subscribe, getToken);
  return (
    <>
      {token ? <Workspace key={token} /> : <Login />}
      <Toaster
        position="bottom-right"
        richColors
        closeButton
        toastOptions={{ className: "workspace-toast" }}
      />
    </>
  );
}

function Workspace() {
  const data = useLeads();
  const [route, navigate] = useRoute();
  const [search, setSearch] = useState("");
  const previousRoute = useRef(route);
  const focusSearch = useRef(false);
  const stats = getStats(data.leads);
  const lead = route.startsWith("lead/")
    ? data.leads.find((item) => String(item.id) === route.slice(5))
    : null;

  useEffect(() => {
    document.title = `${route.startsWith("lead/") ? "Lead details" : route === "new-lead" ? "New lead" : headings[route] ? (route === "follow-ups" ? "Follow-ups" : route.charAt(0).toUpperCase() + route.slice(1)) : "Workspace guide"} · AI Lead Manager`;
    if (focusSearch.current && route === "leads") {
      document.querySelector('input[aria-label="Search leads"]')?.focus();
      focusSearch.current = false;
    } else if (previousRoute.current !== route) {
      document.querySelector(".page-title")?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "instant" });
    }
    previousRoute.current = route;
  }, [route, data.mode]);

  useEffect(() => {
    const keydown = (event) => {
      const target = event.target;
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
        target.isContentEditable ||
        target.closest('[role="listbox"], [role="dialog"]')
      )
        return;
      if (event.key === "/") {
        event.preventDefault();
        if (route === "leads")
          document.querySelector('input[aria-label="Search leads"]')?.focus();
        else {
          focusSearch.current = true;
          window.location.hash = "leads";
        }
      } else if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        window.location.hash = "new-lead";
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [route]);

  const reconnect = async () => {
    const connected = await data.refresh();
    if (connected) toast.success("Workspace connected");
    else
      toast.info("The backend is still unavailable.", {
        description:
          data.mode === "sample"
            ? "You can keep exploring the sample workspace."
            : "Try again when the backend is available.",
      });
  };

  return (
    <Tooltip.Provider delay={800}>
      <AppShell
        route={route}
        navigate={navigate}
        stats={stats}
        mode={data.mode}
        onSignOut={signOut}
      >
        {headings[route] && (
          <PageHeading {...headings[route]}>
            <AddLeadButton navigate={navigate} />
          </PageHeading>
        )}
        {data.mode === "sample" && headings[route] && (
          <div className="preview-notice" role="status">
            <span className="preview-notice-icon" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <p>
              <strong>Sample workspace.</strong> You’re viewing sample leads.
              Changes stay in this browser.
            </p>
            <Button
              variant="text"
              icon={RefreshCw}
              busy={data.refreshing}
              onClick={reconnect}
            >
              Connect live data
            </Button>
          </div>
        )}
        {data.error && (
          <div className="error-notice" role="alert">
            <p>{data.error}</p>
            <Button
              variant="secondary"
              busy={data.refreshing}
              onClick={reconnect}
            >
              Try again
            </Button>
          </div>
        )}
        <ErrorBoundary key={route}>
          <Suspense fallback={<WorkspaceSkeleton route={route} />}>
            {data.mode === "loading" ? (
              <WorkspaceSkeleton route={route} />
            ) : route === "overview" ? (
              <Overview leads={data.leads} stats={stats} navigate={navigate} />
            ) : route === "leads" ? (
              <LeadsWorkspace
                leads={data.leads}
                navigate={navigate}
                search={search}
                setSearch={setSearch}
              />
            ) : route === "follow-ups" ? (
              <FollowUps leads={data.leads} navigate={navigate} />
            ) : route === "insights" ? (
              <Insights leads={data.leads} stats={stats} navigate={navigate} />
            ) : route === "new-lead" ? (
              <LeadForm {...data} navigate={navigate} />
            ) : route === "guide" ? (
              <Guide />
            ) : lead ? (
              <LeadDetail
                key={lead.id}
                lead={lead}
                navigate={navigate}
                updateLead={data.updateLead}
                pending={data.pending}
                mode={data.mode}
              />
            ) : (
              <section className="panel">
                <EmptyState
                  title="This lead isn’t in your workspace"
                  description="It may belong to a different environment. Return to your directory to find the right conversation."
                >
                  <Button
                    variant="secondary"
                    icon={ArrowLeft}
                    onClick={() => navigate("leads")}
                  >
                    Back to leads
                  </Button>
                </EmptyState>
              </section>
            )}
          </Suspense>
        </ErrorBoundary>
      </AppShell>
    </Tooltip.Provider>
  );
}

function WorkspaceSkeleton({ route = "overview" }) {
  const detail = route.startsWith("lead/");
  const form = route === "new-lead";
  const list = ["leads", "follow-ups", "guide"].includes(route);
  return (
    <div
      className="workspace-loading"
      role="status"
      aria-label="Loading your workspace"
    >
      <span className="sr-only">Loading your workspace</span>
      {form ? (
        <div className="lead-form-page">
          <Skeleton className="skeleton-title" />
          <Skeleton className="skeleton-form" />
        </div>
      ) : detail ? (
        <>
          <div className="skeleton-detail-heading">
            <Skeleton className="skeleton-avatar" />
            <Skeleton className="skeleton-title" />
          </div>
          <div className="detail-layout">
            <div className="detail-main">
              <Skeleton className="skeleton-record" />
              <Skeleton className="skeleton-record" />
            </div>
            <div className="detail-aside">
              <Skeleton className="skeleton-manager" />
              <Skeleton className="skeleton-record" />
            </div>
          </div>
        </>
      ) : list ? (
        <div className="panel skeleton-directory">
          <Skeleton className="skeleton-directory-toolbar" />
          {Array.from({ length: 8 }, (_, index) => (
            <div className="skeleton-directory-row" key={index}>
              <Skeleton className="skeleton-label" />
              <Skeleton className="skeleton-label" />
              <Skeleton className="skeleton-label" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="metrics skeleton-metrics">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="metric">
                <Skeleton className="skeleton-label" />
                <Skeleton className="skeleton-number" />
                <Skeleton className="skeleton-label" />
              </div>
            ))}
          </div>
          <div className="overview-grid">
            <Skeleton className="skeleton-chart" />
            <Skeleton className="skeleton-chart" />
          </div>
          <Skeleton className="skeleton-table" />
        </>
      )}
    </div>
  );
}
