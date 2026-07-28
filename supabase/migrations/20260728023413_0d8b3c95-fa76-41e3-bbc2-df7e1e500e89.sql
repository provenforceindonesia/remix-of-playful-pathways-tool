
-- ===================== MASTER =====================
CREATE TABLE public.units_of_measure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE, name text NOT NULL, category text NOT NULL DEFAULT 'count',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.uom_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_uom_id uuid NOT NULL REFERENCES public.units_of_measure(id) ON DELETE CASCADE,
  to_uom_id uuid NOT NULL REFERENCES public.units_of_measure(id) ON DELETE CASCADE,
  factor numeric(18,6) NOT NULL CHECK (factor > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_uom_id, to_uom_id)
);

CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE, name text NOT NULL,
  contact_person text, phone text, email text, address text,
  payment_term_days int NOT NULL DEFAULT 30,
  is_active boolean NOT NULL DEFAULT true,
  plant_id uuid REFERENCES public.plants(id),
  created_by uuid, updated_by uuid, deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE, name text NOT NULL, category text,
  base_uom_id uuid REFERENCES public.units_of_measure(id),
  standard_selling_value numeric(18,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  code text NOT NULL, name text NOT NULL, spec jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, code)
);

CREATE TABLE public.work_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid NOT NULL REFERENCES public.plants(id),
  code text NOT NULL, name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plant_id, code)
);

CREATE TABLE public.machines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid NOT NULL REFERENCES public.plants(id),
  line_id uuid REFERENCES public.lines(id),
  work_center_id uuid REFERENCES public.work_centers(id),
  code text NOT NULL UNIQUE, name text NOT NULL,
  machine_type text, manufacturer text,
  standard_speed numeric(18,4) NOT NULL DEFAULT 0,
  master_status text NOT NULL DEFAULT 'Active' CHECK (master_status IN ('Active','Inactive','Under Maintenance','Breakdown','Retired')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.routings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE, name text NOT NULL,
  product_id uuid REFERENCES public.products(id),
  variant_id uuid REFERENCES public.product_variants(id),
  version int NOT NULL DEFAULT 1,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Draft','Review','Active','Obsolete')),
  created_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.routing_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  routing_id uuid NOT NULL REFERENCES public.routings(id) ON DELETE CASCADE,
  seq int NOT NULL, operation_name text NOT NULL,
  work_center_id uuid REFERENCES public.work_centers(id),
  machine_id uuid REFERENCES public.machines(id),
  standard_cycle_time_sec numeric(18,4) NOT NULL DEFAULT 0,
  setup_time_min numeric(18,2) NOT NULL DEFAULT 0,
  manpower int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (routing_id, seq)
);

CREATE TABLE public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE, name text NOT NULL, category text,
  uom_id uuid REFERENCES public.units_of_measure(id),
  min_stock numeric(18,4) NOT NULL DEFAULT 0,
  reorder_point numeric(18,4) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.bom_headers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id),
  variant_id uuid REFERENCES public.product_variants(id),
  output_basis numeric(18,4) NOT NULL DEFAULT 1,
  output_uom_id uuid REFERENCES public.units_of_measure(id),
  version int NOT NULL DEFAULT 1,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Review','Active','Obsolete')),
  created_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, variant_id, version)
);
CREATE TABLE public.bom_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bom_id uuid NOT NULL REFERENCES public.bom_headers(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials(id),
  standard_qty numeric(18,6) NOT NULL CHECK (standard_qty > 0),
  scrap_allowance_pct numeric(8,4) NOT NULL DEFAULT 0,
  uom_id uuid REFERENCES public.units_of_measure(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid NOT NULL REFERENCES public.plants(id),
  code text NOT NULL, name text NOT NULL, type text NOT NULL DEFAULT 'RAW',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plant_id, code)
);

CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE, name text NOT NULL,
  contact_person text, phone text, email text, address text,
  lead_time_days int NOT NULL DEFAULT 7, rating numeric(4,2),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

-- ===================== SALES ORDER =====================
CREATE SEQUENCE public.seq_sales_order;
CREATE SEQUENCE public.seq_production_plan;
CREATE SEQUENCE public.seq_work_order;
CREATE SEQUENCE public.seq_purchase_req;
CREATE SEQUENCE public.seq_purchase_order;

