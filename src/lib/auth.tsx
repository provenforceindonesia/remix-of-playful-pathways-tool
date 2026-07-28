import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export type RoleCode =
  | "OWNER"
  | "SALES"
  | "PPIC"
  | "IE"
  | "SHOPFLOOR"
  | "INVENTORY"
  | "FINANCE"
  | "SYSADMIN";

export type Profile = {
  id: string;
  username: string;
  full_name: string;
  email: string;
  employee_code: string | null;
  role_id: string | null;
  plant_id: string | null;
  line_id: string | null;
  shift_id: string | null;
  is_active: boolean;
  avatar_url: string | null;
  theme_preference: string;
  roles?: { code: RoleCode; name: string; is_readonly: boolean } | null;
};

type AuthCtx = {
  session: Session | null;
  profile: Profile | null;
  role: RoleCode | null;
  roleName: string;
  loading: boolean;
  permissions: string[];
  can: (permission: string) => boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null);
      setPermissions([]);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("*, roles:role_id(code,name,is_readonly)")
      .eq("id", userId)
      .maybeSingle();
    setProfile((data as unknown as Profile) ?? null);

    if (data?.role_id) {
      const { data: perms } = await supabase
        .from("role_permissions")
        .select("permissions:permission_id(code)")
        .eq("role_id", data.role_id);
      setPermissions(
        ((perms ?? []) as Array<{ permissions: { code: string } | null }>)
          .map((p) => p.permissions?.code)
          .filter(Boolean) as string[],
      );
    } else {
      setPermissions([]);
    }
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setTimeout(() => {
        void loadProfile(next?.user?.id).finally(() => setLoading(false));
      }, 0);
    });

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      void loadProfile(data.session?.user?.id).finally(() => setLoading(false));
    });

    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const value = useMemo<AuthCtx>(() => {
    const role = (profile?.roles?.code ?? null) as RoleCode | null;
    return {
      session,
      profile,
      role,
      roleName: profile?.roles?.name ?? "-",
      loading,
      permissions,
      can: (permission: string) => permissions.includes(permission),
      refresh: async () => loadProfile(session?.user?.id),
      signOut: async () => {
        await supabase.auth.signOut();
        setProfile(null);
        setPermissions([]);
      },
    };
  }, [session, profile, loading, permissions, loadProfile]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return ctx;
}
