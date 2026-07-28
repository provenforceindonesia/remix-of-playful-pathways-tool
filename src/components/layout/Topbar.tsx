import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Check,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Radio,
  Search,
  Sun,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { useGlobalFilter } from "@/lib/filter-context";
import { navForRole } from "@/lib/nav";
import { notificationsQuery, plantsQuery, shiftsQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/format";
import { StatusBadge } from "@/components/common/StatusBadge";

export function Topbar({ onOpenMobile }: { onOpenMobile: () => void }) {
  const { mode, setMode } = useTheme();
  const { profile, roleName, role, signOut } = useAuth();
  const { filter, setFilter } = useGlobalFilter();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: plants = [] } = useQuery(plantsQuery);
  const { data: shifts = [] } = useQuery(shiftsQuery);
  const { data: notifications = [] } = useQuery(notificationsQuery);

  const unread = (notifications as Array<{ is_read: boolean }>).filter((n) => !n.is_read).length;

  const menuItems = useMemo(() => navForRole(role).flatMap((g) => g.items), [role]);
  const matches = search
    ? menuItems.filter((m) => m.label.toLowerCase().includes(search.toLowerCase())).slice(0, 6)
    : [];

  const markAllRead = async () => {
    if (!profile) return;
    await supabase.from("notifications").update({ is_read: true }).eq("recipient_id", profile.id);
    void qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const handleSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface/95 px-3 backdrop-blur">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenMobile}>
        <Menu className="size-5" />
      </Button>

      <div className="relative hidden w-64 md:block">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pencarian global..."
          className="h-9 pl-8"
        />
        {matches.length > 0 && (
          <div className="absolute top-11 left-0 z-50 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
            {matches.map((m) => (
              <Link
                key={m.to}
                to={m.to}
                onClick={() => setSearch("")}
                className="block px-3 py-2 text-sm hover:bg-accent"
              >
                {m.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      <Select
        value={filter.plantId ?? "all"}
        onValueChange={(v) => setFilter({ plantId: v === "all" ? null : v })}
      >
        <SelectTrigger className="hidden h-9 w-40 lg:flex">
          <SelectValue placeholder="Plant" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Plant</SelectItem>
          {(plants as Array<{ id: string; name: string }>).map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filter.shiftId ?? "all"}
        onValueChange={(v) => setFilter({ shiftId: v === "all" ? null : v })}
      >
        <SelectTrigger className="hidden h-9 w-36 lg:flex">
          <SelectValue placeholder="Shift" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Shift</SelectItem>
          {(shifts as Array<{ id: string; name: string }>).map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="ml-auto flex items-center gap-1">
        <Badge variant="outline" className="hidden gap-1.5 border-success/40 text-success sm:flex">
          <Radio className="size-3 animate-pulse" /> Live
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="size-4" />
              {unread > 0 && (
                <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                  {unread}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              Notifikasi
              <Button variant="ghost" size="sm" onClick={markAllRead}>
                <Check className="size-3" /> Tandai dibaca
              </Button>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">Belum ada notifikasi.</p>
            ) : (
              (notifications as Array<Record<string, string | boolean>>).slice(0, 8).map((n) => (
                <DropdownMenuItem key={n.id as string} className="flex-col items-start gap-0.5">
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{n.title as string}</span>
                    <StatusBadge
                      status={n.severity === "danger" ? "Kritis" : "Normal"}
                      tone={n.severity === "danger" ? "danger" : "info"}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{n.body as string}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDateTime(n.created_at as string)}
                  </span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              {mode === "light" ? (
                <Sun className="size-4" />
              ) : mode === "dark" ? (
                <Moon className="size-4" />
              ) : (
                <Monitor className="size-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setMode("light")}>
              <Sun className="size-4" /> Light mode
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setMode("dark")}>
              <Moon className="size-4" /> Dark mode
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setMode("system")}>
              <Monitor className="size-4" /> System mode
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 px-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/15 text-primary">
                <User className="size-3.5" />
              </span>
              <span className="hidden text-left leading-tight sm:block">
                <span className="block text-xs font-medium">{profile?.full_name ?? "-"}</span>
                <span className="block text-[10px] text-muted-foreground">{roleName}</span>
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="text-sm">{profile?.full_name}</p>
              <p className="text-xs font-normal text-muted-foreground">@{profile?.username}</p>
              <p className="text-xs font-normal text-muted-foreground">{roleName}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="size-4" /> Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
