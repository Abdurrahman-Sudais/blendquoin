import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "./label";

/** Lightweight field wrapper for React Hook Form + Zod error display. */
export function FormField({
  label,
  error,
  hint,
  className,
  htmlFor,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className={cn(error && "text-destructive")}>
        {label}
      </Label>
      {children}
      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
