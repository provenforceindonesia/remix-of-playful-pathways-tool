ALTER TABLE public.sales_orders DROP CONSTRAINT IF EXISTS sales_orders_status_check;
ALTER TABLE public.sales_orders ADD CONSTRAINT sales_orders_status_check CHECK (status = ANY (ARRAY['Draft','Menunggu Review Produksi','Perlu Revisi','Dikonfirmasi','Direncanakan','Dalam Produksi','Sebagian Terpenuhi','Selesai','Terlambat','Dibatalkan','Menunggu Persetujuan Pembatalan']));

CREATE OR REPLACE FUNCTION public.recalc_sales_order_progress(p_so_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_qty numeric; v_good numeric; v_pct numeric; v_status text; v_req date;
BEGIN
  IF p_so_id IS NULL THEN RETURN; END IF;
  SELECT COALESCE(SUM(quantity),0) INTO v_qty FROM public.sales_order_items WHERE sales_order_id = p_so_id;
  SELECT COALESCE(SUM(pe.good_output),0) INTO v_good
    FROM public.production_entries pe JOIN public.work_orders wo ON wo.id = pe.work_order_id
    WHERE wo.sales_order_id = p_so_id AND pe.status = 'Tervalidasi';
  v_pct := CASE WHEN v_qty > 0 THEN LEAST(100, ROUND(v_good / v_qty * 100, 2)) ELSE 0 END;
  SELECT required_date, status INTO v_req, v_status FROM public.sales_orders WHERE id = p_so_id;
  IF v_status NOT IN ('Draft','Menunggu Review Produksi','Perlu Revisi','Dibatalkan','Menunggu Persetujuan Pembatalan') THEN
    IF v_pct >= 100 THEN v_status := 'Selesai';
    ELSIF v_pct > 0 THEN v_status := CASE WHEN v_req < CURRENT_DATE THEN 'Terlambat' ELSE 'Sebagian Terpenuhi' END;
    ELSIF v_req < CURRENT_DATE THEN v_status := 'Terlambat';
    END IF;
  END IF;
  UPDATE public.sales_orders SET progress_pct = v_pct, status = v_status, updated_at = now() WHERE id = p_so_id;
END; $function$;