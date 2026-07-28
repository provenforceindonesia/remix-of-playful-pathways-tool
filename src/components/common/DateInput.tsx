import * as React from "react";
import { Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type DateInputProps = Omit<React.ComponentProps<"input">, "type"> & {
  type?: "date" | "datetime-local" | "time";
};

export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ className, type = "date", ...props }, ref) => {
    const Icon = type === "time" ? Clock : Calendar;
    return (
      <div className="relative">
        <input
          type={type}
          className={cn(
            "hide-date-picker-indicator flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pr-9 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            className,
          )}
          ref={ref}
          {...props}
        />
        <Icon className="pointer-events-none absolute bottom-2 right-3 z-10 size-4 text-muted-foreground" />
      </div>
    );
  },
);
DateInput.displayName = "DateInput";
