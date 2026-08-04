import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_sales_orders",
  title: "List sales orders",
  description:
    "List sales orders (customer orders) visible to the signed-in user, newest first. Optionally filter by status or SO number.",
  inputSchema: {
    status: z
      .string()
      .optional()
      .describe("Filter by SO status, e.g. DRAFT, WAITING_REVIEW, CONFIRMED, CANCELLED."),
    search: z.string().optional().describe("Match part of the SO number."),
    limit: z.number().int().min(1).max(100).default(20).describe("Max rows to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, search, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let query = supabaseForUser(ctx)
      .from("sales_orders")
      .select(
        "id,so_number,status,priority,order_date,required_date,confirmed_delivery_date,progress_pct,customer_po_ref,customers:customer_id(name)",
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (status) query = query.eq("status", status);
    if (search) query = query.ilike("so_number", `%${search}%`);
    const { data, error } = await query;
    return error
      ? { content: [{ type: "text", text: error.message }], isError: true }
      : {
          content: [{ type: "text", text: JSON.stringify(data ?? []) }],
          structuredContent: { orders: data ?? [] },
        };
  },
});
