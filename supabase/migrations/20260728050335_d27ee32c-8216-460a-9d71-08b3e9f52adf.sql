CREATE SEQUENCE IF NOT EXISTS public.seq_product_code START 1;

INSERT INTO public.system_settings (key, value, description)
VALUES ('product_code_format', '{"prefix":"PRD","separator":"-","padding":3}'::jsonb, 'Format kode produk otomatis (prefix, separator, padding)')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.next_product_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE cfg jsonb; v_prefix text; v_sep text; v_pad int; n bigint; v_code text;
BEGIN
  SELECT value INTO cfg FROM public.system_settings WHERE key = 'product_code_format';
  cfg := COALESCE(cfg, '{}'::jsonb);
  v_prefix := COALESCE(cfg->>'prefix', 'PRD');
  v_sep := COALESCE(cfg->>'separator', '-');
  v_pad := GREATEST(COALESCE((cfg->>'padding')::int, 3), 1);
  LOOP
    n := nextval('public.seq_product_code');
    v_code := v_prefix || v_sep || lpad(n::text, v_pad, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.products p WHERE p.code = v_code);
  END LOOP;
  RETURN v_code;
END; $$;

SELECT setval('public.seq_product_code', GREATEST((SELECT COUNT(*) FROM public.products), 1));

ALTER TABLE public.products ALTER COLUMN code SET DEFAULT public.next_product_code();