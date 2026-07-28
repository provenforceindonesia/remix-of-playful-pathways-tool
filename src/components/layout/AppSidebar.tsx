import { useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import * as Icons from "lucide-react";
import { useAuth } from "@/lib/auth";
import { navForRole } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";

function Icon({ name, className }: { name: string; className?: string }) {
  const C = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
  return C ? <C className={className} /> : <Icons.Circle className={className} />;
}

function SidebarBody({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { role, roleName, profile } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const groups = navForRole(role);

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border px-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Icons.Factory className="size-4" />
        </span>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight text-sidebar-foreground">
              MANUFACTURE<span className="text-primary">IQ</span>
            </p>
            <p className="truncate text-[10px] text-muted-foreground">
              Manufacturing Performance Control
            </p>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <nav className="space-y-4 p-2">
          {groups.map((g) => (
            <div key={g.label}>
              {!collapsed && (
                <p className="px-2 pb-1 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                  {g.label}
                </p>
              )}
              <div className="space-y-0.5">
                {g.items.map((item) => {
                  const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={onNavigate}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors",
                        active
                          ? "bg-primary/15 font-medium text-primary"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                        collapsed && "justify-center",
                      )}
                    >
                      <Icon name={item.icon} className="size-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {!collapsed && (
        <div className="shrink-0 border-t border-sidebar-border p-3">
          <p className="truncate text-xs font-medium text-sidebar-foreground">
            {profile?.full_name}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">{roleName}</p>
        </div>
      )}
    </div>
  );
}

export function AppSidebar({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
}: {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}) {
  return (
    <>
      <aside
        className={cn(
          "relative hidden shrink-0 border-r border-sidebar-border transition-all duration-200 lg:block",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <div className="sticky top-0 h-screen">
          <SidebarBody collapsed={collapsed} />
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="absolute top-16 -right-3 z-20 size-6 rounded-full"
            aria-label="Ubah lebar sidebar"
          >
            {collapsed ? (
              <Icons.ChevronRight className="size-3" />
            ) : (
              <Icons.ChevronLeft className="size-3" />
            )}
          </Button>
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SidebarBody collapsed={false} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}

export function useSidebarState() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  return { collapsed, setCollapsed, mobileOpen, setMobileOpen, navigate };
}
