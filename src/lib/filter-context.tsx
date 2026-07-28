import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { toISODate } from "@/lib/format";

export type GlobalFilter = {
  plantId: string | null;
  lineId: string | null;
  shiftId: string | null;
  machineId: string | null;
  from: string;
  to: string;
  preset: "hari-ini" | "7-hari" | "bulanan" | "custom";
};

type Ctx = {
  filter: GlobalFilter;
  setFilter: (patch: Partial<GlobalFilter>) => void;
  applyPreset: (p: GlobalFilter["preset"]) => void;
};

const today = () => toISODate(new Date());
const daysAgo = (n: number) => toISODate(new Date(Date.now() - n * 86400000));

const FilterCtx = createContext<Ctx | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filter, setFilterState] = useState<GlobalFilter>({
    plantId: null,
    lineId: null,
    shiftId: null,
    machineId: null,
    from: daysAgo(6),
    to: today(),
    preset: "7-hari",
  });

  const value = useMemo<Ctx>(
    () => ({
      filter,
      setFilter: (patch) => setFilterState((f) => ({ ...f, ...patch })),
      applyPreset: (p) => {
        if (p === "hari-ini") setFilterState((f) => ({ ...f, preset: p, from: today(), to: today() }));
        else if (p === "7-hari")
          setFilterState((f) => ({ ...f, preset: p, from: daysAgo(6), to: today() }));
        else if (p === "bulanan")
          setFilterState((f) => ({ ...f, preset: p, from: daysAgo(29), to: today() }));
        else setFilterState((f) => ({ ...f, preset: p }));
      },
    }),
    [filter],
  );

  return <FilterCtx.Provider value={value}>{children}</FilterCtx.Provider>;
}

export function useGlobalFilter() {
  const ctx = useContext(FilterCtx);
  if (!ctx) throw new Error("useGlobalFilter harus dipakai di dalam FilterProvider");
  return ctx;
}