CREATE OR REPLACE FUNCTION public.next_doc_no(prefix text, seq regclass)
RETURNS text LANGUAGE plpgsql SET search_path = public AS $$
DECLARE n bigint;
BEGIN
  EXECUTE format('SELECT nextval(%L)', seq::text) INTO n;
  RETURN prefix || '-' || to_char(now(),'YYMM') || '-' || lpad(n::text, 4, '0');
END; $$;

CREATE TABLE public.sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  so_number text NOT NULL UNIQUE DEFAULT public.next_doc_no('SO','public.seq_sales_order'),
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  customer_po_ref text,
  plant_id uuid REFERENCES public.plants(id),
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  required_date date NOT NULL,
  confirmed_delivery_date date,
  priority text NOT NULL DEFAULT 'Normal' CHECK (priority IN ('Rendah','Normal','Tinggi','Urgent')),
  customer_note text, revision_note text,
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Menunggu Review Produksi','Perlu Revisi','Dikonfirmasi','Direncanakan','Dalam Produksi','Sebagian Terpenuhi','Selesai','Terlambat','Dibatalkan')),
  progress_pct numeric(6,2) NOT NULL DEFAULT 0,
  created_by uuid, updated_by uuid, approved_by uuid, approved_at timestamptz,
  submitted_at timestamptz, deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_so_status ON public.sales_orders(status);
CREATE INDEX idx_so_customer ON public.sales_orders(customer_id);

CREATE TABLE public.sales_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id uuid NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  variant_id uuid REFERENCES public.product_variants(id),
  quantity numeric(18,4) NOT NULL CHECK (quantity > 0),
  uom_id uuid REFERENCES public.units_of_measure(id),
  unit_price numeric(18,2) NOT NULL DEFAULT 0,
  fulfilled_qty numeric(18,4) NOT NULL DEFAULT 0,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.customer_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  sales_order_id uuid REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  file_name text NOT NULL, file_path text NOT NULL, doc_type text NOT NULL DEFAULT 'PO',
  uploaded_by uuid, created_at timestamptz NOT NULL DEFAULT now()
);

