import { supabase } from "@/integrations/supabase/client";

type Actor = {
  id?: string | null;
  username?: string | null;
  role?: string | null;
  plant_id?: string | null;
};

export type AuditEvent = {
  entity: string;
  recordId?: string | null;
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  note?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
};

/**
 * Records a change into the audit trail (audit_logs) and, when a status
 * transition is involved, into approval_history. Never throws — auditing must
 * not break the user action.
 */
export async function recordAudit(actor: Actor, event: AuditEvent) {
  const client = supabase as unknown as {
    from: (t: string) => { insert: (v: Record<string, unknown>) => PromiseLike<unknown> };
  };

  try {
    await client.from("audit_logs").insert({
      user_id: actor.id ?? null,
      username: actor.username ?? null,
      role_code: actor.role ?? null,
      entity: event.entity,
      record_id: event.recordId ?? null,
      action: event.action,
      before_value: event.before ?? null,
      after_value: event.after ?? null,
      reason: event.note ?? null,
      plant_id: actor.plant_id ?? null,
      session_metadata: {
        at: new Date().toISOString(),
        path: typeof window !== "undefined" ? window.location.pathname : null,
      },
    });
  } catch {
    /* ignore */
  }

  if (event.toStatus || event.fromStatus) {
    try {
      await client.from("approval_history").insert({
        entity: event.entity,
        record_id: event.recordId ?? null,
        action: event.action,
        from_status: event.fromStatus ?? null,
        to_status: event.toStatus ?? null,
        note: event.note ?? null,
        actor_id: actor.id ?? null,
        actor_role: actor.role ?? null,
      });
    } catch {
      /* ignore */
    }
  }
}
