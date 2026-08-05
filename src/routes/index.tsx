import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { defaultRouteForRole } from "@/lib/nav";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "MANUFACTUREIQ — Manufacturing Performance Control" },
      {
        name: "description",
        content:
          "Sistem kontrol performa manufaktur: order, produksi, downtime, inventory, dan costing real-time.",
      },
      { property: "og:title", content: "MANUFACTUREIQ — Manufacturing Performance Control" },
      {
        property: "og:description",
        content: "Sistem kontrol performa manufaktur: order, produksi, downtime, inventory, dan costing real-time.",
      },
    ],
  }),
  component: IndexRedirect,
});

function IndexRedirect() {
  const { loading, session, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!session) void navigate({ to: "/auth", search: {}, replace: true });
    else if (role) void navigate({ to: defaultRouteForRole(role), replace: true });
  }, [loading, session, role, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="size-6 animate-spin text-primary" />
    </div>
  );
}
