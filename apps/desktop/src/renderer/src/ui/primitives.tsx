import React from "react";

function cls(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type PageHeaderProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  titleStyle?: React.CSSProperties;
  subtitleStyle?: React.CSSProperties;
  style?: React.CSSProperties;
};

export function PageHeader(props: PageHeaderProps) {
  const { title, subtitle, actions, className, titleClassName, subtitleClassName, titleStyle, subtitleStyle, style } = props;
  return (
    <div className={cls("cp-page-header", className)} style={style}>
      <div>
        <h1 className={cls("cp-page-title", titleClassName)} style={titleStyle}>
          {title}
        </h1>
        {subtitle ? (
          <div className={cls("cp-page-subtitle", subtitleClassName)} style={subtitleStyle}>
            {subtitle}
          </div>
        ) : null}
      </div>
      {actions ? <div className="cp-actions">{actions}</div> : null}
    </div>
  );
}

type AlertTone = "info" | "success" | "error";
type AlertProps = {
  tone?: AlertTone;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export function Alert(props: AlertProps) {
  const { tone = "info", children, className, style } = props;
  return (
    <div
      className={cls("cp-alert", tone === "error" && "cp-alert--error", tone === "success" && "cp-alert--success", className)}
      style={style}
    >
      {children}
    </div>
  );
}

type PanelProps = {
  children: React.ReactNode;
  soft?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

export function Panel(props: PanelProps) {
  const { children, soft = false, className, style } = props;
  return (
    <div className={cls("panel", "cp-panel", soft && "cp-panel-soft", className)} style={style}>
      {children}
    </div>
  );
}

type ActionRowProps = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export function ActionRow(props: ActionRowProps) {
  const { children, className, style } = props;
  return (
    <div className={cls("cp-actions", className)} style={style}>
      {children}
    </div>
  );
}
