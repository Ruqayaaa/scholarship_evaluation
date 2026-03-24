import * as React from "react";

function cn(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200",
        className
      )}
      {...props}
    />
  );
}
