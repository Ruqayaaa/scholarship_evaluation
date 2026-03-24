import * as React from "react";

type DivProps = React.HTMLAttributes<HTMLDivElement>;
type HProps = React.HTMLAttributes<HTMLHeadingElement>;

export function Card({ className = "", ...props }: DivProps) {
  return <div className={`admin-card ${className}`.trim()} {...props} />;
}

export function CardHeader({ className = "", ...props }: DivProps) {
  return <div className={`admin-card-head ${className}`.trim()} {...props} />;
}

export function CardTitle({ className = "", ...props }: HProps) {
  return <h3 className={`admin-card-title ${className}`.trim()} {...props} />;
}

export function CardContent({ className = "", ...props }: DivProps) {
  return <div className={`admin-card-body ${className}`.trim()} {...props} />;
}