-- ===================== PLAN & WO =====================
CREATE TABLE public.production_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_number text NOT NULL UNIQUE DEFAULT public.next_doc_no('PP','public.seq_production_plan'),
  sales_order_id uuid REFERENCES public.sales_orders(id),
  plant_id uuid REFERENCES public.plants(id),
  line_id uuid REFERENCES public.lines(id),
  shift_id uuid REFERENCES public.shifts(id),
  production_date date NOT NULL DEFAULT CURRENT_DATE,
  material_readiness text NOT NULL DEFAULT 'Belum Dicek' CHECK (material_readiness IN ('Belum Dicek','Siap','Sebagian','Tidak Siap')),
  capacity_readiness text NOT NULL DEFAULT 'Belum Dicek' CHECK (capacity_readiness IN ('Belum Dicek','Siap','Sebagian','Tidak Siap')),
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Review','Released','Partially Scheduled','Fully Scheduled','Completed','Cancelled')),
  created_by uuid, released_by uuid, released_at timestamptz, deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.production_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.production_plans(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  variant_id uuid REFERENCES public.product_variants(id),
  demand_qty numeric(18,4) NOT NULL CHECK (demand_qty > 0),
  target_qty numeric(18,4) NOT NULL DEFAULT 0,
  uom_id uuid REFERENCES public.units_of_measure(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wo_number text NOT NULL UNIQUE DEFAULT public.next_doc_no('WO','public.seq_work_order'),
  plan_id uuid REFERENCES public.production_plans(id),
  sales_order_id uuid REFERENCES public.sales_orders(id),
  parent_wo_id uuid REFERENCES public.work_orders(id),
  wo_type text NOT NULL DEFAULT 'Reguler' CHECK (wo_type IN ('Reguler','Recovery','Rework','Trial')),
  plant_id uuid REFERENCES public.plants(id),
  line_id uuid REFERENCES public.lines(id),
  shift_id uuid REFERENCES public.shifts(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  variant_id uuid REFERENCES public.product_variants(id),
  routing_id uuid REFERENCES public.routings(id),
  machine_id uuid REFERENCES public.machines(id),
  work_center_id uuid REFERENCES public.work_centers(id),
  target_qty numeric(18,4) NOT NULL CHECK (target_qty > 0),
  uom_id uuid REFERENCES public.units_of_measure(id),
  planned_start timestamptz, planned_finish timestamptz,
  standard_speed numeric(18,4) NOT NULL DEFAULT 0,
  standard_cycle_time_sec numeric(18,4) NOT NULL DEFAULT 0,
  priority text NOT NULL DEFAULT 'Normal' CHECK (priority IN ('Rendah','Normal','Tinggi','Urgent')),
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Released','Scheduled','In Progress','Paused','Waiting Material','Waiting Maintenance','Completed','Closed','Cancelled')),
  created_by uuid, released_by uuid, released_at timestamptz, closed_at timestamptz, deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_wo_status ON public.work_orders(status);
CREATE INDEX idx_wo_machine ON public.work_orders(machine_id);
CREATE INDEX idx_wo_so ON public.work_orders(sales_order_id);

CREATE TABLE public.work_order_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_on_wo text NOT NULL DEFAULT 'Operator',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (work_order_id, profile_id)
);

CREATE OR REPLACE FUNCTION public.can_access_work_order(wo_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.current_user_role() IS DISTINCT FROM 'SHOPFLOOR'
      OR EXISTS (SELECT 1 FROM public.work_order_assignments a WHERE a.work_order_id = wo_id AND a.profile_id = auth.uid())
$$;

-- ===================== PRODUCTION ENTRY & DOWNTIME =====================
CREATE TABLE public.production_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  plant_id uuid REFERENCES public.plants(id),
  production_date date NOT NULL DEFAULT CURRENT_DATE,
  shift_id uuid REFERENCES public.shifts(id),
  start_time time NOT NULL, end_time time NOT NULL,
  break_minutes numeric(10,2) NOT NULL DEFAULT 0,
  total_output numeric(18,4) NOT NULL DEFAULT 0 CHECK (total_output >= 0),
  good_output numeric(18,4) NOT NULL DEFAULT 0 CHECK (good_output >= 0),
  reject_qty numeric(18,4) NOT NULL DEFAULT 0 CHECK (reject_qty >= 0),
  rework_qty numeric(18,4) NOT NULL DEFAULT 0 CHECK (rework_qty >= 0),
  waste_material numeric(18,4) NOT NULL DEFAULT 0 CHECK (waste_material >= 0),
  downtime_minutes numeric(10,2) NOT NULL DEFAULT 0,
  downtime_frequency int NOT NULL DEFAULT 0,
  reason_code text, notes text, handover_note text,
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Menunggu Validasi Production Control','Perlu Perbaikan','Tervalidasi','Dibatalkan')),
  created_by uuid, created_role text, validated_by uuid, validated_at timestamptz,
  revision_note text, deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_output_balance CHECK (total_output = good_output + reject_qty + rework_qty)
);
CREATE INDEX idx_pe_wo ON public.production_entries(work_order_id);
CREATE INDEX idx_pe_date ON public.production_entries(production_date);
CREATE INDEX idx_pe_status ON public.production_entries(status);

CREATE TABLE public.downtime_reason_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE, name text NOT NULL,
  category text NOT NULL CHECK (category IN ('Mesin','Material','Metode','Manusia','Eksternal','Planned')),
  requires_maintenance boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.downtime_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid REFERENCES public.work_orders(id) ON DELETE SET NULL,
  production_entry_id uuid REFERENCES public.production_entries(id) ON DELETE CASCADE,
  machine_id uuid REFERENCES public.machines(id),
  plant_id uuid REFERENCES public.plants(id),
  downtime_date date NOT NULL DEFAULT CURRENT_DATE,
  shift_id uuid REFERENCES public.shifts(id),
  operator_id uuid REFERENCES public.profiles(id),
  start_time time NOT NULL, end_time time NOT NULL,
  duration_minutes numeric(10,2) NOT NULL DEFAULT 0,
  reason_code_id uuid REFERENCES public.downtime_reason_codes(id),
  category text, cause text, temporary_action text,
  requires_maintenance boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'Dilaporkan' CHECK (status IN ('Dilaporkan','Dalam Pemeriksaan','Ditangani','Selesai','Berulang','Membutuhkan Perawatan')),
  created_by uuid, deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_dt_machine ON public.downtime_records(machine_id, downtime_date);

CREATE OR REPLACE FUNCTION public.calc_downtime_duration()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.duration_minutes := GREATEST(0, EXTRACT(EPOCH FROM (
    CASE WHEN NEW.end_time < NEW.start_time THEN NEW.end_time + interval '24 hour' ELSE NEW.end_time END - NEW.start_time)) / 60);
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_dt_duration BEFORE INSERT OR UPDATE ON public.downtime_records FOR EACH ROW EXECUTE FUNCTION public.calc_downtime_duration();

CREATE TABLE public.handovers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid REFERENCES public.plants(id),
  line_id uuid REFERENCES public.lines(id),
  from_shift_id uuid REFERENCES public.shifts(id),
  to_shift_id uuid REFERENCES public.shifts(id),
  handover_date date NOT NULL DEFAULT CURRENT_DATE,
  work_order_id uuid REFERENCES public.work_orders(id),
  summary text NOT NULL, pending_issues text, machine_condition text,
  created_by uuid, acknowledged_by uuid, acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.backlog_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  sales_order_id uuid REFERENCES public.sales_orders(id),
  product_id uuid REFERENCES public.products(id),
  plant_id uuid REFERENCES public.plants(id),
  target_qty numeric(18,4) NOT NULL DEFAULT 0,
  good_output numeric(18,4) NOT NULL DEFAULT 0,
  shortage_qty numeric(18,4) NOT NULL DEFAULT 0,
  recovered_qty numeric(18,4) NOT NULL DEFAULT 0,
  remaining_qty numeric(18,4) NOT NULL DEFAULT 0,
  cause text, owner_id uuid REFERENCES public.profiles(id), due_date date,
  status text NOT NULL DEFAULT 'Open' CHECK (status IN ('Open','Partially Recovered','Recovered','Closed','Cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.recovery_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backlog_id uuid NOT NULL REFERENCES public.backlog_ledger(id) ON DELETE CASCADE,
  recovery_wo_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  recovered_qty numeric(18,4) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (backlog_id, recovery_wo_id)
);

-- ===================== INVENTORY =====================
CREATE TABLE public.stock_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  qty_on_hand numeric(18,4) NOT NULL DEFAULT 0,
  qty_reserved numeric(18,4) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (material_id, warehouse_id)
);
CREATE TABLE public.stock_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES public.materials(id),
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id),
  txn_date timestamptz NOT NULL DEFAULT now(),
  txn_type text NOT NULL CHECK (txn_type IN ('RECEIPT','ISSUE','RETURN','ADJUSTMENT','OPNAME','CONSUMPTION')),
  ref_table text, ref_id uuid,
  qty_in numeric(18,4) NOT NULL DEFAULT 0,
  qty_out numeric(18,4) NOT NULL DEFAULT 0,
  balance_after numeric(18,4) NOT NULL DEFAULT 0,
  unit_cost numeric(18,4) NOT NULL DEFAULT 0,
  note text, created_by uuid, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.stock_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid REFERENCES public.work_orders(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials(id),
  warehouse_id uuid REFERENCES public.warehouses(id),
  qty numeric(18,4) NOT NULL CHECK (qty > 0),
  status text NOT NULL DEFAULT 'Reserved' CHECK (status IN ('Reserved','Issued','Released','Cancelled')),
  created_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.material_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_no text NOT NULL UNIQUE,
  supplier_id uuid REFERENCES public.suppliers(id),
  warehouse_id uuid REFERENCES public.warehouses(id),
  material_id uuid NOT NULL REFERENCES public.materials(id),
  qty numeric(18,4) NOT NULL CHECK (qty > 0),
  unit_cost numeric(18,4) NOT NULL DEFAULT 0,
  receipt_date date NOT NULL DEFAULT CURRENT_DATE,
  note text, created_by uuid, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.material_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_no text NOT NULL UNIQUE,
  work_order_id uuid REFERENCES public.work_orders(id),
  warehouse_id uuid REFERENCES public.warehouses(id),
  material_id uuid NOT NULL REFERENCES public.materials(id),
  qty numeric(18,4) NOT NULL CHECK (qty > 0),
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.material_consumptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_entry_id uuid REFERENCES public.production_entries(id) ON DELETE CASCADE,
  work_order_id uuid REFERENCES public.work_orders(id),
  material_id uuid NOT NULL REFERENCES public.materials(id),
  qty_consumed numeric(18,4) NOT NULL DEFAULT 0,
  qty_waste numeric(18,4) NOT NULL DEFAULT 0,
  created_by uuid, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.material_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_no text NOT NULL UNIQUE,
  work_order_id uuid REFERENCES public.work_orders(id),
  warehouse_id uuid REFERENCES public.warehouses(id),
  material_id uuid NOT NULL REFERENCES public.materials(id),
  qty numeric(18,4) NOT NULL CHECK (qty > 0),
  return_date date NOT NULL DEFAULT CURRENT_DATE,
  reason text, created_by uuid, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.stock_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adjustment_no text NOT NULL UNIQUE,
  warehouse_id uuid REFERENCES public.warehouses(id),
  material_id uuid NOT NULL REFERENCES public.materials(id),
  qty_delta numeric(18,4) NOT NULL,
  reason text NOT NULL,
  adjustment_date date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.stock_opnames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opname_no text NOT NULL UNIQUE,
  warehouse_id uuid REFERENCES public.warehouses(id),
  material_id uuid NOT NULL REFERENCES public.materials(id),
  system_qty numeric(18,4) NOT NULL DEFAULT 0,
  counted_qty numeric(18,4) NOT NULL DEFAULT 0,
  variance_qty numeric(18,4) GENERATED ALWAYS AS (counted_qty - system_qty) STORED,
  opname_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Submitted','Approved','Cancelled')),
  created_by uuid, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.purchase_requisitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_number text NOT NULL UNIQUE DEFAULT public.next_doc_no('PR','public.seq_purchase_req'),
  plant_id uuid REFERENCES public.plants(id),
  required_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Submitted','Approved','Rejected','Converted','Cancelled')),
  note text, created_by uuid, approved_by uuid, approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.purchase_requisition_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_id uuid NOT NULL REFERENCES public.purchase_requisitions(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials(id),
  qty numeric(18,4) NOT NULL CHECK (qty > 0),
  estimated_price numeric(18,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text NOT NULL UNIQUE DEFAULT public.next_doc_no('PO','public.seq_purchase_order'),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id),
  pr_id uuid REFERENCES public.purchase_requisitions(id),
  plant_id uuid REFERENCES public.plants(id),
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_date date,
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Submitted','Approved','Partially Received','Received','Cancelled')),
  total_amount numeric(18,2) NOT NULL DEFAULT 0,
  created_by uuid, approved_by uuid, approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials(id),
  qty numeric(18,4) NOT NULL CHECK (qty > 0),
  unit_price numeric(18,2) NOT NULL DEFAULT 0,
  received_qty numeric(18,4) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.supplier_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES public.suppliers(id),
  expected_date date, actual_date date,
  status text NOT NULL DEFAULT 'On Schedule' CHECK (status IN ('On Schedule','At Risk','Late','Delivered')),
  note text, created_at timestamptz NOT NULL DEFAULT now()
);

-- ===================== ENGINEERING =====================
CREATE TABLE public.time_studies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  study_date date NOT NULL DEFAULT CURRENT_DATE,
  product_id uuid REFERENCES public.products(id),
  variant_id uuid REFERENCES public.product_variants(id),
  process_name text NOT NULL,
  machine_id uuid REFERENCES public.machines(id),
  observer_id uuid REFERENCES public.profiles(id),
  shift_id uuid REFERENCES public.shifts(id),
  observed_output numeric(18,4) NOT NULL DEFAULT 0,
  observed_minutes numeric(18,4) NOT NULL DEFAULT 0,
  setup_time_min numeric(18,2) NOT NULL DEFAULT 0,
  idle_time_min numeric(18,2) NOT NULL DEFAULT 0,
  manpower int NOT NULL DEFAULT 1,
  actual_cycle_time_sec numeric(18,4) NOT NULL DEFAULT 0,
  notes text,
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Submitted','Validated','Rejected')),
  created_by uuid, validated_by uuid, validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.capacity_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid REFERENCES public.plants(id),
  line_id uuid REFERENCES public.lines(id),
  machine_id uuid REFERENCES public.machines(id),
  shift_id uuid REFERENCES public.shifts(id),
  plan_date date NOT NULL DEFAULT CURRENT_DATE,
  net_available_minutes numeric(18,2) NOT NULL DEFAULT 0,
  standard_cycle_time_sec numeric(18,4) NOT NULL DEFAULT 0,
  capacity_per_shift numeric(18,4) NOT NULL DEFAULT 0,
  created_by uuid, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.manpower_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid REFERENCES public.plants(id),
  line_id uuid REFERENCES public.lines(id),
  period_date date NOT NULL DEFAULT CURRENT_DATE,
  required_standard_minutes numeric(18,2) NOT NULL DEFAULT 0,
  net_available_minutes_per_person numeric(18,2) NOT NULL DEFAULT 0,
  recommended_manpower numeric(10,2) NOT NULL DEFAULT 0,
  current_manpower int NOT NULL DEFAULT 0,
  note text, created_by uuid, created_at timestamptz NOT NULL DEFAULT now()
);

-- ===================== COSTING =====================
CREATE TABLE public.material_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  unit_cost numeric(18,4) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'IDR',
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (material_id, effective_date)
);
CREATE TABLE public.machine_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  hour_rate numeric(18,2) NOT NULL DEFAULT 0,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (machine_id, effective_date)
);
CREATE TABLE public.labor_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid REFERENCES public.plants(id),
  role_label text NOT NULL DEFAULT 'Operator',
  hour_rate numeric(18,2) NOT NULL DEFAULT 0,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.overhead_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid REFERENCES public.plants(id),
  basis text NOT NULL DEFAULT 'machine_hour',
  rate numeric(18,2) NOT NULL DEFAULT 0,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.standard_hpp_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_code text NOT NULL UNIQUE,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Active','Obsolete')),
  note text, created_by uuid, activated_by uuid, activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.standard_hpp_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES public.standard_hpp_versions(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  variant_id uuid REFERENCES public.product_variants(id),
  material_cost numeric(18,2) NOT NULL DEFAULT 0,
  machine_cost numeric(18,2) NOT NULL DEFAULT 0,
  labor_cost numeric(18,2) NOT NULL DEFAULT 0,
  overhead_cost numeric(18,2) NOT NULL DEFAULT 0,
  hpp_per_unit numeric(18,2) GENERATED ALWAYS AS (material_cost + machine_cost + labor_cost + overhead_cost) STORED,
  rework_cost_per_unit numeric(18,2) NOT NULL DEFAULT 0,
  contribution_margin_per_unit numeric(18,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (version_id, product_id, variant_id)
);
CREATE TABLE public.actual_production_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  period_date date NOT NULL DEFAULT CURRENT_DATE,
  actual_material_cost numeric(18,2) NOT NULL DEFAULT 0,
  machine_cost numeric(18,2) NOT NULL DEFAULT 0,
  labor_cost numeric(18,2) NOT NULL DEFAULT 0,
  overhead_cost numeric(18,2) NOT NULL DEFAULT 0,
  rework_cost numeric(18,2) NOT NULL DEFAULT 0,
  total_cost numeric(18,2) GENERATED ALWAYS AS (actual_material_cost + machine_cost + labor_cost + overhead_cost + rework_cost) STORED,
  good_output numeric(18,4) NOT NULL DEFAULT 0,
  costing_version_id uuid REFERENCES public.standard_hpp_versions(id),
  created_by uuid, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.wip_valuations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid REFERENCES public.work_orders(id) ON DELETE CASCADE,
  valuation_date date NOT NULL DEFAULT CURRENT_DATE,
  material_cost_consumed numeric(18,2) NOT NULL DEFAULT 0,
  completion_pct numeric(6,2) NOT NULL DEFAULT 0,
  conversion_cost numeric(18,2) NOT NULL DEFAULT 0,
  wip_value numeric(18,2) NOT NULL DEFAULT 0,
  created_by uuid, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.loss_valuations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid REFERENCES public.work_orders(id) ON DELETE CASCADE,
  period_date date NOT NULL DEFAULT CURRENT_DATE,
  loss_type text NOT NULL CHECK (loss_type IN ('Reject','Rework','Downtime','Waste')),
  quantity numeric(18,4) NOT NULL DEFAULT 0,
  unit_value numeric(18,2) NOT NULL DEFAULT 0,
  loss_value numeric(18,2) NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'cost_based',
  costing_version_id uuid REFERENCES public.standard_hpp_versions(id),
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Validated','Rejected')),
  validated_by uuid, validated_at timestamptz,
  created_by uuid, created_at timestamptz NOT NULL DEFAULT now()
);

