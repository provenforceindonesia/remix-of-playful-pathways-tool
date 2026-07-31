-- Customers: restrict contact data
DROP POLICY IF EXISTS customers_read ON public.customers;
CREATE POLICY customers_read ON public.customers FOR SELECT TO authenticated
USING (public.is_role('SALES','PPIC','FINANCE','OWNER','SYSADMIN') AND public.in_user_plant(plant_id));

-- Suppliers: restrict contact data
DROP POLICY IF EXISTS suppliers_read ON public.suppliers;
CREATE POLICY suppliers_read ON public.suppliers FOR SELECT TO authenticated
USING (public.is_role('INVENTORY','PPIC','FINANCE','OWNER','SYSADMIN'));

-- Cost / pricing tables: finance-only reads
DROP POLICY IF EXISTS machine_rates_read ON public.machine_rates;
CREATE POLICY machine_rates_read ON public.machine_rates FOR SELECT TO authenticated
USING (public.is_role('FINANCE','OWNER','SYSADMIN'));

DROP POLICY IF EXISTS labor_rates_read ON public.labor_rates;
CREATE POLICY labor_rates_read ON public.labor_rates FOR SELECT TO authenticated
USING (public.is_role('FINANCE','OWNER','SYSADMIN'));

DROP POLICY IF EXISTS overhead_rates_read ON public.overhead_rates;
CREATE POLICY overhead_rates_read ON public.overhead_rates FOR SELECT TO authenticated
USING (public.is_role('FINANCE','OWNER','SYSADMIN'));

DROP POLICY IF EXISTS material_costs_read ON public.material_costs;
CREATE POLICY material_costs_read ON public.material_costs FOR SELECT TO authenticated
USING (public.is_role('FINANCE','OWNER','SYSADMIN'));

DROP POLICY IF EXISTS standard_hpp_versions_read ON public.standard_hpp_versions;
CREATE POLICY standard_hpp_versions_read ON public.standard_hpp_versions FOR SELECT TO authenticated
USING (public.is_role('FINANCE','OWNER','SYSADMIN'));

DROP POLICY IF EXISTS standard_hpp_details_read ON public.standard_hpp_details;
CREATE POLICY standard_hpp_details_read ON public.standard_hpp_details FOR SELECT TO authenticated
USING (public.is_role('FINANCE','OWNER','SYSADMIN'));

DROP POLICY IF EXISTS actual_production_costs_read ON public.actual_production_costs;
CREATE POLICY actual_production_costs_read ON public.actual_production_costs FOR SELECT TO authenticated
USING (public.is_role('FINANCE','OWNER','SYSADMIN'));

DROP POLICY IF EXISTS loss_valuations_read ON public.loss_valuations;
CREATE POLICY loss_valuations_read ON public.loss_valuations FOR SELECT TO authenticated
USING (public.is_role('FINANCE','OWNER','SYSADMIN'));

DROP POLICY IF EXISTS wip_valuations_read ON public.wip_valuations;
CREATE POLICY wip_valuations_read ON public.wip_valuations FOR SELECT TO authenticated
USING (public.is_role('FINANCE','OWNER','SYSADMIN'));

-- Profiles: limit staff directory exposure
DROP POLICY IF EXISTS profiles_read ON public.profiles;
CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR (public.is_role('SYSADMIN','OWNER','PPIC') AND public.in_user_plant(plant_id))
);

-- Notifications: no spoofed inserts
DROP POLICY IF EXISTS notif_insert ON public.notifications;
CREATE POLICY notif_insert ON public.notifications FOR INSERT TO authenticated
WITH CHECK (public.is_role('SYSADMIN'));

-- SECURITY DEFINER functions: remove anon execute, restrict internal recalcs
REVOKE EXECUTE ON FUNCTION public.can_access_work_order(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM anon;
REVOKE EXECUTE ON FUNCTION public.current_user_plant() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_role(VARIADIC text[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_permission(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.in_user_plant(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_backend_status() FROM anon;
REVOKE EXECUTE ON FUNCTION public.next_so_number() FROM anon;
REVOKE EXECUTE ON FUNCTION public.next_product_code() FROM anon;
REVOKE EXECUTE ON FUNCTION public.next_doc_no(text, regclass) FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_backlog(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_sales_order_progress(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_after_production_entry() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_product_code() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calc_downtime_duration() FROM anon, authenticated;

-- Storage: explicit, restrictive policies for the private export bucket
DROP POLICY IF EXISTS "export_bucket_admin_read" ON storage.objects;
CREATE POLICY "export_bucket_admin_read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'database_export_29_07_26' AND public.is_role('SYSADMIN'));

DROP POLICY IF EXISTS "export_bucket_admin_write" ON storage.objects;
CREATE POLICY "export_bucket_admin_write" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'database_export_29_07_26' AND public.is_role('SYSADMIN'));

DROP POLICY IF EXISTS "export_bucket_admin_update" ON storage.objects;
CREATE POLICY "export_bucket_admin_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'database_export_29_07_26' AND public.is_role('SYSADMIN'))
WITH CHECK (bucket_id = 'database_export_29_07_26' AND public.is_role('SYSADMIN'));

DROP POLICY IF EXISTS "export_bucket_admin_delete" ON storage.objects;
CREATE POLICY "export_bucket_admin_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'database_export_29_07_26' AND public.is_role('SYSADMIN'));