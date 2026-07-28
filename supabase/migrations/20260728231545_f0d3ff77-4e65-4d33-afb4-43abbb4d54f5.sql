CREATE OR REPLACE FUNCTION public.get_backend_status()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'table_count', (SELECT COUNT(*)::int FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'),
    'realtime_active', EXISTS (SELECT 1 FROM pg_catalog.pg_publication WHERE pubname = 'supabase_realtime')
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_backend_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_backend_status() TO service_role;