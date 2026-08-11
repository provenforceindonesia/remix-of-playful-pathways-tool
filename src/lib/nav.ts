import type { RoleCode } from "./auth";

export type NavItem = {
  label: string;
  to: string;
  icon: string;
  roles: RoleCode[];
  search?: Record<string, string>;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  // =========================================================
  // DASHBOARD
  // =========================================================
  {
    label: "Dashboard",
    items: [
      {
        label: "Dashboard Manajemen",
        to: "/dashboard/manajemen",
        icon: "LayoutDashboard",
        roles: ["OWNER", "SYSADMIN"],
      },
      {
        label: "Dashboard Operasional",
        to: "/dashboard/operasional",
        icon: "Activity",
        roles: ["PPIC", "IE", "SHOPFLOOR", "SYSADMIN", "OWNER"],
      },
      {
        label: "Dashboard Order",
        to: "/dashboard/order",
        icon: "ClipboardList",
        roles: ["SALES", "SYSADMIN", "OWNER"],
      },
      {
        label: "Inventory Dashboard",
        to: "/inventory/dashboard",
        icon: "Boxes",
        roles: ["INVENTORY", "SYSADMIN", "OWNER"],
      },
      {
        label: "Dashboard Cost Management",
        to: "/costing/dashboard",
        icon: "Wallet",
        roles: ["FINANCE", "SYSADMIN", "OWNER"],
      },
    ],
  },

  // =========================================================
  // CUSTOMER ORDER
  // =========================================================
  {
    label: "Customer Order",
    items: [
      {
        label: "Customer Order",
        to: "/sales/orders",
        icon: "FileText",
        roles: ["SALES", "SYSADMIN"],
      },
      {
        label: "Review Sales Order",
        to: "/sales/review",
        icon: "ShieldCheck",
        roles: ["PPIC", "SYSADMIN", "OWNER"],
      },
      {
        label: "Order Tracking",
        to: "/sales/tracking",
        icon: "Radar",
        roles: ["OWNER", "SALES", "PPIC", "SYSADMIN"],
      },
      {
        label: "Master Customer",
        to: "/sales/customers",
        icon: "Building2",
        roles: ["SALES", "SYSADMIN"],
      },
    ],
  },

  // =========================================================
  // PRODUKSI
  // =========================================================
  {
    label: "Produksi",
    items: [
      {
        label: "Production Plan",
        to: "/production/plans",
        icon: "CalendarRange",
        roles: ["PPIC", "SYSADMIN"],
      },
      {
        label: "Work Orders",
        to: "/production/work-orders",
        icon: "Factory",
        roles: ["PPIC", "SYSADMIN", "OWNER"],
      },
      {
        label: "WO Saya",
        to: "/shopfloor/wo",
        icon: "HardHat",
        roles: ["SHOPFLOOR"],
      },
      {
        label: "Input Produksi Harian",
        to: "/shopfloor/input-produksi",
        icon: "PencilLine",
        roles: ["SHOPFLOOR"],
      },
      {
        label: "Input Downtime",
        to: "/shopfloor/downtime",
        icon: "TimerOff",
        roles: ["SHOPFLOOR"],
      },
      {
        label: "Validasi Hasil Produksi",
        to: "/production/validasi",
        icon: "BadgeCheck",
        roles: ["PPIC", "SYSADMIN"],
      },
      {
        label: "Backlog & Recovery",
        to: "/production/backlog",
        icon: "Repeat2",
        roles: ["PPIC", "SYSADMIN", "OWNER"],
      },
      {
        label: "Handover Shift",
        to: "/production/handover",
        icon: "ArrowLeftRight",
        roles: ["PPIC", "SHOPFLOOR", "SYSADMIN"],
      },
    ],
  },

  // =========================================================
  // PERFORMANCE
  // =========================================================
  {
    label: "Performance",
    items: [
      {
        label: "Kecepatan & Hasil",
        to: "/analytics/speed",
        icon: "Gauge",
        roles: ["PPIC", "IE", "SYSADMIN", "OWNER"],
      },
      {
        label: "Waste & Quality",
        to: "/analytics/quality",
        icon: "Sparkles",
        roles: ["PPIC", "IE", "SYSADMIN", "OWNER"],
      },
      {
        label: "Downtime",
        to: "/analytics/downtime",
        icon: "AlertTriangle",
        roles: ["PPIC", "IE", "SYSADMIN", "OWNER"],
      },
      {
        label: "OEE",
        to: "/analytics/oee",
        icon: "TrendingUp",
        roles: ["PPIC", "IE", "SYSADMIN", "OWNER"],
      },
      {
        label: "Bottleneck Analysis",
        to: "/analytics/bottleneck",
        icon: "Split",
        roles: ["PPIC", "IE", "SYSADMIN", "OWNER"],
      },
      {
        label: "Status Mesin",
        to: "/analytics/mesin",
        icon: "Cpu",
        roles: ["PPIC", "IE", "INVENTORY", "SYSADMIN", "OWNER"],
      },
    ],
  },

  // =========================================================
  // MASTER DATA
  // =========================================================
  {
    label: "Master Data",
    items: [
      {
        label: "Produk & Varian",
        to: "/master/products",
        icon: "Package",
        roles: ["OWNER", "SALES", "SHOPFLOOR", "INVENTORY", "FINANCE", "SYSADMIN"],
      },
      {
        label: "Line Produksi",
        to: "/admin/configuration",
        icon: "GitBranch",
        roles: ["IE", "SYSADMIN"],
        search: { tab: "lines" },
      },
      {
        label: "Work Center",
        to: "/admin/configuration",
        icon: "Boxes",
        roles: ["IE", "SYSADMIN"],
        search: { tab: "work_centers" },
      },
      {
        label: "Mesin",
        to: "/admin/configuration",
        icon: "Cpu",
        roles: ["IE", "SYSADMIN"],
        search: { tab: "machines" },
      },
      {
        label: "Shift",
        to: "/admin/configuration",
        icon: "Clock",
        roles: ["IE", "SYSADMIN"],
        search: { tab: "shifts" },
      },
      {
        label: "Operator",
        to: "/admin/users",
        icon: "Users",
        roles: ["SYSADMIN"],
      },
      {
        label: "Reason Code",
        to: "/admin/configuration",
        icon: "ScrollText",
        roles: ["IE", "SYSADMIN"],
        search: { tab: "reasons" },
      },
    ],
  },


  // =========================================================
  // ENGINEERING
  // =========================================================
  {
    label: "Engineering",
    items: [
      {
        label: "BOM & Material",
        to: "/engineering/bom",
        icon: "Layers",
        roles: ["IE", "INVENTORY", "SYSADMIN"],
      },
      {
        label: "Routing & Standard",
        to: "/engineering/routing",
        icon: "Route",
        roles: ["IE", "SYSADMIN"],
      },
      {
        label: "Time Study",
        to: "/engineering/time-study",
        icon: "Timer",
        roles: ["IE", "SYSADMIN"],
      },
      {
        label: "Capacity & Manpower",
        to: "/engineering/capacity",
        icon: "Users",
        roles: ["IE", "SYSADMIN"],
      },
    ],
  },

  // =========================================================
  // INVENTORY & PROCUREMENT
  // =========================================================
  {
    label: "Inventory & Procurement",
    items: [
      {
        label: "Inventory & Stock",
        to: "/inventory/stock",
        icon: "Warehouse",
        roles: ["INVENTORY", "SYSADMIN", "OWNER"],
      },
      {
        label: "Stock Ledger",
        to: "/inventory/ledger",
        icon: "BookOpen",
        roles: ["INVENTORY", "SYSADMIN"],
      },
      {
        label: "Material Receipt",
        to: "/inventory/receipt",
        icon: "PackagePlus",
        roles: ["INVENTORY", "SYSADMIN"],
      },
      {
        label: "Material Issue",
        to: "/inventory/issue",
        icon: "PackageMinus",
        roles: ["INVENTORY", "SYSADMIN"],
      },
      {
        label: "Stock Reservation",
        to: "/inventory/reservation",
        icon: "Lock",
        roles: ["INVENTORY", "SYSADMIN"],
      },
      {
        label: "Purchase Order",
        to: "/procurement/po",
        icon: "ShoppingCart",
        roles: ["INVENTORY", "SYSADMIN"],
      },
      {
        label: "Supplier Management",
        to: "/procurement/suppliers",
        icon: "Truck",
        roles: ["INVENTORY", "SYSADMIN"],
      },
    ],
  },

  // =========================================================
  // FINANCE & COSTING
  // =========================================================
  {
    label: "Finance & Costing",
    items: [
      {
        label: "Master Biaya",
        to: "/costing/master",
        icon: "Coins",
        roles: ["FINANCE", "SYSADMIN"],
      },
      {
        label: "Standard HPP",
        to: "/costing/hpp",
        icon: "Receipt",
        roles: ["FINANCE", "SYSADMIN", "OWNER"],
      },
      {
        label: "Loss Valuation",
        to: "/costing/loss",
        icon: "TrendingDown",
        roles: ["FINANCE", "SYSADMIN", "OWNER"],
      },
      {
        label: "Margin Analysis",
        to: "/costing/margin",
        icon: "PieChart",
        roles: ["FINANCE", "SYSADMIN", "OWNER"],
      },
    ],
  },

  // =========================================================
  // ADMINISTRASI
  // =========================================================
  {
    label: "Administrasi",
    items: [
      {
        label: "System Overview",
        to: "/admin/overview",
        icon: "MonitorCog",
        roles: ["SYSADMIN"],
      },
      {
        label: "Users",
        to: "/admin/users",
        icon: "UserCog",
        roles: ["SYSADMIN"],
      },
      {
        label: "Roles & Permissions",
        to: "/admin/roles",
        icon: "KeyRound",
        roles: ["SYSADMIN"],
      },
      {
        label: "Master Configuration",
        to: "/admin/configuration",
        icon: "Settings2",
        roles: ["SYSADMIN"],
      },
      {
        label: "Audit Trail",
        to: "/admin/audit",
        icon: "ScrollText",
        roles: ["SYSADMIN", "OWNER"],
      },
      {
        label: "Status Koneksi",
        to: "/admin/connection-status",
        icon: "Radio",
        roles: ["SYSADMIN"],
      },
    ],
  },
];

