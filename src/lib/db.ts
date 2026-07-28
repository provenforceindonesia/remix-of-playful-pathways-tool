import { supabase } from "@/integrations/supabase/client";

type Res = PromiseLike<{ error: { message: string } | null }>;
type Single = PromiseLike<{
  data: Record<string, unknown> | null;
  error: { message: string } | null;
}>;
type Insertable = Res & { select: () => { single: () => Single } };
type Filterable = { eq: (col: string, val: string) => Res };

/** Loosely-typed writer for generic CRUD screens (table name known at runtime). */
export const db = supabase as unknown as {
  from: (table: string) => {
    insert: (payload: Record<string, unknown> | Record<string, unknown>[]) => Insertable;
    update: (payload: Record<string, unknown>) => Filterable;
    delete: () => Filterable;
  };
};
