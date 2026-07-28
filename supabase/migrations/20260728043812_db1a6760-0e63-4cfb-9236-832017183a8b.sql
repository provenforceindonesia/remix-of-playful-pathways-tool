INSERT INTO public.system_settings (key, value, description)
VALUES ('so_number_format',
        '{"prefix":"SO","date_pattern":"YYMM","separator":"-","padding":4}'::jsonb,
        'Format penomoran otomatis Customer Order (SO). prefix: awalan; date_pattern: YYMM/YYYYMM/YY/kosong; separator: pemisah; padding: jumlah digit urutan.')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.next_so_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg jsonb;
  v_prefix text; v_sep text; v_pattern text; v_pad int; v_date text; n bigint;
BEGIN
  SELECT value INTO cfg FROM public.system_settings WHERE key = 'so_number_format';
  cfg := COALESCE(cfg, '{}'::jsonb);
  v_prefix := COALESCE(cfg->>'prefix', 'SO');
  v_sep := COALESCE(cfg->>'separator', '-');
  v_pattern := COALESCE(cfg->>'date_pattern', 'YYMM');
  v_pad := COALESCE((cfg->>'padding')::int, 4);
  n := nextval('public.seq_sales_order');
  v_date := CASE WHEN v_pattern IS NULL OR v_pattern = '' THEN '' ELSE to_char(now(), v_pattern) END;
  RETURN v_prefix
      || CASE WHEN v_date = '' THEN '' ELSE v_sep || v_date END
      || v_sep || lpad(n::text, GREATEST(v_pad, 1), '0');
END; $$;

ALTER TABLE public.sales_orders ALTER COLUMN so_number SET DEFAULT public.next_so_number();