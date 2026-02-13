import React from "react";

type LiveScreenKey = "A" | "B" | "C";
type LiveLocks = Partial<Record<LiveScreenKey, boolean>>;

function cls(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const LIVE_SCREENS: LiveScreenKey[] = ["A", "B", "C"];

type LiveEnabledToggleProps = {
  value: boolean;
  onChange: (enabled: boolean) => void | Promise<unknown>;
  label?: React.ReactNode;
  className?: string;
};

export function LiveEnabledToggle(props: LiveEnabledToggleProps) {
  const { value, onChange, label = "Live", className } = props;
  return (
    <label className={cls("cp-inline-field", className)}>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

type LiveTargetButtonsProps = {
  target: LiveScreenKey;
  onChange: (screen: LiveScreenKey) => void | Promise<unknown>;
  locked?: LiveLocks;
  className?: string;
  buttonClassName?: string;
  activeClassName?: string;
  formatLabel?: (screen: LiveScreenKey, locked: boolean) => React.ReactNode;
};

export function LiveTargetButtons(props: LiveTargetButtonsProps) {
  const {
    target,
    onChange,
    locked,
    className = "cp-inline-row-tight",
    buttonClassName = "cp-target-btn-live",
    activeClassName = "is-active",
    formatLabel = (screen) => `Ecran ${screen}`,
  } = props;

  return (
    <div className={className}>
      {LIVE_SCREENS.map((screen) => {
        const isLocked = !!locked?.[screen];
        return (
          <button
            key={screen}
            type="button"
            onClick={() => onChange(screen)}
            className={cls(buttonClassName, target === screen && activeClassName)}
          >
            {formatLabel(screen, isLocked)}
          </button>
        );
      })}
    </div>
  );
}

type LiveLockChipsProps = {
  locked?: LiveLocks;
  onToggle: (screen: LiveScreenKey, locked: boolean) => void | Promise<unknown>;
  className?: string;
  itemClassName?: string;
  labelPrefix?: string;
};

export function LiveLockChips(props: LiveLockChipsProps) {
  const { locked, onToggle, className = "cp-chip-row", itemClassName = "cp-inline-check cp-text-13", labelPrefix = "Lock " } = props;
  return (
    <div className={className}>
      {LIVE_SCREENS.map((screen) => (
        <label key={screen} className={itemClassName}>
          <input type="checkbox" checked={!!locked?.[screen]} onChange={(e) => onToggle(screen, e.target.checked)} />
          {labelPrefix}
          {screen}
        </label>
      ))}
    </div>
  );
}
