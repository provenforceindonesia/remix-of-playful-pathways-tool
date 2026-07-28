import * as React from "react";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { id as idLocale } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type DateInputProps = Omit<React.ComponentProps<"input">, "type"> & {
  type?: "date" | "datetime-local" | "time";
};

type PickerInput = HTMLInputElement & { showPicker?: () => void };

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toDateOnly(v: string) {
  const s = v.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? undefined : dt;
}

export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ className, type = "date", value, onChange, readOnly, disabled, ...props }, ref) => {
    const innerRef = React.useRef<HTMLInputElement | null>(null);
    const [open, setOpen] = React.useState(false);
    const str = String(value ?? "");

    const setRefs = (node: HTMLInputElement | null) => {
      innerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
    };

    const emit = (next: string) => {
      const el = innerRef.current;
      if (el) {
        // native setter so React picks up the change on a controlled input
        const proto = Object.getPrototypeOf(el) as HTMLInputElement;
        const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
        setter?.call(el, next);
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
      onChange?.({
        target: { value: next, name: props.name ?? "" },
        currentTarget: { value: next, name: props.name ?? "" },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    };

    const openTimePicker = () => {
      const el = innerRef.current as PickerInput | null;
      if (!el || el.disabled || el.readOnly) return;
      el.focus();
      try {
        el.showPicker?.();
      } catch {
        /* ignored */
      }
    };

    const onSelect = (d: Date | undefined) => {
      if (!d) return;
      const base = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      emit(type === "datetime-local" ? `${base}T${str.slice(11, 16) || "08:00"}` : base);
      setOpen(false);
    };

    const inputEl = (
      <input
        type={type}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        disabled={disabled}
        className={cn(
          "hide-date-picker-indicator flex h-10 w-full rounded-[0.5rem] border border-input bg-field px-3 py-1 pr-11 text-sm shadow-sm transition-[color,box-shadow,border-color] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={setRefs}
        {...props}
      />
    );

    if (type === "time") {
      return (
        <div className="relative">
          {inputEl}
          <button
            type="button"
            tabIndex={-1}
            aria-label="Buka pemilih waktu"
            onClick={openTimePicker}
            className="absolute right-2 bottom-1.5 z-10 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
          >
            <Clock className="size-4" />
          </button>
        </div>
      );
    }

    return (
      <div className="relative">
        {inputEl}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              tabIndex={-1}
              disabled={disabled || readOnly}
              aria-label="Buka pemilih tanggal"
              className="absolute right-2 bottom-1.5 z-10 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-50"
            >
              <CalendarIcon className="size-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={toDateOnly(str)}
              defaultMonth={toDateOnly(str)}
              onSelect={onSelect}
              locale={idLocale}
              initialFocus
              className={cn("pointer-events-auto p-3")}
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  },
);
DateInput.displayName = "DateInput";