-- ===================== MAINTENANCE / NOTIF =====================
CREATE TABLE public.maintenance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  maintenance_type text NOT NULL DEFAULT 'Corrective',
  description text NOT NULL,
  repair_minutes numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Open' CHECK (status IN ('Open','In Progress','Done','Cancelled')),
  created_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.maintenance_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_log_id uuid NOT NULL REFERENCES public.maintenance_logs(id) ON DELETE CASCADE,
  action text NOT NULL, performed_by uuid, performed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_role text,
  title text NOT NULL, body text, category text NOT NULL DEFAULT 'info',
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','success','warning','danger')),
  link_path text, is_read boolean NOT NULL DEFAULT false,
  entity text, record_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notif_recipient ON public.notifications(recipient_id, is_read);
CREATE TABLE public.approval_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity text NOT NULL, record_id uuid NOT NULL,
  action text NOT NULL, from_status text, to_status text,
  note text, actor_id uuid, actor_role text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_approval_entity ON public.approval_history(entity, record_id);

-- ===================== GRANTS + RLS (bulk) =====================
DO $$
DECLARE t text;
  sensitive text[] := ARRAY['material_costs','machine_rates','labor_rates','overhead_rates','standard_hpp_versions','standard_hpp_details','actual_production_costs','wip_valuations','loss_valuations'];
  writer_map jsonb := '{
    "customers":["SALES","PPIC","SYSADMIN"],
    "customer_documents":["SALES","PPIC","SYSADMIN"],
    "sales_orders":["SALES","PPIC","SYSADMIN"],
    "sales_order_items":["SALES","PPIC","SYSADMIN"],
    "products":["SYSADMIN","IE"],
    "product_variants":["SYSADMIN","IE"],
    "units_of_measure":["SYSADMIN"],
    "uom_conversions":["SYSADMIN"],
    "work_centers":["SYSADMIN","IE"],
    "machines":["SYSADMIN","IE"],
    "routings":["IE","SYSADMIN"],
    "routing_operations":["IE","SYSADMIN"],
    "materials":["INVENTORY","SYSADMIN"],
    "bom_headers":["IE","SYSADMIN"],
    "bom_items":["IE","SYSADMIN"],
    "warehouses":["INVENTORY","SYSADMIN"],
    "suppliers":["INVENTORY","SYSADMIN"],
    "production_plans":["PPIC","SYSADMIN"],
    "production_plan_items":["PPIC","SYSADMIN"],
    "work_orders":["PPIC","SYSADMIN"],
    "work_order_assignments":["PPIC","SYSADMIN"],
    "downtime_reason_codes":["SYSADMIN","PPIC"],
    "handovers":["SHOPFLOOR","PPIC","SYSADMIN"],
    "backlog_ledger":["PPIC","SYSADMIN"],
    "recovery_links":["PPIC","SYSADMIN"],
    "stock_balances":["INVENTORY","SYSADMIN"],
    "stock_ledger":["INVENTORY","SYSADMIN"],
    "stock_reservations":["INVENTORY","PPIC","SYSADMIN"],
    "material_receipts":["INVENTORY","SYSADMIN"],
    "material_issues":["INVENTORY","SYSADMIN"],
    "material_returns":["INVENTORY","SYSADMIN"],
    "stock_adjustments":["INVENTORY","SYSADMIN"],
    "stock_opnames":["INVENTORY","SYSADMIN"],
    "purchase_requisitions":["INVENTORY","SYSADMIN"],
    "purchase_requisition_items":["INVENTORY","SYSADMIN"],
    "purchase_orders":["INVENTORY","SYSADMIN"],
    "purchase_order_items":["INVENTORY","SYSADMIN"],
    "supplier_deliveries":["INVENTORY","SYSADMIN"],
    "time_studies":["IE","SYSADMIN"],
    "capacity_plans":["IE","SYSADMIN"],
    "manpower_recommendations":["IE","SYSADMIN"],
    "material_costs":["FINANCE","SYSADMIN"],
    "machine_rates":["FINANCE","SYSADMIN"],
    "labor_rates":["FINANCE","SYSADMIN"],
    "overhead_rates":["FINANCE","SYSADMIN"],
    "standard_hpp_versions":["FINANCE","SYSADMIN"],
    "standard_hpp_details":["FINANCE","SYSADMIN"],
    "actual_production_costs":["FINANCE","SYSADMIN"],
    "wip_valuations":["FINANCE","SYSADMIN"],
    "loss_valuations":["FINANCE","SYSADMIN"],
    "maintenance_logs":["PPIC","INVENTORY","SYSADMIN"],
    "maintenance_actions":["PPIC","INVENTORY","SYSADMIN"],
    "approval_history":["SALES","PPIC","IE","SHOPFLOOR","INVENTORY","FINANCE","SYSADMIN"]
  }'::jsonb;
  roles_arr text;
