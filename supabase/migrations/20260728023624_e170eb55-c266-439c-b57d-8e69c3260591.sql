
-- ===================== BUSINESS LOGIC =====================
CREATE OR REPLACE FUNCTION public.recalc_sales_order_progress(p_so_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_qty numeric; v_good numeric; v_pct numeric; v_status text; v_req date;
BEGIN
  IF p_so_id IS NULL THEN RETURN; END IF;
  SELECT COALESCE(SUM(quantity),0) INTO v_qty FROM public.sales_order_items WHERE sales_order_id = p_so_id;
  SELECT COALESCE(SUM(pe.good_output),0) INTO v_good
    FROM public.production_entries pe JOIN public.work_orders wo ON wo.id = pe.work_order_id
    WHERE wo.sales_order_id = p_so_id AND pe.status = 'Tervalidasi';
  v_pct := CASE WHEN v_qty > 0 THEN LEAST(100, ROUND(v_good / v_qty * 100, 2)) ELSE 0 END;
  SELECT required_date, status INTO v_req, v_status FROM public.sales_orders WHERE id = p_so_id;
  IF v_status NOT IN ('Draft','Menunggu Review Produksi','Perlu Revisi','Dibatalkan') THEN
    IF v_pct >= 100 THEN v_status := 'Selesai';
    ELSIF v_pct > 0 THEN v_status := CASE WHEN v_req < CURRENT_DATE THEN 'Terlambat' ELSE 'Sebagian Terpenuhi' END;
    ELSIF v_req < CURRENT_DATE THEN v_status := 'Terlambat';
    END IF;
  END IF;
  UPDATE public.sales_orders SET progress_pct = v_pct, status = v_status, updated_at = now() WHERE id = p_so_id;
END; $$;

CREATE OR REPLACE FUNCTION public.sync_backlog(p_wo_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w record; v_good numeric; v_short numeric; v_recovered numeric;
BEGIN
  SELECT * INTO w FROM public.work_orders WHERE id = p_wo_id;
  IF NOT FOUND OR w.wo_type <> 'Reguler' THEN RETURN; END IF;
  SELECT COALESCE(SUM(good_output),0) INTO v_good FROM public.production_entries WHERE work_order_id = p_wo_id AND status='Tervalidasi';
  v_short := GREATEST(0, w.target_qty - v_good);
  SELECT COALESCE(SUM(rl.recovered_qty),0) INTO v_recovered FROM public.recovery_links rl
    JOIN public.backlog_ledger b ON b.id = rl.backlog_id WHERE b.work_order_id = p_wo_id;
  IF v_short <= 0 THEN
    UPDATE public.backlog_ledger SET good_output=v_good, shortage_qty=0, remaining_qty=0, status='Recovered', updated_at=now() WHERE work_order_id=p_wo_id;
    RETURN;
  END IF;
  INSERT INTO public.backlog_ledger (work_order_id, sales_order_id, product_id, plant_id, target_qty, good_output, shortage_qty, recovered_qty, remaining_qty, status, due_date)
  VALUES (p_wo_id, w.sales_order_id, w.product_id, w.plant_id, w.target_qty, v_good, v_short, v_recovered, GREATEST(0, v_short - v_recovered),
          CASE WHEN v_recovered <= 0 THEN 'Open' WHEN v_recovered >= v_short THEN 'Recovered' ELSE 'Partially Recovered' END,
          COALESCE(w.planned_finish::date, CURRENT_DATE) + 7)
  ON CONFLICT DO NOTHING;
  UPDATE public.backlog_ledger SET good_output=v_good, shortage_qty=v_short, recovered_qty=v_recovered,
    remaining_qty=GREATEST(0, v_short - v_recovered),
    status = CASE WHEN v_recovered <= 0 THEN 'Open' WHEN v_recovered >= v_short THEN 'Recovered' ELSE 'Partially Recovered' END,
    updated_at = now()
  WHERE work_order_id = p_wo_id;
END; $$;

CREATE UNIQUE INDEX idx_backlog_wo ON public.backlog_ledger(work_order_id);

CREATE OR REPLACE FUNCTION public.trg_after_production_entry()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_so uuid; v_wo uuid;
BEGIN
  v_wo := COALESCE(NEW.work_order_id, OLD.work_order_id);
  SELECT sales_order_id INTO v_so FROM public.work_orders WHERE id = v_wo;
  PERFORM public.sync_backlog(v_wo);
  PERFORM public.recalc_sales_order_progress(v_so);
  RETURN NULL;
END; $$;
CREATE TRIGGER trg_pe_recalc AFTER INSERT OR UPDATE OR DELETE ON public.production_entries
FOR EACH ROW EXECUTE FUNCTION public.trg_after_production_entry();

-- ===================== ANALYTIC VIEWS =====================
CREATE OR REPLACE VIEW public.v_production_daily
WITH (security_invoker = true) AS
SELECT
  pe.id, pe.production_date, pe.plant_id, pe.status, pe.created_by, pe.validated_by,
  wo.id AS work_order_id, wo.wo_number, wo.wo_type, wo.target_qty, wo.line_id,
  wo.standard_speed, wo.standard_cycle_time_sec,
  m.id AS machine_id, m.code AS machine_code, m.name AS machine_name, m.master_status AS machine_master_status,
  p.id AS product_id, p.code AS product_code, p.name AS product_name,
  pv.name AS variant_name,
  s.id AS shift_id, s.name AS shift_name,
  pe.total_output, pe.good_output, pe.reject_qty, pe.rework_qty, pe.waste_material,
  pe.downtime_minutes, pe.downtime_frequency,
  GREATEST(0, EXTRACT(EPOCH FROM ((CASE WHEN pe.end_time < pe.start_time THEN pe.end_time + interval '24 hour' ELSE pe.end_time END) - pe.start_time))/60 - pe.break_minutes) AS planned_minutes,
  GREATEST(0, EXTRACT(EPOCH FROM ((CASE WHEN pe.end_time < pe.start_time THEN pe.end_time + interval '24 hour' ELSE pe.end_time END) - pe.start_time))/60 - pe.break_minutes - pe.downtime_minutes) AS operating_minutes,
  CASE WHEN GREATEST(0, EXTRACT(EPOCH FROM ((CASE WHEN pe.end_time < pe.start_time THEN pe.end_time + interval '24 hour' ELSE pe.end_time END) - pe.start_time))/60 - pe.break_minutes - pe.downtime_minutes) > 0
    THEN ROUND(pe.total_output / (GREATEST(0, EXTRACT(EPOCH FROM ((CASE WHEN pe.end_time < pe.start_time THEN pe.end_time + interval '24 hour' ELSE pe.end_time END) - pe.start_time))/60 - pe.break_minutes - pe.downtime_minutes)/60), 2) ELSE 0 END AS actual_speed
FROM public.production_entries pe
JOIN public.work_orders wo ON wo.id = pe.work_order_id
LEFT JOIN public.machines m ON m.id = wo.machine_id
LEFT JOIN public.products p ON p.id = wo.product_id
LEFT JOIN public.product_variants pv ON pv.id = wo.variant_id
LEFT JOIN public.shifts s ON s.id = pe.shift_id
WHERE pe.deleted_at IS NULL;

CREATE OR REPLACE VIEW public.v_production_kpi
WITH (security_invoker = true) AS
SELECT d.*,
  CASE WHEN d.standard_speed > 0 THEN ROUND(d.actual_speed / d.standard_speed * 100, 2) ELSE 0 END AS speed_index,
  CASE WHEN d.planned_minutes > 0 THEN ROUND(d.operating_minutes / d.planned_minutes * 100, 2) ELSE 0 END AS availability,
  CASE WHEN d.operating_minutes > 0 AND d.standard_cycle_time_sec > 0
    THEN LEAST(100, ROUND((d.standard_cycle_time_sec * d.total_output) / (d.operating_minutes * 60) * 100, 2)) ELSE 0 END AS performance,
  CASE WHEN d.total_output > 0 THEN ROUND(d.good_output / d.total_output * 100, 2) ELSE 0 END AS quality,
  CASE WHEN d.total_output > 0 THEN ROUND(d.reject_qty / d.total_output * 100, 2) ELSE 0 END AS reject_rate,
  ROUND(d.downtime_minutes / 60 * d.standard_speed, 2) AS lost_output,
  CASE WHEN d.planned_minutes > 0 AND d.operating_minutes > 0 AND d.standard_cycle_time_sec > 0 AND d.total_output > 0
    THEN ROUND(
      (d.operating_minutes / d.planned_minutes) *
      LEAST(1, (d.standard_cycle_time_sec * d.total_output) / (d.operating_minutes * 60)) *
      (d.good_output / d.total_output) * 100, 2) ELSE 0 END AS oee
FROM public.v_production_daily d;

CREATE OR REPLACE VIEW public.v_machine_health
WITH (security_invoker = true) AS
SELECT m.id AS machine_id, m.code AS machine_code, m.name AS machine_name, m.plant_id, m.line_id, m.master_status,
  COALESCE(k.total_output,0) AS total_output, COALESCE(k.good_output,0) AS good_output, COALESCE(k.reject_qty,0) AS reject_qty,
  COALESCE(k.downtime_minutes,0) AS downtime_minutes, COALESCE(k.downtime_frequency,0) AS downtime_frequency,
  COALESCE(k.avg_oee,0) AS avg_oee, COALESCE(k.avg_speed_index,0) AS avg_speed_index,
  CASE WHEN COALESCE(k.downtime_frequency,0) > 0 THEN ROUND(COALESCE(k.operating_minutes,0)/60 / k.downtime_frequency, 2) ELSE NULL END AS mtbf_hours,
  COALESCE(mt.mttr_minutes, 0) AS mttr_minutes,
  CASE
    WHEN m.master_status IN ('Breakdown') THEN 'Breakdown'
    WHEN COALESCE(k.avg_oee,0) < 50 OR COALESCE(k.downtime_frequency,0) >= 5 THEN 'Prioritas Perawatan'
    WHEN COALESCE(k.avg_oee,0) < 65 OR COALESCE(k.downtime_frequency,0) >= 3 THEN 'Perlu Perawatan'
    WHEN COALESCE(k.avg_speed_index,100) < 95 THEN 'Dalam Pemantauan'
    ELSE 'Beroperasi' END AS machine_condition,
  CASE
    WHEN COALESCE(k.avg_speed_index,0) >= 100 THEN 'Above Standard'
    WHEN COALESCE(k.avg_speed_index,0) >= 95 THEN 'Normal'
    WHEN COALESCE(k.avg_speed_index,0) >= 85 THEN 'Lambat'
    ELSE 'Kritis' END AS performance_status
FROM public.machines m
LEFT JOIN (
  SELECT machine_id, SUM(total_output) total_output, SUM(good_output) good_output, SUM(reject_qty) reject_qty,
         SUM(downtime_minutes) downtime_minutes, SUM(downtime_frequency) downtime_frequency,
         SUM(operating_minutes) operating_minutes, ROUND(AVG(oee),2) avg_oee, ROUND(AVG(speed_index),2) avg_speed_index
  FROM public.v_production_kpi WHERE status='Tervalidasi' GROUP BY machine_id
) k ON k.machine_id = m.id
LEFT JOIN (
  SELECT machine_id, ROUND(AVG(repair_minutes),2) mttr_minutes FROM public.maintenance_logs WHERE status='Done' GROUP BY machine_id
) mt ON mt.machine_id = m.id;

GRANT SELECT ON public.v_production_daily, public.v_production_kpi, public.v_machine_health TO authenticated;

-- ===================== REALTIME =====================
ALTER PUBLICATION supabase_realtime ADD TABLE public.production_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.downtime_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.work_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.backlog_ledger;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_balances;

-- ===================== SEED =====================
INSERT INTO public.units_of_measure (code,name,category) VALUES
 ('pcs','Pieces','count'),('kg','Kilogram','weight'),('ton','Ton','weight'),('box','Box','count'),('pallet','Pallet','count'),('m','Meter','length');

INSERT INTO public.plants (code,name,address) VALUES ('PLT-01','Plant Cikarang','Kawasan Industri Jababeka, Cikarang');

INSERT INTO public.lines (plant_id,code,name)
SELECT id, v.code, v.name FROM public.plants, (VALUES ('LN-A','Line A - Extrusion'),('LN-B','Line B - Injection'),('LN-C','Line C - Assembly')) v(code,name);

INSERT INTO public.shifts (plant_id,code,name,start_time,end_time,break_minutes)
SELECT id, v.code, v.name, v.st::time, v.et::time, v.br FROM public.plants,
 (VALUES ('SH-1','Pagi','07:00','15:00',60),('SH-2','Siang','15:00','23:00',60),('SH-3','Malam','23:00','07:00',60),
         ('SH-L1','Long Shift 1','07:00','19:00',90),('SH-L2','Long Shift 2','19:00','07:00',90)) v(code,name,st,et,br);

INSERT INTO public.work_centers (plant_id,code,name)
SELECT id, v.code, v.name FROM public.plants, (VALUES ('WC-EXT','Extrusion Center'),('WC-INJ','Injection Center'),('WC-ASM','Assembly Center')) v(code,name);

INSERT INTO public.machines (plant_id,line_id,work_center_id,code,name,machine_type,standard_speed,master_status)
SELECT p.id, l.id, wc.id, v.code, v.name, v.mtype, v.spd, v.st
FROM public.plants p
JOIN LATERAL (VALUES
 ('MC-001','Extruder A1','Extruder','LN-A','WC-EXT',480,'Active'),
 ('MC-002','Extruder A2','Extruder','LN-A','WC-EXT',450,'Active'),
 ('MC-003','Injection B1','Injection','LN-B','WC-INJ',600,'Active'),
 ('MC-004','Injection B2','Injection','LN-B','WC-INJ',560,'Under Maintenance'),
 ('MC-005','Assembly C1','Assembly','LN-C','WC-ASM','720','Active')
) v(code,name,mtype,lcode,wccode,spd,st) ON true
JOIN public.lines l ON l.code = v.lcode AND l.plant_id = p.id
JOIN public.work_centers wc ON wc.code = v.wccode AND wc.plant_id = p.id;

INSERT INTO public.products (code,name,category,base_uom_id,standard_selling_value)
SELECT v.code, v.name, v.cat, u.id, v.price FROM (VALUES
 ('PRD-001','Pipa PVC 3 inch','Pipa',18500),
 ('PRD-002','Fitting Elbow 90',  'Fitting',7200),
 ('PRD-003','Tangki Air 500L','Tangki',825000),
 ('PRD-004','Selang Fleksibel 1/2','Selang',9500)
) v(code,name,cat,price) JOIN public.units_of_measure u ON u.code='pcs';

INSERT INTO public.product_variants (product_id,code,name)
SELECT p.id, v.vcode, v.vname FROM public.products p JOIN LATERAL (VALUES
 ('STD','Standard'),('HD','Heavy Duty')
) v(vcode,vname) ON true;

INSERT INTO public.materials (code,name,category,uom_id,min_stock,reorder_point)
SELECT v.code, v.name, v.cat, u.id, v.mn, v.rp FROM (VALUES
 ('MAT-001','Resin PVC','Raw',2000,3000),
 ('MAT-002','Pigmen Biru','Additive',100,200),
 ('MAT-003','Stabilizer','Additive',150,250),
 ('MAT-004','Resin HDPE','Raw',1800,2600),
 ('MAT-005','Karton Packing','Packaging',500,900)
) v(code,name,cat,mn,rp) JOIN public.units_of_measure u ON u.code='kg';

INSERT INTO public.warehouses (plant_id,code,name,type)
SELECT id, v.code, v.name, v.t FROM public.plants, (VALUES ('WH-RAW','Gudang Bahan Baku','RAW'),('WH-FG','Gudang Barang Jadi','FG')) v(code,name,t);

INSERT INTO public.stock_balances (material_id, warehouse_id, qty_on_hand, qty_reserved)
SELECT m.id, w.id, v.qty, v.res FROM public.warehouses w
JOIN LATERAL (VALUES ('MAT-001',5200,800),('MAT-002',180,20),('MAT-003',120,40),('MAT-004',3400,500),('MAT-005',1500,200)) v(code,qty,res) ON true
JOIN public.materials m ON m.code = v.code
WHERE w.code='WH-RAW';

INSERT INTO public.stock_ledger (material_id,warehouse_id,txn_type,qty_in,balance_after,unit_cost,note)
SELECT sb.material_id, sb.warehouse_id, 'RECEIPT', sb.qty_on_hand, sb.qty_on_hand, 15000, 'Saldo awal demo' FROM public.stock_balances sb;

INSERT INTO public.routings (code,name,product_id,variant_id,version,status)
SELECT 'RT-'||p.code, 'Routing '||p.name, p.id, pv.id, 1, 'Active'
FROM public.products p JOIN public.product_variants pv ON pv.product_id=p.id AND pv.code='STD';

INSERT INTO public.routing_operations (routing_id,seq,operation_name,work_center_id,machine_id,standard_cycle_time_sec,setup_time_min,manpower)
SELECT r.id, 1, 'Proses Utama', m.work_center_id, m.id, ROUND(3600.0/m.standard_speed,2), 20, 2
FROM public.routings r JOIN public.machines m ON m.code = CASE r.code WHEN 'RT-PRD-001' THEN 'MC-001' WHEN 'RT-PRD-002' THEN 'MC-003' WHEN 'RT-PRD-003' THEN 'MC-002' ELSE 'MC-005' END;

INSERT INTO public.bom_headers (product_id,variant_id,output_basis,output_uom_id,version,status)
SELECT p.id, pv.id, 1, u.id, 1, 'Active' FROM public.products p
JOIN public.product_variants pv ON pv.product_id=p.id AND pv.code='STD'
JOIN public.units_of_measure u ON u.code='pcs';

INSERT INTO public.bom_items (bom_id,material_id,standard_qty,scrap_allowance_pct,uom_id)
SELECT b.id, m.id, v.qty, v.scrap, u.id FROM public.bom_headers b
JOIN LATERAL (VALUES ('MAT-001',1.2,2.5),('MAT-002',0.02,1.0),('MAT-003',0.05,1.0)) v(code,qty,scrap) ON true
JOIN public.materials m ON m.code=v.code JOIN public.units_of_measure u ON u.code='kg';

INSERT INTO public.customers (code,name,contact_person,phone,email,address,plant_id)
SELECT v.code, v.name, v.cp, v.ph, v.em, v.ad, p.id FROM public.plants p, (VALUES
 ('CUST-001','PT Bangun Sejahtera','Budi Santoso','021-5551001','budi@bangunsejahtera.co.id','Jakarta Timur'),
 ('CUST-002','CV Mitra Konstruksi','Siti Rahayu','022-5552002','siti@mitrakonstruksi.co.id','Bandung'),
 ('CUST-003','PT Agro Nusantara','Dedi Kurniawan','031-5553003','dedi@agronusantara.co.id','Surabaya'),
 ('CUST-004','PT Karya Pipa Indo','Rina Wijaya','024-5554004','rina@karyapipa.co.id','Semarang')
) v(code,name,cp,ph,em,ad);

INSERT INTO public.suppliers (code,name,contact_person,phone,email,lead_time_days,rating) VALUES
 ('SUP-001','PT Kimia Prima','Agus Salim','021-6661001','agus@kimiaprima.co.id',10,4.5),
 ('SUP-002','PT Polimer Jaya','Hendra Gunawan','021-6662002','hendra@polimerjaya.co.id',14,4.1),
 ('SUP-003','CV Kemasan Andalan','Lina Marlina','021-6663003','lina@kemasanandalan.co.id',7,4.8);

INSERT INTO public.downtime_reason_codes (code,name,category,requires_maintenance) VALUES
 ('DT-01','Kerusakan Mesin','Mesin',true),
 ('DT-02','Ganti Cetakan','Metode',false),
 ('DT-03','Menunggu Material','Material',false),
 ('DT-04','Setting Ulang Parameter','Metode',false),
 ('DT-05','Listrik Padam','Eksternal',false),
 ('DT-06','Operator Tidak Tersedia','Manusia',false),
 ('DT-07','Preventive Maintenance','Planned',false);

-- Sales Orders
INSERT INTO public.sales_orders (customer_id, customer_po_ref, plant_id, order_date, required_date, confirmed_delivery_date, priority, status, customer_note)
SELECT c.id, v.po, p.id, CURRENT_DATE - v.dofs, CURRENT_DATE + v.dreq, CURRENT_DATE + v.dreq, v.pri, v.st, v.note
FROM public.plants p
JOIN LATERAL (VALUES
 ('CUST-001','PO/BS/2601','Tinggi','Dalam Produksi',12,14,'Kirim bertahap per 5.000 pcs'),
 ('CUST-002','PO/MK/1187','Normal','Dikonfirmasi',6,20,'Pastikan warna sesuai sampel'),
 ('CUST-003','PO/AN/7742','Urgent','Menunggu Review Produksi',2,10,'Dibutuhkan untuk proyek irigasi'),
 ('CUST-004',NULL,'Normal','Draft',0,30,'Draft penawaran awal')
) v(ccode,po,pri,st,dofs,dreq,note) ON true
JOIN public.customers c ON c.code = v.ccode;

INSERT INTO public.sales_order_items (sales_order_id,product_id,variant_id,quantity,uom_id,unit_price)
SELECT so.id, p.id, pv.id, v.qty, u.id, p.standard_selling_value
FROM public.sales_orders so
JOIN LATERAL (VALUES
 ('SO1','PRD-001',20000),('SO2','PRD-002',15000),('SO3','PRD-003',600),('SO4','PRD-004',8000)
) v(tag,pcode,qty) ON v.tag = 'SO' || (SELECT count(*) FROM public.sales_orders s2 WHERE s2.created_at <= so.created_at AND s2.so_number <= so.so_number)::text
JOIN public.products p ON p.code = v.pcode
JOIN public.product_variants pv ON pv.product_id=p.id AND pv.code='STD'
JOIN public.units_of_measure u ON u.code='pcs';

-- Production plans + work orders untuk 2 SO pertama
INSERT INTO public.production_plans (sales_order_id, plant_id, line_id, shift_id, production_date, material_readiness, capacity_readiness, status)
SELECT so.id, so.plant_id, l.id, s.id, CURRENT_DATE - 5, 'Siap','Siap','Fully Scheduled'
FROM public.sales_orders so
JOIN public.lines l ON l.plant_id=so.plant_id AND l.code='LN-A'
JOIN public.shifts s ON s.plant_id=so.plant_id AND s.code='SH-1'
WHERE so.status IN ('Dalam Produksi','Dikonfirmasi');

INSERT INTO public.production_plan_items (plan_id, product_id, variant_id, demand_qty, target_qty, uom_id)
SELECT pp.id, soi.product_id, soi.variant_id, soi.quantity, soi.quantity, soi.uom_id
FROM public.production_plans pp JOIN public.sales_order_items soi ON soi.sales_order_id = pp.sales_order_id;

INSERT INTO public.work_orders (plan_id, sales_order_id, wo_type, plant_id, line_id, shift_id, product_id, variant_id, routing_id, machine_id, work_center_id, target_qty, uom_id, planned_start, planned_finish, standard_speed, standard_cycle_time_sec, priority, status)
SELECT pp.id, pp.sales_order_id, 'Reguler', pp.plant_id, m.line_id, pp.shift_id, ppi.product_id, ppi.variant_id, r.id, m.id, m.work_center_id,
  ROUND(ppi.target_qty/2), ppi.uom_id, (CURRENT_DATE - 4 + (n||' hour')::interval), (CURRENT_DATE - 4 + ((n+8)||' hour')::interval),
  m.standard_speed, ROUND(3600.0/m.standard_speed,2), 'Normal', 'Completed'
FROM public.production_plans pp
JOIN public.production_plan_items ppi ON ppi.plan_id = pp.id
JOIN public.routings r ON r.product_id = ppi.product_id
JOIN public.machines m ON m.id = (SELECT machine_id FROM public.routing_operations WHERE routing_id=r.id LIMIT 1)
CROSS JOIN LATERAL (VALUES (7),(31)) g(n);

-- Costing
INSERT INTO public.material_costs (material_id, unit_cost, effective_date)
SELECT id, CASE code WHEN 'MAT-001' THEN 15200 WHEN 'MAT-002' THEN 88000 WHEN 'MAT-003' THEN 45000 WHEN 'MAT-004' THEN 16800 ELSE 5200 END, CURRENT_DATE - 30
FROM public.materials;
INSERT INTO public.machine_rates (machine_id, hour_rate, effective_date) SELECT id, 185000, CURRENT_DATE - 30 FROM public.machines;
INSERT INTO public.labor_rates (plant_id, role_label, hour_rate, effective_date) SELECT id, 'Operator', 38000, CURRENT_DATE - 30 FROM public.plants;
INSERT INTO public.overhead_rates (plant_id, basis, rate, effective_date) SELECT id, 'machine_hour', 62000, CURRENT_DATE - 30 FROM public.plants;

INSERT INTO public.standard_hpp_versions (version_code, effective_date, status, note, activated_at)
VALUES ('HPP-2026-01', CURRENT_DATE - 30, 'Active', 'Versi standar aktif periode berjalan', now());

INSERT INTO public.standard_hpp_details (version_id, product_id, variant_id, material_cost, machine_cost, labor_cost, overhead_cost, rework_cost_per_unit, contribution_margin_per_unit)
SELECT v.id, p.id, pv.id,
  ROUND(p.standard_selling_value*0.42), ROUND(p.standard_selling_value*0.12), ROUND(p.standard_selling_value*0.08), ROUND(p.standard_selling_value*0.07),
  ROUND(p.standard_selling_value*0.05), ROUND(p.standard_selling_value*0.31)
FROM public.standard_hpp_versions v, public.products p
JOIN public.product_variants pv ON pv.product_id=p.id AND pv.code='STD'
WHERE v.version_code='HPP-2026-01';

-- Procurement demo
INSERT INTO public.purchase_requisitions (plant_id, required_date, status, note)
SELECT id, CURRENT_DATE + 10, 'Approved', 'Kebutuhan resin bulan berjalan' FROM public.plants;
INSERT INTO public.purchase_requisition_items (pr_id, material_id, qty, estimated_price)
SELECT pr.id, m.id, 3000, 15200 FROM public.purchase_requisitions pr JOIN public.materials m ON m.code='MAT-001';
INSERT INTO public.purchase_orders (supplier_id, pr_id, plant_id, order_date, expected_date, status, total_amount)
SELECT s.id, pr.id, pr.plant_id, CURRENT_DATE - 3, CURRENT_DATE + 7, 'Approved', 45600000
FROM public.suppliers s, public.purchase_requisitions pr WHERE s.code='SUP-001';
INSERT INTO public.purchase_order_items (po_id, material_id, qty, unit_price)
SELECT po.id, m.id, 3000, 15200 FROM public.purchase_orders po JOIN public.materials m ON m.code='MAT-001';
INSERT INTO public.supplier_deliveries (po_id, supplier_id, expected_date, status)
SELECT po.id, po.supplier_id, po.expected_date, 'On Schedule' FROM public.purchase_orders po;

INSERT INTO public.maintenance_logs (machine_id, log_date, maintenance_type, description, repair_minutes, status)
SELECT id, CURRENT_DATE - 6, 'Corrective', 'Penggantian heater band', 95, 'Done' FROM public.machines WHERE code='MC-004';
