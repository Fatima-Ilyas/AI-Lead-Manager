import { useId, useState } from "react";
import { Tooltip } from "@base-ui/react/tooltip";
import { Select } from "@base-ui/react/select";
import {
  Check,
  ChevronDown,
  CircleHelp,
  LoaderCircle,
  Users,
  ArrowUpRight,
} from "lucide-react";
import { initials, scoreValue, STAGES } from "../lib/leads";

export function Button({
  children,
  icon: Icon,
  variant = "primary",
  className = "",
  busy = false,
  disabled,
  ...props
}) {
  return (
    <button
      type="button"
      className={`button button-${variant} ${className}`}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...props}
    >
      {busy ? (
        <LoaderCircle size={17} className="spin" aria-hidden="true" />
      ) : (
        Icon && <Icon size={17} aria-hidden="true" />
      )}
      {children}
    </button>
  );
}

export function HelpTip({ label, children }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <Tooltip.Root open={open} onOpenChange={setOpen} triggerId={id}>
      <Tooltip.Trigger
        id={id}
        type="button"
        className="help-tip"
        aria-label={`About ${label}`}
        delay={800}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        closeOnClick={false}
        onClick={() => setOpen(true)}
      >
        <CircleHelp size={14} aria-hidden="true" />
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner
          side="top"
          sideOffset={8}
          collisionPadding={16}
          className="popup-positioner"
        >
          <Tooltip.Popup className="tooltip-popup">
            {children}
            <Tooltip.Arrow className="tooltip-arrow" />
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export function LabelTooltip({ label, children, enabled = true }) {
  if (!enabled) return children;
  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={children} delay={800} />
      <Tooltip.Portal>
        <Tooltip.Positioner
          side="right"
          sideOffset={10}
          collisionPadding={12}
          className="popup-positioner"
        >
          <Tooltip.Popup className="tooltip-popup label-tooltip">
            {label}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export function SelectField({
  value,
  onChange,
  options,
  label,
  className = "",
  disabled = false,
  id,
}) {
  return (
    <Select.Root
      value={value}
      onValueChange={(next) => next !== null && onChange(next)}
      items={options}
      disabled={disabled}
      modal={false}
    >
      <Select.Trigger
        id={id}
        aria-label={label}
        className={`select-trigger ${className}`}
      >
        <Select.Value />
        <Select.Icon>
          <ChevronDown size={15} aria-hidden="true" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner
          sideOffset={6}
          alignItemWithTrigger={false}
          collisionPadding={12}
          className="popup-positioner"
        >
          <Select.Popup className="select-popup">
            <Select.List>
              {options.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  className="select-item"
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator>
                    <Check size={15} />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

export function Avatar({ name, size = "normal" }) {
  const color =
    Array.from(name || "").reduce(
      (sum, letter) => sum + letter.charCodeAt(0),
      0,
    ) % 5;
  return (
    <span
      className={`avatar avatar-${color} avatar-${size}`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

export function StageBadge({ status = "new" }) {
  const stage = STAGES.find((item) => item.value === status) || STAGES[0];
  return (
    <span className={`badge badge-${stage.color}`}>
      <span className="status-dot" />
      {stage.label}
    </span>
  );
}

export function Score({ value, compact = false }) {
  const score = scoreValue(value);
  return (
    <span
      className={`score ${score >= 70 ? "score-high" : score >= 40 ? "score-medium" : "score-low"}`}
      aria-label={
        score === null ? "Not scored" : `Lead score ${score} out of 100`
      }
    >
      {!compact && (
        <span className="score-track">
          <span style={{ width: `${score ?? 0}%` }} />
        </span>
      )}
      {score ?? "—"}
      {!compact && <span className="score-max">/ 100</span>}
    </span>
  );
}

export function SectionHeading({ title, subtitle, help, helpLabel, children }) {
  return (
    <div className="section-heading">
      <div>
        <div className="heading-with-help">
          <h2>{title}</h2>
          {help && (
            <HelpTip
              label={
                helpLabel ||
                (typeof title === "string" ? title : "this section")
              }
            >
              {help}
            </HelpTip>
          )}
        </div>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function EmptyState({
  icon: Icon = Users,
  title,
  description,
  children,
  compact = false,
}) {
  return (
    <div className={`empty-state ${compact ? "empty-compact" : ""}`}>
      <span className="empty-icon">
        <Icon size={24} strokeWidth={1.6} aria-hidden="true" />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}

export function Skeleton({ className = "" }) {
  return <span className={`skeleton ${className}`} aria-hidden="true" />;
}

export function ViewLink({ children, onClick }) {
  return (
    <Button variant="text" onClick={onClick}>
      {children}
      <ArrowUpRight size={16} aria-hidden="true" />
    </Button>
  );
}
