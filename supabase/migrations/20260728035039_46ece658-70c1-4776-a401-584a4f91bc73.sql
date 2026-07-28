DO $$
DECLARE t record;
BEGIN
  FOR t IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND NOT EXISTS (
        SELECT 1 FROM pg_publication_tables pt
        WHERE pt.pubname = 'supabase_realtime'
          AND pt.schemaname = 'public'
          AND pt.tablename = c.relname
      )
  LOOP
    EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t.relname);
  END LOOP;

  FOR t IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  LOOP
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t.relname);
  END LOOP;
END $$;