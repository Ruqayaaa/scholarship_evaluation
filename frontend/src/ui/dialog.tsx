import * as React from "react";

type Ctx = { open: boolean; setOpen: (v: boolean) => void };
const DialogContext = React.createContext<Ctx | null>(null);

export function Dialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return <DialogContext.Provider value={{ open, setOpen }}>{children}</DialogContext.Provider>;
}

/**
 * Compatibility with shadcn usage:
 * <DialogTrigger asChild><Button ... /></DialogTrigger>
 * We accept asChild but simply wrap the children in a span click target.
 */
export function DialogTrigger({
  children,
  asChild,
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) {
  const ctx = React.useContext(DialogContext);

  // When asChild is used, the child is usually a Button; we can still wrap it.
  // (CSS-only approach: no cloneElement to avoid TS issues)
  return (
    <span style={{ display: "inline-block" }} onClick={() => ctx?.setOpen(true)}>
      {children}
    </span>
  );
}

export function DialogContent({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(DialogContext);
  if (!ctx?.open) return null;

  return (
    <div className="modal-backdrop" onMouseDown={() => ctx.setOpen(false)}>
      <div
        className={`modal modal-wide ${className}`.trim()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
        <button className="primary-btn modal-close" onClick={() => ctx.setOpen(false)}>
          Close
        </button>
      </div>
    </div>
  );
}

export function DialogHeader({ children }: { children: React.ReactNode }) {
  return <div style={{ marginBottom: 10 }}>{children}</div>;
}

export function DialogTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="modal-title">{children}</h3>;
}
