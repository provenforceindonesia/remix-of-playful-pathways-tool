import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getConnectionStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;
    const userId = context.userId;

    // Auth status: can we resolve the current user?
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const authActive = !userError && !!userData?.user;

    // Database status: simple round-trip query
    const { data: pingData, error: pingError } = await supabase
      .from("system_settings")
      .select("id")
      .limit(1);
    const databaseActive = !pingError && pingData !== null;

    // Backend status via SECURITY DEFINER function (table count + realtime)
    const { data: backendStatus, error: backendError } = await supabase
      .rpc("get_backend_status")
      .single();
    const tableCount =
      backendError || !backendStatus ? 0 : (backendStatus.table_count as number);
    const realtimeActive =
      backendError || !backendStatus
        ? false
        : (backendStatus.realtime_active as boolean);

    return {
      auth: {
        active: authActive,
        userId: userId ?? null,
        email: userData?.user?.email ?? null,
      },
      database: {
        active: databaseActive,
        error: pingError?.message ?? null,
      },
      realtime: {
        active: realtimeActive,
      },
      tables: {
        count: tableCount,
        error: backendError?.message ?? null,
      },
      checkedAt: new Date().toISOString(),
    };
  });

