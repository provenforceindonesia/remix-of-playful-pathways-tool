-- Remove blanket PUBLIC execute on security-definer helpers
REVOKE EXECUTE ON FUNCTION public.can_access_work_order(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_user_plant() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_role(VARIADIC text[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_permission(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.in_user_plant(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_backend_status() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.next_so_number() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.next_product_code() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.next_doc_no(text, regclass) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_backlog(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recalc_sales_order_progress(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_after_production_entry() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ensure_product_code() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.calc_downtime_duration() FROM PUBLIC;

-- Grant back only what signed-in app users must call (RLS policies, defaults, status page)
GRANT EXECUTE ON FUNCTION public.can_access_work_order(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_plant() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_role(VARIADIC text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.in_user_plant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_backend_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_so_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_product_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_doc_no(text, regclass) TO authenticated;

GRANT EXECUTE ON FUNCTION public.can_access_work_order(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO service_role;
GRANT EXECUTE ON FUNCTION public.current_user_plant() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_role(VARIADIC text[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.has_permission(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.in_user_plant(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_backend_status() TO service_role;
GRANT EXECUTE ON FUNCTION public.next_so_number() TO service_role;
GRANT EXECUTE ON FUNCTION public.next_product_code() TO service_role;
GRANT EXECUTE ON FUNCTION public.next_doc_no(text, regclass) TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_backlog(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.recalc_sales_order_progress(uuid) TO service_role;