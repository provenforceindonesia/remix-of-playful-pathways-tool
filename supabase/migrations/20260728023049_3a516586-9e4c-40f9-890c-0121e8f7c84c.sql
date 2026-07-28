
-- ============ helper: updated_at ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ ROLES / PERMISSIONS ============
CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  is_readonly boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  module text NOT NULL,
  action text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role_id, permission_id)
);

-- ============ ORGANISASI ============
CREATE TABLE public.plants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  address text,
  timezone text NOT NULL DEFAULT 'Asia/Jakarta',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plant_id, code)
);

CREATE TABLE public.shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  break_minutes int NOT NULL DEFAULT 0 CHECK (break_minutes >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plant_id, code)
);

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  username text NOT NULL UNIQUE,
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  employee_code text UNIQUE,
  role_id uuid REFERENCES public.roles(id),
  plant_id uuid REFERENCES public.plants(id),
  line_id uuid REFERENCES public.lines(id),
  shift_id uuid REFERENCES public.shifts(id),
  is_active boolean NOT NULL DEFAULT true,
  avatar_url text,
  theme_preference text NOT NULL DEFAULT 'system' CHECK (theme_preference IN ('light','dark','system')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_plant ON public.profiles(plant_id);
CREATE INDEX idx_profiles_role ON public.profiles(role_id);

CREATE TABLE public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  username text,
  role_code text,
  entity text NOT NULL,
  record_id uuid,
  action text NOT NULL,
  before_value jsonb,
  after_value jsonb,
  reason text,
  session_metadata jsonb,
  plant_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_entity ON public.audit_logs(entity, record_id);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);

-- ============ SECURITY DEFINER FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.code FROM public.profiles p JOIN public.roles r ON r.id = p.role_id
  WHERE p.id = auth.uid() AND p.is_active
$$;

