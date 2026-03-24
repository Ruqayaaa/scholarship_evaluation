import * as React from "react";

type SelectCtx = {
  value: string;
  setValue: (v: string) => void;
};

const Ctx = React.createContext<SelectCtx | null>(null);

/**
 * CSS-only Select with shadcn-like API compatibility.
 * Usage:
 * <Select value=... onValueChange=...>
 *   <SelectTrigger className="..."><SelectValue placeholder="..." /></SelectTrigger>
 *   <SelectContent>
 *     <SelectItem value="x">X</SelectItem>
 *   </SelectContent>
 * </Select>
 */
export function Select({
  value,
  onValueChange,
  children,
}: {
  value: string;
  onValueChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={{ value, setValue: onValueChange }}>{children}</Ctx.Provider>;
}

/** Trigger just renders a real <select> in our CSS-only version */
export function SelectTrigger({
  className = "",
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const ctx = React.useContext(Ctx);
  if (!ctx) return <div className={className}>{children}</div>;

  // Collect items from SelectContent children (we render options via SelectContent below)
  // But to keep things simple + robust: SelectContent will render a hidden option list marker,
  // and SelectTrigger will render the actual <select> using a registry.
  // We'll implement registry with a global-ish ref in context via a local state.

  return <div className={className}>{children}</div>;
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  // Placeholder is handled by the <select> itself in SelectContent below.
  // Keep this component for API compatibility.
  return <>{placeholder ? null : null}</>;
}

/**
 * We render a native <select> here so you can style it with .field / .admin-select
 * This makes your UI consistent and avoids dropdown complexity.
 */
export function SelectContent({ children }: { children: React.ReactNode }) {
  const ctx = React.useContext(Ctx);
  if (!ctx) return null;

  // Extract option elements from children
  const options: Array<{ value: string; label: React.ReactNode }> = [];
  React.Children.forEach(children, (child: any) => {
    if (!child) return;
    if (child.type && child.props?.value !== undefined) {
      options.push({ value: child.props.value, label: child.props.children });
    }
  });

  // If the developer used "all", allow it as normal
  return (
    <select
      className="field admin-select"
      value={ctx.value}
      onChange={(e) => ctx.setValue(e.target.value)}
    >
      {options.map((o) => (
        <option key={String(o.value)} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  // This is not directly rendered; SelectContent reads these and creates <option>s.
  return <>{children}</>;
}