BEGIN
  FOR t IN SELECT jsonb_object_keys(writer_map) LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    SELECT string_agg(quote_literal(v), ',') INTO roles_arr FROM jsonb_array_elements_text(writer_map->t) v;
    IF t = ANY(sensitive) THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (NOT public.is_role(''SHOPFLOOR''))', t||'_read', t);
    ELSE
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)', t||'_read', t);
    END IF;
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_role(%s)) WITH CHECK (public.is_role(%s))', t||'_write', t, roles_arr, roles_arr);
  END LOOP;
END $$;

-- production_entries: shopfloor owns its own drafts, PPIC validates
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_entries, public.downtime_records, public.material_consumptions, public.notifications TO authenticated;
GRANT ALL ON public.production_entries, public.downtime_records, public.material_consumptions, public.notifications TO service_role;
ALTER TABLE public.production_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.downtime_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_consumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY pe_read ON public.production_entries FOR SELECT TO authenticated
  USING (NOT public.is_role('SHOPFLOOR') OR created_by = auth.uid() OR public.can_access_work_order(work_order_id));
CREATE POLICY pe_insert ON public.production_entries FOR INSERT TO authenticated
  WITH CHECK (public.is_role('SHOPFLOOR','PPIC','SYSADMIN') AND created_by = auth.uid());
