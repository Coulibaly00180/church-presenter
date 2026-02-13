import React from "react";
import { InlineField } from "./primitives";

type HeaderSelectOption = {
  value: string;
  label: React.ReactNode;
};

type HeaderSelectFieldProps = {
  label: React.ReactNode;
  value: string;
  options: HeaderSelectOption[];
  onChange: (value: string) => void;
  className?: string;
  selectClassName?: string;
  wide?: boolean;
  disabled?: boolean;
};

export function HeaderSelectField(props: HeaderSelectFieldProps) {
  const { label, value, options, onChange, className, selectClassName, wide = false, disabled = false } = props;
  return (
    <InlineField label={label} className={className} wide={wide}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={selectClassName}
        disabled={disabled}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </InlineField>
  );
}

type ProjectionTargetFieldProps = {
  value: "A" | "B" | "C";
  onChange: (value: "A" | "B" | "C") => void;
  label?: React.ReactNode;
  className?: string;
  selectClassName?: string;
  wide?: boolean;
  disabled?: boolean;
};

const TARGET_OPTIONS: Array<HeaderSelectOption> = [
  { value: "A", label: "Ecran A" },
  { value: "B", label: "Ecran B" },
  { value: "C", label: "Ecran C" },
];

export function ProjectionTargetField(props: ProjectionTargetFieldProps) {
  const { value, onChange, label = "Projeter vers", className, selectClassName, wide = false, disabled = false } = props;
  return (
    <HeaderSelectField
      label={label}
      value={value}
      options={TARGET_OPTIONS}
      onChange={(next) => onChange(next as "A" | "B" | "C")}
      className={className}
      selectClassName={selectClassName}
      wide={wide}
      disabled={disabled}
    />
  );
}

type PlanSelectFieldProps<TPlan> = {
  label?: React.ReactNode;
  value: string;
  plans: TPlan[];
  getPlanId: (plan: TPlan) => string;
  getPlanLabel: (plan: TPlan) => React.ReactNode;
  onChange: (value: string) => void;
  className?: string;
  selectClassName?: string;
  wide?: boolean;
  disabled?: boolean;
};

export function PlanSelectField<TPlan,>(props: PlanSelectFieldProps<TPlan>) {
  const {
    label = "Plan",
    value,
    plans,
    getPlanId,
    getPlanLabel,
    onChange,
    className,
    selectClassName,
    wide = false,
    disabled = false,
  } = props;

  const options = plans.map((plan) => ({
    value: getPlanId(plan),
    label: getPlanLabel(plan),
  }));

  return (
    <HeaderSelectField
      label={label}
      value={value}
      options={options}
      onChange={onChange}
      className={className}
      selectClassName={selectClassName}
      wide={wide}
      disabled={disabled}
    />
  );
}
