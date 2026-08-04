import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "inventory_stock",
  title: "Inventory stock balances",
  description:
    "List material stock balances (on hand and reserved) per warehouse for the signed-in user.",
  inputSchema: {
    limit: z.number().int().min(1).max(200).default(50).describe("Max rows to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await supabaseForUser(ctx)
      .from("stock_balances")
      .select("id,qty_on_hand,qty_reserved,updated_at,materials:material_id(code,name),warehouses:warehouse_id(code,name)")
      .order("updated_at", { ascending: false })
      .limit(limit ?? 50);
    return error
      ? { content: [{ type: "text", text: error.message }], isError: true }
      : {
          content: [{ type: "text", text: JSON.stringify(data ?? []) }],
          structuredContent: { balances: data ?? [] },
        };
  },
});
