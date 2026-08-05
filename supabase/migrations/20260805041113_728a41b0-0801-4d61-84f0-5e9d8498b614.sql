ALTER TABLE public.production_plan_items
  ADD COLUMN IF NOT EXISTS planned_date date,
  ADD COLUMN IF NOT EXISTS line_id uuid REFERENCES public.lines(id),
  ADD COLUMN IF NOT EXISTS machine_id uuid REFERENCES public.machines(id),
  ADD COLUMN IF NOT EXISTS shift_id uuid REFERENCES public.shifts(id),
  ADD COLUMN IF NOT EXISTS routing_id uuid REFERENCES public.routings(id),
  ADD COLUMN IF NOT EXISTS available_minutes numeric(18,2),
  ADD COLUMN IF NOT EXISTS recommended_manpower numeric(10,2),
  ADD COLUMN IF NOT EXISTS planned_manpower numeric(10,2),
  ADD COLUMN IF NOT EXISTS material_readiness text NOT NULL DEFAULT 'Belum Dicek',
  ADD COLUMN IF NOT EXISTS capacity_readiness text NOT NULL DEFAULT 'Belum Dicek';

CREATE OR REPLACE FUNCTION public.next_plan_number()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.next_doc_no('PP', 'public.seq_production_plan'::regclass)
$$;

REVOKE ALL ON FUNCTION public.next_plan_number() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_plan_number() TO authenticated, service_role;