CREATE POLICY pe_update_own ON public.production_entries FOR UPDATE TO authenticated
  USING (created_by = auth.uid() AND status IN ('Draft','Perlu Perbaikan'))
  WITH CHECK (created_by = auth.uid() AND validated_by IS NULL);
CREATE POLICY pe_update_ppic ON public.production_entries FOR UPDATE TO authenticated
  USING (public.is_role('PPIC','SYSADMIN') AND created_by <> auth.uid())
  WITH CHECK (public.is_role('PPIC','SYSADMIN'));
CREATE POLICY pe_delete ON public.production_entries FOR DELETE TO authenticated
  USING (public.is_role('PPIC','SYSADMIN') OR (created_by = auth.uid() AND status = 'Draft'));

CREATE POLICY dt_read ON public.downtime_records FOR SELECT TO authenticated USING (true);
CREATE POLICY dt_write ON public.downtime_records FOR ALL TO authenticated
  USING (public.is_role('PPIC','SYSADMIN') OR created_by = auth.uid())
  WITH CHECK (public.is_role('SHOPFLOOR','PPIC','SYSADMIN'));

CREATE POLICY mc_read ON public.material_consumptions FOR SELECT TO authenticated USING (true);
CREATE POLICY mc_write ON public.material_consumptions FOR ALL TO authenticated
  USING (public.is_role('PPIC','INVENTORY','SYSADMIN') OR created_by = auth.uid())
  WITH CHECK (public.is_role('SHOPFLOOR','PPIC','INVENTORY','SYSADMIN'));

CREATE POLICY notif_read ON public.notifications FOR SELECT TO authenticated
  USING (recipient_id = auth.uid() OR recipient_role = public.current_user_role());
CREATE POLICY notif_update ON public.notifications FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());
CREATE POLICY notif_insert ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

-- updated_at triggers
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT c.table_name FROM information_schema.columns c
           WHERE c.table_schema='public' AND c.column_name='updated_at'
             AND c.table_name NOT IN ('roles','plants','lines','shifts','profiles','system_settings')
  LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', 'trg_upd_'||t, t);
  END LOOP;
END $$;
