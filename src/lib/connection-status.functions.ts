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

    // Count public tables
    const { data: tablesData, error: tablesError } = await supabase.rpc(
      "count_public_tables",
    );
    const tableCount = tablesError || !tablesData ? 0 : Number(tablesData);

    // Realtime status: check whether the realtime publication is active
    const { data: realtimeData, error: realtimeError } = await supabase
      .schema("pg_catalog")
      .from("pg_publication")
      .select("pubname")
      .eq("pubname", "supabase_realtime")
      .limit(1);
    const realtimeActive = !realtimeError && (realtimeData?.length ?? 0) > 0;

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
        error: tablesError?.message ?? null,
      },
      checkedAt: new Date().toISOString(),
    };
  });
