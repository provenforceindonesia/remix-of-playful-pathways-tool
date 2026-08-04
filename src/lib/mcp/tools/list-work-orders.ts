import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_work_orders",
  title: "List work orders",
  description:
    "List production work orders visible to the signed-in user, newest first. Optionally filter by status or WO number.",
  inputSchema: {
    status: z.string().optional().describe("Filter by work order status, e.g. RELEASED, CLOSED."),
    search: z.string().optional().describe("Match part of the WO number."),
    limit: z.number().int().min(1).max(100).default(20).describe("Max rows to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, search, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let query = supabaseForUser(ctx)
      .from("work_orders")
      .select(
        "id,wo_number,status,priority,target_qty,planned_start,planned_finish,standard_cycle_time_sec,products:product_id(code,name),machines:machine_id(code,name)",
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (status) query = query.eq("status", status);
    if (search) query = query.ilike("wo_number", `%${search}%`);
    const { data, error } = await query;
    return error
      ? { content: [{ type: "text", text: error.message }], isError: true }
      : {
          content: [{ type: "text", text: JSON.stringify(data ?? []) }],
          structuredContent: { workOrders: data ?? [] },
        };
  },
});
