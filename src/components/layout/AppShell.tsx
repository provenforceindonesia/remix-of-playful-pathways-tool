import { useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "./AppSidebar";
import { Topbar } from "./Topbar";
import { FilterProvider } from "@/lib/filter-context";

const DERIVED_KEYS = [
  "v_production_kpi",
  "v_production_daily",
  "v_machine_health",
  "notifications",
];

function RealtimeBridge() {
  const qc = useQueryClient();
  useEffect(() => {
    const pending = new Set<string>();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const flush = () => {
      timer = null;
      const tables = [...pending];
      pending.clear();
      tables.forEach((t) => void qc.invalidateQueries({ queryKey: [t] }));
      DERIVED_KEYS.forEach((k) => void qc.invalidateQueries({ queryKey: [k] }));
    };

    const channel = supabase
      .channel("miq-realtime")
      .on("postgres_changes", { event: "*", schema: "public" }, (payload) => {
        const table = (payload as { table?: string }).table;
        if (!table) return;
        pending.add(table);
        if (!timer) timer = setTimeout(flush, 300);
      })
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [qc]);
  return null;
}


export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <FilterProvider>
      <RealtimeBridge />
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onOpenMobile={() => setMobileOpen(true)} />
          <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </FilterProvider>
  );
}
