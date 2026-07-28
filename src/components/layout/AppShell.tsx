import { useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "./AppSidebar";
import { Topbar } from "./Topbar";
import { FilterProvider } from "@/lib/filter-context";

function RealtimeBridge() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("miq-realtime")
      .on("postgres_changes", { event: "*", schema: "public" }, (payload) => {
        const table = (payload as { table?: string }).table;
        if (!table) return;
        void qc.invalidateQueries({ queryKey: [table] });
        void qc.invalidateQueries({ queryKey: ["v_production_kpi"] });
        void qc.invalidateQueries({ queryKey: ["v_machine_health"] });
      })
      .subscribe();
    return () => {
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
