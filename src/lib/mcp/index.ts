import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listSalesOrders from "./tools/list-sales-orders";
import listWorkOrders from "./tools/list-work-orders";
import productionSummary from "./tools/production-summary";
import inventoryStock from "./tools/inventory-stock";
import machineStatus from "./tools/machine-status";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "playful-pathways-tool",
  title: "playful-pathways-tool",
  version: "0.1.0",
  instructions:
    "Read-only tools for MANUFACTUREIQ manufacturing performance control. Query sales orders, work orders, daily production performance, inventory stock balances, and machine status as the signed-in user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listSalesOrders, listWorkOrders, productionSummary, inventoryStock, machineStatus],
});
