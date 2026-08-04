import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Factory, Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { defaultRouteForRole } from "@/lib/nav";
import { seedDemoData } from "@/lib/seed.functions";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" && s.next.startsWith("/") && !s.next.startsWith("//")
      ? s.next
      : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Masuk — MANUFACTUREIQ" },
      {
        name: "description",
        content: "Masuk ke MANUFACTUREIQ untuk mengelola produksi, order, inventory, dan biaya.",
      },
      { property: "og:title", content: "Masuk — MANUFACTUREIQ" },
      {
        property: "og:description",
        content: "Portal kontrol performa manufaktur untuk seluruh peran operasional.",
      },
    ],
  }),
  component: AuthPage,
});

const DEMO = [
  { label: "Owner / Direktur", user: "owner", pass: "OwnerDemo123!" },
  { label: "Sales Admin", user: "salesadmin", pass: "SalesDemo123!" },
  { label: "Production Control", user: "productioncontrol", pass: "ProductionDemo123!" },
  { label: "Industrial Engineer", user: "engineer", pass: "EngineerDemo123!" },
  { label: "Production Team", user: "productionteam", pass: "ShopfloorDemo123!" },
  { label: "Inventory", user: "inventory", pass: "InventoryDemo123!" },
  { label: "Finance", user: "finance", pass: "FinanceDemo123!" },
  { label: "System Admin", user: "sysadmin", pass: "AdminDemo123!" },
];

function AuthPage() {
  const navigate = useNavigate();
  const { session, role, loading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session && role) {
      void navigate({ to: defaultRouteForRole(role), replace: true });
    }
  }, [loading, session, role, navigate]);

  const signIn = async (u: string, p: string) => {
    setBusy(true);
    try {
      await seedDemoData();
      const email = u.includes("@") ? u : `${u}@manufactureiq.demo`;
      const { error } = await supabase.auth.signInWithPassword({ email, password: p });
      if (error) {
        toast.error("Login gagal", { description: "Username atau password tidak sesuai." });
        return;
      }
      toast.success("Berhasil masuk");
    } catch {
      toast.error("Terjadi kesalahan saat masuk");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary/10 p-12 lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,var(--color-primary)/25%,transparent_55%)]" />
        <div className="relative flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Factory className="size-6" />
          </span>
          <div>
            <p className="text-lg font-bold tracking-tight">MANUFACTUREIQ</p>
            <p className="text-xs text-muted-foreground">Manufacturing Performance Control</p>
          </div>
        </div>
        <div className="relative space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-balance">
            Kendalikan performa pabrik dari satu layar.
          </h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Order to delivery, work order, produktivitas, downtime, inventory, hingga HPP dan
            estimasi laba — terhubung real-time dalam satu alur kerja.
          </p>
          <div className="grid max-w-md grid-cols-3 gap-3 pt-4">
            {[
              ["OEE", "Availability × Performance × Quality"],
              ["Backlog", "Kekurangan order otomatis"],
              ["HPP", "Costing & loss valuation"],
            ].map(([t, d]) => (
              <div key={t} className="rounded-lg border border-border bg-surface/60 p-3">
                <p className="text-sm font-semibold">{t}</p>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-muted-foreground">
          © {new Date().getFullYear()} MANUFACTUREIQ
        </p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Factory className="size-5" />
              </span>
              <div>
                <p className="font-bold tracking-tight">MANUFACTUREIQ</p>
                <p className="text-xs text-muted-foreground">Manufacturing Performance Control</p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Masuk ke akun Anda</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Gunakan username internal dan kata sandi yang diberikan admin.
            </p>
          </div>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void signIn(username.trim(), password);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="mis. productioncontrol"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Kata sandi</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
              Masuk
            </Button>
          </form>

          <Card>
            <CardContent className="space-y-3 pt-6">
              <p className="text-sm font-medium">Akun demo</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {DEMO.map((d) => (
                  <Button
                    key={d.user}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    className="justify-start"
                    onClick={() => {
                      setUsername(d.user);
                      setPassword(d.pass);
                      void signIn(d.user, d.pass);
                    }}
                  >
                    {d.label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Klik salah satu peran untuk masuk langsung dengan data demo.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
