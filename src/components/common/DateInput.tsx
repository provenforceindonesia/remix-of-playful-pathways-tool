import * as React from "react";
import { Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type DateInputProps = Omit<React.ComponentProps<"input">, "type"> & {
  type?: "date" | "datetime-local" | "time";
};

type PickerInput = HTMLInputElement & { showPicker?: () => void };

export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ className, type = "date", ...props }, ref) => {
    const Icon = type === "time" ? Clock : Calendar;
    const innerRef = React.useRef<HTMLInputElement | null>(null);

    const setRefs = (node: HTMLInputElement | null) => {
      innerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
    };

    const openPicker = () => {
      const el = innerRef.current as PickerInput | null;
      if (!el || el.disabled) return;
      el.focus();
      try {
        el.showPicker?.();
      } catch {
        /* browser refused (not user-activated) — focus is enough */
      }
    };

    return (
      <div className="relative">
        <input
          type={type}
          onClick={openPicker}
          className={cn(
            "hide-date-picker-indicator flex h-10 w-full cursor-pointer rounded-lg border border-input/70 bg-input/25 px-3 py-1 pr-10 text-sm shadow-sm backdrop-blur-sm transition-[color,box-shadow,border-color] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          ref={setRefs}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Buka pemilih tanggal"
          onClick={openPicker}
          className="absolute right-2 bottom-1.5 z-10 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
        >
          <Icon className="size-4" />
        </button>
      </div>
    );
  },
);
DateInput.displayName = "DateInput";