CREATE OR REPLACE FUNCTION public.current_user_plant()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT plant_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_role(VARIADIC codes text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.current_user_role() = ANY(codes)
$$;

CREATE OR REPLACE FUNCTION public.has_permission(permission_code text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.role_permissions rp ON rp.role_id = p.role_id
    JOIN public.permissions pe ON pe.id = rp.permission_id
    WHERE p.id = auth.uid() AND p.is_active AND pe.code = permission_code
  )
$$;

CREATE OR REPLACE FUNCTION public.in_user_plant(target uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT target IS NULL OR target = public.current_user_plant() OR public.current_user_role() IN ('SYSADMIN','OWNER')
$$;

-- ============ GRANTS / RLS ============
GRANT SELECT ON public.roles, public.permissions, public.role_permissions, public.plants, public.lines, public.shifts, public.profiles, public.system_settings, public.audit_logs TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.roles, public.permissions, public.role_permissions, public.plants, public.lines, public.shifts, public.profiles, public.system_settings TO authenticated;
GRANT INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.roles, public.permissions, public.role_permissions, public.plants, public.lines, public.shifts, public.profiles, public.system_settings, public.audit_logs TO service_role;

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY roles_read ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY roles_admin ON public.roles FOR ALL TO authenticated USING (public.is_role('SYSADMIN')) WITH CHECK (public.is_role('SYSADMIN'));
CREATE POLICY perms_read ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY perms_admin ON public.permissions FOR ALL TO authenticated USING (public.is_role('SYSADMIN')) WITH CHECK (public.is_role('SYSADMIN'));
CREATE POLICY rp_read ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY rp_admin ON public.role_permissions FOR ALL TO authenticated USING (public.is_role('SYSADMIN')) WITH CHECK (public.is_role('SYSADMIN'));

CREATE POLICY plants_read ON public.plants FOR SELECT TO authenticated USING (true);
CREATE POLICY plants_admin ON public.plants FOR ALL TO authenticated USING (public.is_role('SYSADMIN')) WITH CHECK (public.is_role('SYSADMIN'));
CREATE POLICY lines_read ON public.lines FOR SELECT TO authenticated USING (true);
CREATE POLICY lines_admin ON public.lines FOR ALL TO authenticated USING (public.is_role('SYSADMIN')) WITH CHECK (public.is_role('SYSADMIN'));
CREATE POLICY shifts_read ON public.shifts FOR SELECT TO authenticated USING (true);
CREATE POLICY shifts_admin ON public.shifts FOR ALL TO authenticated USING (public.is_role('SYSADMIN')) WITH CHECK (public.is_role('SYSADMIN'));

CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.in_user_plant(plant_id));
CREATE POLICY profiles_self_update ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY profiles_admin ON public.profiles FOR ALL TO authenticated USING (public.is_role('SYSADMIN')) WITH CHECK (public.is_role('SYSADMIN'));

CREATE POLICY settings_read ON public.system_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY settings_admin ON public.system_settings FOR ALL TO authenticated USING (public.is_role('SYSADMIN')) WITH CHECK (public.is_role('SYSADMIN'));

CREATE POLICY audit_read ON public.audit_logs FOR SELECT TO authenticated USING (public.is_role('SYSADMIN','OWNER') OR user_id = auth.uid());
CREATE POLICY audit_insert ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_roles_upd BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_plants_upd BEFORE UPDATE ON public.plants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_lines_upd BEFORE UPDATE ON public.lines FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_shifts_upd BEFORE UPDATE ON public.shifts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_profiles_upd BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_settings_upd BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ SEED ROLES & PERMISSIONS ============
INSERT INTO public.roles (code, name, description, is_readonly, sort_order) VALUES
 ('OWNER','Owner / Direktur','Akses baca strategis',true,1),
 ('SALES','Sales Admin','Mengelola customer dan sales order',false,2),
 ('PPIC','Production Control','Perencanaan, work order, validasi produksi',false,3),
 ('IE','Industrial Engineer','Routing, standard, time study, kapasitas',false,4),
 ('SHOPFLOOR','Production Team','Input produksi, downtime, konsumsi material',false,5),
 ('INVENTORY','Inventory & Procurement','Stok, penerimaan, pengeluaran, pembelian',false,6),
 ('FINANCE','Finance & Costing','Costing, HPP, valuasi, margin',false,7),
 ('SYSADMIN','System Admin','Konfigurasi sistem, user, role, permission',false,8);

INSERT INTO public.permissions (code, module, action, description)
SELECT m.module || '.' || a.action, m.module, a.action, m.module || ' - ' || a.action
FROM (VALUES ('dashboard'),('sales_order'),('production_plan'),('work_order'),('production_entry'),('downtime'),('inventory'),('procurement'),('engineering'),('costing'),('report'),('config')) AS m(module)
CROSS JOIN (VALUES ('view'),('create'),('edit'),('submit'),('validate'),('approve'),('return'),('release'),('close'),('cancel'),('delete'),('export'),('manage')) AS a(action);

-- OWNER: view + export saja
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.code='OWNER' AND p.action IN ('view','export');

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.code='SALES' AND (p.action='view' OR (p.module='sales_order' AND p.action IN ('create','edit','submit','cancel','export')) OR (p.module='report' AND p.action='export'));

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.code='PPIC' AND (p.action='view' OR (p.module IN ('production_plan','work_order') AND p.action IN ('create','edit','submit','release','close','cancel','export','approve')) OR (p.module='sales_order' AND p.action IN ('approve','return','validate')) OR (p.module='production_entry' AND p.action IN ('validate','return')) OR (p.module='report' AND p.action='export'));

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.code='IE' AND (p.action='view' OR (p.module='engineering' AND p.action IN ('create','edit','validate','approve','export','manage')) OR (p.module='report' AND p.action='export'));

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.code='SHOPFLOOR' AND ((p.module IN ('dashboard','work_order','production_entry','downtime') AND p.action='view') OR (p.module IN ('production_entry','downtime') AND p.action IN ('create','edit','submit')));

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.code='INVENTORY' AND (p.action='view' OR (p.module IN ('inventory','procurement') AND p.action IN ('create','edit','submit','approve','close','cancel','export','manage')) OR (p.module='report' AND p.action='export'));

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.code='FINANCE' AND (p.action='view' OR (p.module='costing' AND p.action IN ('create','edit','submit','approve','validate','export','manage')) OR (p.module='report' AND p.action='export'));

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.code='SYSADMIN' AND (p.action IN ('view','export') OR p.module='config');

INSERT INTO public.system_settings (key, value, description) VALUES
 ('order_ownership','{"role":"SALES"}','Role yang berhak membuat Customer Order'),
 ('downtime_loss_method','{"method":"cost_based"}','Metode perhitungan downtime loss: cost_based atau contribution_based'),
 ('kpi_threshold','{"oee_target":85,"speed_index_target":95,"reject_rate_max":3,"availability_target":90}','Ambang batas KPI');