const PPIC_ALLOWED_ROUTES = new Set([
  "/dashboard/operasional",
  "/sales/review",
  "/sales/tracking",
  "/production/plans",
  "/production/work-orders",
  "/production/validasi",
  "/production/backlog",
  "/production/handover",
  "/analytics/speed",
  "/analytics/quality",
  "/analytics/downtime",
  "/analytics/oee",
  "/analytics/bottleneck",
  "/analytics/mesin",
]);

export function navForRole(role: RoleCode | null): NavGroup[] {
  if (!role) return [];

  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => item.roles.includes(role) && (role !== "PPIC" || PPIC_ALLOWED_ROUTES.has(item.to)),
    ),
  })).filter((group) => group.items.length > 0);
}

export function defaultRouteForRole(role: RoleCode | null): string {
  switch (role) {
    case "OWNER":
      return "/dashboard/manajemen";

    case "SALES":
      return "/dashboard/order";

    case "PPIC":
      return "/dashboard/operasional";

    case "IE":
      return "/analytics/oee";

    case "SHOPFLOOR":
      return "/shopfloor/wo";

    case "INVENTORY":
      return "/inventory/dashboard";

    case "FINANCE":
      return "/costing/dashboard";

    case "SYSADMIN":
      return "/admin/overview";

    default:
      return "/dashboard/operasional";
  }
}
