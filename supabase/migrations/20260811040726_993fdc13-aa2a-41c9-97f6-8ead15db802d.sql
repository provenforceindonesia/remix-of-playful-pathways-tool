ALTER TABLE public.work_centers
  ADD COLUMN IF NOT EXISTS line_id uuid REFERENCES public.lines(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.lines
  ADD COLUMN IF NOT EXISTS description text;

UPDATE public.work_centers wc
SET line_id = sub.line_id
FROM (
  SELECT work_center_id, MIN(line_id::text)::uuid AS line_id
  FROM public.machines
  WHERE work_center_id IS NOT NULL AND line_id IS NOT NULL
  GROUP BY work_center_id
) sub
WHERE wc.id = sub.work_center_id AND wc.line_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_work_centers_line ON public.work_centers(line_id);