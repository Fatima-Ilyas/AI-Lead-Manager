import {
  ChartNoAxesCombined,
  ChevronRight,
  CircleHelp,
  Building2,
  LayoutDashboard,
  LogOut,
  PanelsTopLeft,
  Plus,
  UsersRound,
  CalendarClock,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useState } from "react";
import { Button, HelpTip, LabelTooltip } from "./ui";

const navigation = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "leads", label: "All leads", icon: UsersRound },
  { id: "follow-ups", label: "Follow-ups", icon: CalendarClock },
  { id: "insights", label: "Insights", icon: ChartNoAxesCombined },
];

export function AppShell({
  route,
  navigate,
  stats,
  mode,
  onSignOut,
  children,
}) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("lead-manager-sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });
  const toggleSidebar = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem("lead-manager-sidebar-collapsed", String(next));
    } catch {
      /* The preference remains available for this session. */
    }
  };
  const active =
    route.startsWith("lead/") || route === "new-lead" ? "leads" : route;
  const current =
    navigation.find((item) => item.id === active)?.label || "Workspace guide";
  return (
    <div className={"app-shell" + (collapsed ? " sidebar-collapsed" : "")}>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to content
      </a>
      <aside
        id="workspace-sidebar"
        className="sidebar"
        aria-label="Workspace sidebar"
      >
        <a
          href="#overview"
          className="brand"
          aria-label="AI Lead Manager overview"
        >
          <span className="brand-mark">
            <PanelsTopLeft size={23} strokeWidth={1.9} />
          </span>
          <span className="brand-wordmark">
            lead<span className="brand-light">manager</span>
            <span className="brand-period">.</span>
          </span>
        </a>
        <div className="workspace-label">
          <span className="workspace-icon">
            <Building2 size={18} />
          </span>
          <div className="workspace-label-copy">
            <strong>Sales workspace</strong>
            <span>Lead management</span>
          </div>
        </div>
        <span className="nav-caption">Workspace</span>
        <nav className="desktop-nav" aria-label="Main navigation">
          {navigation.map(({ id, label, icon: Icon }) => (
            <LabelTooltip key={id} label={label} enabled={collapsed}>
              <a
                href={`#${id}`}
                aria-label={label}
                className={`nav-item ${active === id ? "is-active" : ""}`}
                aria-current={active === id ? "page" : undefined}
              >
                <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                <span className="nav-label">{label}</span>
                {id === "leads" && (
                  <span className="nav-count">{stats.total}</span>
                )}
                {id === "follow-ups" && stats.due > 0 && (
                  <span className="nav-count due-count">{stats.due}</span>
                )}
              </a>
            </LabelTooltip>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <LabelTooltip label="Workspace guide" enabled={collapsed}>
            <a
              href="#guide"
              aria-label="Workspace guide"
              className={`nav-item guide-link ${active === "guide" ? "is-active" : ""}`}
              aria-current={active === "guide" ? "page" : undefined}
            >
              <CircleHelp size={19} />
              <span className="nav-label">Workspace guide</span>
            </a>
          </LabelTooltip>
          <div className="workspace-footer">
            <span className="workspace-avatar">SW</span>
            <div className="workspace-footer-copy">
              <strong>Team workspace</strong>
              <span>
                {mode === "sample"
                  ? "Sample environment"
                  : mode === "live"
                    ? "Connected environment"
                    : mode === "unavailable"
                      ? "Not connected"
                      : "Connecting…"}
              </span>
            </div>
          </div>
        </div>
      </aside>
      <div className="workspace-body">
        <header className="topbar">
          <div className="topbar-navigation">
            <LabelTooltip
              label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Button
                variant="icon"
                className="sidebar-toggle"
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-controls="workspace-sidebar"
                aria-expanded={!collapsed}
                onClick={toggleSidebar}
              >
                {collapsed ? (
                  <PanelLeftOpen size={19} />
                ) : (
                  <PanelLeftClose size={19} />
                )}
              </Button>
            </LabelTooltip>
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <span className="mobile-brand">
                <PanelsTopLeft size={21} />
              </span>
              <span className="breadcrumb-workspace">Workspace</span>
              <ChevronRight size={14} aria-hidden="true" />
              {route === "new-lead" || route.startsWith("lead/") ? (
                <>
                  <a href="#leads">All leads</a>
                  <ChevronRight size={14} aria-hidden="true" />
                  <strong>
                    {route === "new-lead" ? "New lead" : "Lead details"}
                  </strong>
                </>
              ) : (
                <strong>{current}</strong>
              )}
            </nav>
          </div>
          <div className="topbar-actions">
            <span
              className={`connection-badge ${mode === "live" ? "is-live" : ""}`}
            >
              <span />
              {mode === "sample"
                ? "Sample data"
                : mode === "live"
                  ? "Live data"
                  : mode === "unavailable"
                    ? "Not connected"
                    : "Connecting"}
            </span>
            <HelpTip label="workspace connection">
              {mode === "sample"
                ? "The backend is not connected. You are viewing sample leads, and preview changes are saved only in this browser."
                : mode === "unavailable"
                  ? "Your leads could not be loaded, so none are shown. See the message on the page, then try again."
                  : "Lead data is loaded from your configured backend. Contact details and AI recommendations are available in each lead’s record."}
            </HelpTip>
            <span className="topbar-divider" />
            <Button
              variant="icon"
              aria-label="Open workspace guide"
              onClick={() => navigate("guide")}
            >
              <CircleHelp size={19} />
            </Button>
            <LabelTooltip label="Sign out">
              <Button
                variant="icon"
                aria-label="Sign out"
                onClick={onSignOut}
              >
                <LogOut size={19} />
              </Button>
            </LabelTooltip>
          </div>
        </header>
        <main id="main-content" className="main-content" tabIndex={-1}>
          {children}
        </main>
        <footer className="page-footer">
          <span>AI Lead Manager</span>
          <span>
            {mode === "sample"
              ? "Local preview"
              : mode === "live"
                ? "Connected workspace"
                : mode === "unavailable"
                  ? "Workspace not connected"
                  : "Connecting to workspace"}
          </span>
        </footer>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navigation.map(({ id, label, icon: Icon }) => (
          <a
            href={`#${id}`}
            key={id}
            className={active === id ? "is-active" : ""}
            aria-current={active === id ? "page" : undefined}
          >
            <Icon size={21} strokeWidth={1.8} />
            <span>{label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}

export function PageHeading({ eyebrow, title, description, children }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1 tabIndex={-1} className="page-title">
          {title}
        </h1>
        {description && <p>{description}</p>}
      </div>
      <div className="page-actions">{children}</div>
    </div>
  );
}

export function AddLeadButton({ navigate }) {
  return (
    <Button icon={Plus} onClick={() => navigate("new-lead")}>
      Add a lead
    </Button>
  );
}
