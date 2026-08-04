import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "production_summary",
  title: "Production summary",
  description:
    "Summarise daily production entries (target, output, good output, downtime, achievement) over a date range.",
  inputSchema: {
    from: z.string().describe("Start production date, YYYY-MM-DD."),
    to: z.string().describe("End production date, YYYY-MM-DD (inclusive)."),
    limit: z.number().int().min(1).max(200).default(100).describe("Max entries to scan."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, to, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await supabaseForUser(ctx)
      .from("production_entries")
      .select(
        "id,production_date,daily_target_qty,total_output,good_output,reject_qty,downtime_minutes,net_production_minutes,actual_cycle_time_seconds,status,work_orders:work_order_id(wo_number)",
      )
      .is("deleted_at", null)
      .gte("production_date", from)
      .lte("production_date", to)
      .order("production_date", { ascending: false })
      .limit(limit ?? 100);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
    const sum = (key: string) => rows.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
    const totals = {
      entries: rows.length,
      target: sum("daily_target_qty"),
      output: sum("total_output"),
      goodOutput: sum("good_output"),
      reject: sum("reject_qty"),
      downtimeMinutes: sum("downtime_minutes"),
    };
    const achievementPct = totals.target > 0 ? (totals.goodOutput / totals.target) * 100 : null;
    const summary = { ...totals, achievementPct };

    return {
      content: [{ type: "text", text: JSON.stringify({ summary, entries: rows }) }],
      structuredContent: { summary, entries: rows },
    };
  },
});
