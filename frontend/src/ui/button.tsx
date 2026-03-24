import * as React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost";
  size?: "md" | "sm";
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: Props) {
  const v =
    variant === "primary" ? "btn btn-primary" :
    variant === "outline" ? "btn btn-outline" :
    "btn btn-ghost";

  const s = size === "sm" ? "btn-sm" : "";

  return <button className={`${v} ${s} ${className}`.trim()} {...props} />;
}
