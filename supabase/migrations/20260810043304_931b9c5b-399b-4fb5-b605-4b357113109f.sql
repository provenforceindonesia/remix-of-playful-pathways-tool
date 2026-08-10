ALTER TABLE public.capacity_plans
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id),
  ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES public.product_variants(id),
  ADD COLUMN IF NOT EXISTS routing_id uuid REFERENCES public.routings(id),
  ADD COLUMN IF NOT EXISTS routing_operation_id uuid REFERENCES public.routing_operations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS operation_name text,
  ADD COLUMN IF NOT EXISTS seq integer,
  ADD COLUMN IF NOT EXISTS target_qty numeric(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS setup_time_min numeric(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS planned_downtime_min numeric(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS efficiency_pct numeric(6,2) NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS required_manpower numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS available_manpower numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS utilization_pct numeric(8,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_bottleneck boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS standard_source text NOT NULL DEFAULT 'Manual',
  ADD COLUMN IF NOT EXISTS source_time_study_id uuid REFERENCES public.time_studies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.manpower_recommendations
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id),
  ADD COLUMN IF NOT EXISTS routing_id uuid REFERENCES public.routings(id),
  ADD COLUMN IF NOT EXISTS shift_id uuid REFERENCES public.shifts(id),
  ADD COLUMN IF NOT EXISTS target_qty numeric(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_capacity_plans_routing ON public.capacity_plans(routing_id);
CREATE INDEX IF NOT EXISTS idx_capacity_plans_plan_date ON public.capacity_plans(plan_date);

DROP TRIGGER IF EXISTS trg_upd_capacity_plans ON public.capacity_plans;
CREATE TRIGGER trg_upd_capacity_plans BEFORE UPDATE ON public.capacity_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_upd_manpower_recommendations ON public.manpower_recommendations;
CREATE TRIGGER trg_upd_manpower_recommendations BEFORE UPDATE ON public.manpower_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();