import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CrudPage, type CrudField } from "@/components/common/CrudPage";
import type { Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { productionEntriesQuery, shiftsQuery, workOrdersQuery } from "@/lib/queries";
import { formatDate, formatNumber, toISODate } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/shopfloor/input-produksi")({
  head: () => ({
    meta: [
      {
        title: "Input Produksi Harian — MANUFACTUREIQ",
      },
      {
        name: "description",
        content: "Pencatatan output, reject, rework, dan downtime produksi per shift.",
      },
      {
        property: "og:title",
        content: "Input Produksi Harian — MANUFACTUREIQ",
      },
      {
        property: "og:description",
        content: "Form input hasil produksi harian operator.",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        name: "twitter:card",
        content: "summary",
      },
    ],
  }),
  component: InputProduksiPage,
});

type Row = Record<string, unknown>;

function toNumber(value: unknown): number {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function InputProduksiPage() {
  const { role, profile } = useAuth();

  const { data, isLoading } = useQuery(productionEntriesQuery);

  const { data: wos, isLoading: isLoadingWos } = useQuery(workOrdersQuery);

  const { data: shifts, isLoading: isLoadingShifts } = useQuery(shiftsQuery);

  const rows = (data ?? []) as Row[];
  const workOrders = (wos ?? []) as Row[];
  const shiftRows = (shifts ?? []) as Row[];

  const canWrite = ["SHOPFLOOR", "PPIC", "SYSADMIN"].includes(role ?? "");

  const workOrderOptions = workOrders.map((wo) => {
    const product = wo.products as {
      name?: string;
    } | null;

    const uom = wo.units_of_measure as {
      code?: string;
    } | null;

    const target = toNumber(wo.target_qty);

    const labelParts = [
      String(wo.wo_number ?? "WO"),
      product?.name,
      target > 0 ? `Target ${formatNumber(target)} ${uom?.code ?? ""}` : null,
    ].filter(Boolean);

    return {
      value: String(wo.id ?? ""),
      label: labelParts.join(" — "),
    };
  });

  const shiftOptions = shiftRows.map((shift) => ({
    value: String(shift.id ?? ""),
    label: String(shift.name ?? "-"),
  }));

  const columns: Column<Row>[] = [
    {
      key: "production_date",
      header: "Tanggal",
      render: (row) => formatDate(row.production_date as string),
    },
    {
      key: "wo",
      header: "Work Order",
      value: (row) =>
        (
          row.work_orders as {
            wo_number?: string;
          } | null
        )?.wo_number ?? "-",
    },
    {
      key: "shift",
      header: "Shift",
      value: (row) =>
        (
          row.shifts as {
            name?: string;
          } | null
        )?.name ?? "-",
    },
    {
      key: "total_output",
      header: "Total Output",
      align: "right",
      render: (row) => formatNumber(toNumber(row.total_output)),
    },
    {
      key: "good_output",
      header: "Good",
      align: "right",
      render: (row) => formatNumber(toNumber(row.good_output)),
    },
    {
      key: "reject_qty",
      header: "Reject",
      align: "right",
      render: (row) => formatNumber(toNumber(row.reject_qty)),
    },
    {
      key: "rework_qty",
      header: "Rework",
      align: "right",
      render: (row) => formatNumber(toNumber(row.rework_qty)),
    },
    {
      key: "downtime_minutes",
      header: "Downtime (mnt)",
      align: "right",
      render: (row) => formatNumber(toNumber(row.downtime_minutes)),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={String(row.status ?? "-")} />,
    },
  ];

  const fields: CrudField[] = [
    {
      name: "work_order_id",
      label: "Work Order",
      type: "select",
      required: true,
      placeholder: isLoadingWos ? "Memuat Work Order..." : "Pilih Work Order",
      options: workOrderOptions,
    },
    {
      name: "shift_id",
      label: "Shift",
      type: "select",
      required: true,
      placeholder: isLoadingShifts ? "Memuat shift..." : "Pilih shift",
      options: shiftOptions,
    },
    {
      name: "production_date",
      label: "Tanggal Produksi",
      type: "date",
      required: true,
      defaultValue: toISODate(new Date()),
    },
    {
      name: "start_time",
      label: "Jam Mulai",
      type: "time",
      required: true,
      defaultValue: "07:00",
    },
    {
      name: "end_time",
      label: "Jam Selesai",
      type: "time",
      required: true,
      defaultValue: "15:00",
    },
    {
      name: "break_minutes",
      label: "Istirahat (menit)",
      type: "number",
      defaultValue: 60,
    },
    {
      name: "total_output",
      label: "Total Output",
      type: "number",
      required: true,
      readOnly: true,
      defaultValue: 0,
      placeholder: "Dihitung otomatis",
    },
    {
      name: "good_output",
      label: "Good Output",
      type: "number",
      required: true,
      defaultValue: 0,
    },
    {
      name: "reject_qty",
      label: "Reject",
      type: "number",
      defaultValue: 0,
    },
    {
      name: "rework_qty",
      label: "Rework",
      type: "number",
      defaultValue: 0,
    },
    {
      name: "waste_material",
      label: "Waste Material",
      type: "number",
      defaultValue: 0,
    },
    {
      name: "downtime_minutes",
      label: "Total Downtime (menit)",
      type: "number",
      defaultValue: 0,
    },
    {
      name: "downtime_frequency",
      label: "Frekuensi Downtime",
      type: "number",
      defaultValue: 0,
    },
    {
      name: "reason_code",
      label: "Reason Code Utama",
      placeholder: "Isi jika terjadi downtime",
    },
    {
      name: "notes",
      label: "Catatan",
      type: "textarea",
      full: true,
    },
    {
      name: "handover_note",
      label: "Catatan Handover",
      type: "textarea",
      full: true,
    },
  ];

  return (
    <CrudPage<Row>
      title="Input Produksi Harian"
      description="Catat hasil produksi setiap shift. Data akan divalidasi Production Control."
      table="production_entries"
      invalidateKeys={[["production_entries"], ["v_production_kpi"], ["work_orders"], ["sales_orders"]]}
      columns={columns}
      rows={rows}
      loading={isLoading}
      fields={fields}
      canWrite={canWrite}
      canDelete={canWrite}
      softDelete
      exportName="input-produksi"
      onFieldChange={(name, value, currentValues) => {
        const nextValues = {
          ...currentValues,
          [name]: value,
        };

        if (name === "good_output" || name === "reject_qty" || name === "rework_qty") {
          return {
            total_output:
              toNumber(nextValues.good_output) + toNumber(nextValues.reject_qty) + toNumber(nextValues.rework_qty),
          };
        }

        if (name === "work_order_id") {
          const selectedWorkOrder = workOrders.find((wo) => String(wo.id) === String(value));

          if (selectedWorkOrder) {
            return {
              shift_id: selectedWorkOrder.shift_id ?? currentValues.shift_id ?? "",
            };
          }
        }

        return {};
      }}
      beforePayload={(values) => {
        const workOrderId = String(values.work_order_id ?? "").trim();

        const shiftId = String(values.shift_id ?? "").trim();

        if (!workOrderId) {
          throw new Error("Work Order wajib dipilih.");
        }

        if (!shiftId) {
          throw new Error("Shift wajib dipilih.");
        }

        const workOrderExists = workOrders.some((wo) => String(wo.id) === workOrderId);

        if (!workOrderExists) {
          throw new Error("Work Order yang dipilih tidak valid. Silakan pilih ulang.");
        }

        const goodOutput = toNumber(values.good_output);

        const rejectQty = toNumber(values.reject_qty);

        const reworkQty = toNumber(values.rework_qty);

        const totalOutput = goodOutput + rejectQty + reworkQty;

        if (goodOutput < 0 || rejectQty < 0 || reworkQty < 0) {
          throw new Error("Good Output, Reject, dan Rework tidak boleh negatif.");
        }

        if (totalOutput <= 0) {
          throw new Error("Total Output harus lebih dari 0.");
        }

        if (!values.start_time || !values.end_time) {
          throw new Error("Jam mulai dan jam selesai wajib diisi.");
        }

        return {
          ...values,
          work_order_id: workOrderId,
          shift_id: shiftId,
          total_output: totalOutput,
          good_output: goodOutput,
          reject_qty: rejectQty,
          rework_qty: reworkQty,
          break_minutes: toNumber(values.break_minutes),
          waste_material: toNumber(values.waste_material),
          downtime_minutes: toNumber(values.downtime_minutes),
          downtime_frequency: toNumber(values.downtime_frequency),
          created_by: profile?.id ?? null,
          created_role: role ?? null,
          status: "Menunggu Validasi Production Control",
        };
      }}
    />
  );
}
