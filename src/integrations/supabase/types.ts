export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      actual_production_costs: {
        Row: {
          actual_material_cost: number
          costing_version_id: string | null
          created_at: string
          created_by: string | null
          good_output: number
          id: string
          labor_cost: number
          machine_cost: number
          overhead_cost: number
          period_date: string
          rework_cost: number
          total_cost: number | null
          work_order_id: string
        }
        Insert: {
          actual_material_cost?: number
          costing_version_id?: string | null
          created_at?: string
          created_by?: string | null
          good_output?: number
          id?: string
          labor_cost?: number
          machine_cost?: number
          overhead_cost?: number
          period_date?: string
          rework_cost?: number
          total_cost?: number | null
          work_order_id: string
        }
        Update: {
          actual_material_cost?: number
          costing_version_id?: string | null
          created_at?: string
          created_by?: string | null
          good_output?: number
          id?: string
          labor_cost?: number
          machine_cost?: number
          overhead_cost?: number
          period_date?: string
          rework_cost?: number
          total_cost?: number | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "actual_production_costs_costing_version_id_fkey"
            columns: ["costing_version_id"]
            isOneToOne: false
            referencedRelation: "standard_hpp_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actual_production_costs_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_production_daily"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "actual_production_costs_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_production_kpi"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "actual_production_costs_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_history: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          created_at: string
          entity: string
          from_status: string | null
          id: string
          note: string | null
          record_id: string
          to_status: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          entity: string
          from_status?: string | null
          id?: string
          note?: string | null
          record_id: string
          to_status?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          entity?: string
          from_status?: string | null
          id?: string
          note?: string | null
          record_id?: string
          to_status?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          after_value: Json | null
          before_value: Json | null
          created_at: string
          entity: string
          id: string
          plant_id: string | null
          reason: string | null
          record_id: string | null
          role_code: string | null
          session_metadata: Json | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          action: string
          after_value?: Json | null
          before_value?: Json | null
          created_at?: string
          entity: string
          id?: string
          plant_id?: string | null
          reason?: string | null
          record_id?: string | null
          role_code?: string | null
          session_metadata?: Json | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          action?: string
          after_value?: Json | null
          before_value?: Json | null
          created_at?: string
          entity?: string
          id?: string
          plant_id?: string | null
          reason?: string | null
          record_id?: string | null
          role_code?: string | null
          session_metadata?: Json | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      backlog_ledger: {
        Row: {
          cause: string | null
          created_at: string
          due_date: string | null
          good_output: number
          id: string
          owner_id: string | null
          plant_id: string | null
          product_id: string | null
          recovered_qty: number
          remaining_qty: number
          sales_order_id: string | null
          shortage_qty: number
          status: string
          target_qty: number
          updated_at: string
          work_order_id: string
        }
        Insert: {
          cause?: string | null
          created_at?: string
          due_date?: string | null
          good_output?: number
          id?: string
          owner_id?: string | null
          plant_id?: string | null
          product_id?: string | null
          recovered_qty?: number
          remaining_qty?: number
          sales_order_id?: string | null
          shortage_qty?: number
          status?: string
          target_qty?: number
          updated_at?: string
          work_order_id: string
        }
        Update: {
          cause?: string | null
          created_at?: string
          due_date?: string | null
          good_output?: number
          id?: string
          owner_id?: string | null
          plant_id?: string | null
          product_id?: string | null
          recovered_qty?: number
          remaining_qty?: number
          sales_order_id?: string | null
          shortage_qty?: number
          status?: string
          target_qty?: number
          updated_at?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "backlog_ledger_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backlog_ledger_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backlog_ledger_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backlog_ledger_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_production_daily"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "backlog_ledger_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_production_kpi"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "backlog_ledger_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backlog_ledger_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_production_daily"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "backlog_ledger_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_production_kpi"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "backlog_ledger_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      bom_headers: {
        Row: {
          created_at: string
          created_by: string | null
          effective_date: string
          id: string
          output_basis: number
          output_uom_id: string | null
          product_id: string
          status: string
          updated_at: string
          variant_id: string | null
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_date?: string
          id?: string
          output_basis?: number
          output_uom_id?: string | null
          product_id: string
          status?: string
          updated_at?: string
          variant_id?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_date?: string
          id?: string
          output_basis?: number
          output_uom_id?: string | null
          product_id?: string
          status?: string
          updated_at?: string
          variant_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "bom_headers_output_uom_id_fkey"
            columns: ["output_uom_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_headers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_headers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_production_daily"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "bom_headers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_production_kpi"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "bom_headers_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      bom_items: {
        Row: {
          bom_id: string
          created_at: string
          id: string
          material_id: string
          scrap_allowance_pct: number
          standard_qty: number
          uom_id: string | null
        }
        Insert: {
          bom_id: string
          created_at?: string
          id?: string
          material_id: string
          scrap_allowance_pct?: number
          standard_qty: number
          uom_id?: string | null
        }
        Update: {
          bom_id?: string
          created_at?: string
          id?: string
          material_id?: string
          scrap_allowance_pct?: number
          standard_qty?: number
          uom_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bom_items_bom_id_fkey"
            columns: ["bom_id"]
            isOneToOne: false
            referencedRelation: "bom_headers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_items_uom_id_fkey"
            columns: ["uom_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
        ]
      }
      capacity_plans: {
        Row: {
          capacity_per_shift: number
          created_at: string
          created_by: string | null
          id: string
          line_id: string | null
          machine_id: string | null
          net_available_minutes: number
          plan_date: string
          plant_id: string | null
          shift_id: string | null
          standard_cycle_time_sec: number
        }
        Insert: {
          capacity_per_shift?: number
          created_at?: string
          created_by?: string | null
          id?: string
          line_id?: string | null
          machine_id?: string | null
          net_available_minutes?: number
          plan_date?: string
          plant_id?: string | null
          shift_id?: string | null
          standard_cycle_time_sec?: number
        }
        Update: {
          capacity_per_shift?: number
          created_at?: string
          created_by?: string | null
          id?: string
          line_id?: string | null
          machine_id?: string | null
          net_available_minutes?: number
          plan_date?: string
          plant_id?: string | null
          shift_id?: string | null
          standard_cycle_time_sec?: number
        }
        Relationships: [
          {
            foreignKeyName: "capacity_plans_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capacity_plans_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capacity_plans_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "v_machine_health"
            referencedColumns: ["machine_id"]
          },
          {
            foreignKeyName: "capacity_plans_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "v_production_daily"
            referencedColumns: ["machine_id"]
          },
          {
            foreignKeyName: "capacity_plans_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "v_production_kpi"
            referencedColumns: ["machine_id"]
          },
          {
            foreignKeyName: "capacity_plans_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capacity_plans_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capacity_plans_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "v_production_daily"
            referencedColumns: ["shift_id"]
          },
          {
            foreignKeyName: "capacity_plans_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "v_production_kpi"
            referencedColumns: ["shift_id"]
          },
        ]
      }
      customer_documents: {
        Row: {
          created_at: string
          customer_id: string | null
          doc_type: string
          file_name: string
          file_path: string
          id: string
          sales_order_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          doc_type?: string
          file_name: string
          file_path: string
          id?: string
          sales_order_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          doc_type?: string
          file_name?: string
          file_path?: string
          id?: string
          sales_order_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_documents_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          code: string
          contact_person: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          email: string | null
          id: string
          is_active: boolean
          name: string
          payment_term_days: number
          phone: string | null
          plant_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          code: string
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          payment_term_days?: number
          phone?: string | null
          plant_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          code?: string
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          payment_term_days?: number
          phone?: string | null
          plant_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      downtime_reason_codes: {
        Row: {
          category: string
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          requires_maintenance: boolean
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          requires_maintenance?: boolean
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          requires_maintenance?: boolean
        }
        Relationships: []
      }
      downtime_records: {
        Row: {
          category: string | null
          cause: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          downtime_date: string
          duration_minutes: number
          end_time: string
          id: string
          machine_id: string | null
          operator_id: string | null
          plant_id: string | null
          production_entry_id: string | null
          reason_code_id: string | null
          requires_maintenance: boolean
          shift_id: string | null
          start_time: string
          status: string
          temporary_action: string | null
          updated_at: string
          work_order_id: string | null
        }
        Insert: {
          category?: string | null
          cause?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          downtime_date?: string
          duration_minutes?: number
          end_time: string
          id?: string
          machine_id?: string | null
          operator_id?: string | null
          plant_id?: string | null
          production_entry_id?: string | null
          reason_code_id?: string | null
          requires_maintenance?: boolean
          shift_id?: string | null
          start_time: string
          status?: string
          temporary_action?: string | null
          updated_at?: string
          work_order_id?: string | null
        }
        Update: {
          category?: string | null
          cause?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          downtime_date?: string
          duration_minutes?: number
          end_time?: string
          id?: string
          machine_id?: string | null
          operator_id?: string | null
          plant_id?: string | null
          production_entry_id?: string | null
          reason_code_id?: string | null
          requires_maintenance?: boolean
          shift_id?: string | null
          start_time?: string
          status?: string
          temporary_action?: string | null
          updated_at?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "downtime_records_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "downtime_records_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "v_machine_health"
            referencedColumns: ["machine_id"]
          },
          {
            foreignKeyName: "downtime_records_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "v_production_daily"
            referencedColumns: ["machine_id"]
          },
          {
            foreignKeyName: "downtime_records_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "v_production_kpi"
            referencedColumns: ["machine_id"]
          },
          {
            foreignKeyName: "downtime_records_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "downtime_records_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "downtime_records_production_entry_id_fkey"
            columns: ["production_entry_id"]
            isOneToOne: false
            referencedRelation: "production_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "downtime_records_production_entry_id_fkey"
            columns: ["production_entry_id"]
            isOneToOne: false
            referencedRelation: "v_production_daily"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "downtime_records_production_entry_id_fkey"
            columns: ["production_entry_id"]
            isOneToOne: false
            referencedRelation: "v_production_kpi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "downtime_records_reason_code_id_fkey"
            columns: ["reason_code_id"]
            isOneToOne: false
            referencedRelation: "downtime_reason_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "downtime_records_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "downtime_records_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "v_production_daily"
            referencedColumns: ["shift_id"]
          },
          {
            foreignKeyName: "downtime_records_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "v_production_kpi"
            referencedColumns: ["shift_id"]
          },
          {
            foreignKeyName: "downtime_records_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_production_daily"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "downtime_records_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_production_kpi"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "downtime_records_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      handovers: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          created_by: string | null
          from_shift_id: string | null
          handover_date: string
          id: string
          line_id: string | null
          machine_condition: string | null
          pending_issues: string | null
          plant_id: string | null
          summary: string
          to_shift_id: string | null
          updated_at: string
          work_order_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          created_by?: string | null
          from_shift_id?: string | null
          handover_date?: string
          id?: string
          line_id?: string | null
          machine_condition?: string | null
          pending_issues?: string | null
          plant_id?: string | null
          summary: string
          to_shift_id?: string | null
          updated_at?: string
          work_order_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          created_by?: string | null
          from_shift_id?: string | null
          handover_date?: string
          id?: string
          line_id?: string | null
          machine_condition?: string | null
          pending_issues?: string | null
          plant_id?: string | null
          summary?: string
          to_shift_id?: string | null
          updated_at?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "handovers_from_shift_id_fkey"
            columns: ["from_shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handovers_from_shift_id_fkey"
            columns: ["from_shift_id"]
            isOneToOne: false
            referencedRelation: "v_production_daily"
            referencedColumns: ["shift_id"]
          },
          {
            foreignKeyName: "handovers_from_shift_id_fkey"
            columns: ["from_shift_id"]
            isOneToOne: false
            referencedRelation: "v_production_kpi"
            referencedColumns: ["shift_id"]
          },
          {
            foreignKeyName: "handovers_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handovers_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handovers_to_shift_id_fkey"
            columns: ["to_shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handovers_to_shift_id_fkey"
            columns: ["to_shift_id"]
            isOneToOne: false
            referencedRelation: "v_production_daily"
            referencedColumns: ["shift_id"]
          },
          {
            foreignKeyName: "handovers_to_shift_id_fkey"
            columns: ["to_shift_id"]
            isOneToOne: false
            referencedRelation: "v_production_kpi"
            referencedColumns: ["shift_id"]
          },
          {
            foreignKeyName: "handovers_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_production_daily"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "handovers_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_production_kpi"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "handovers_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      labor_rates: {
        Row: {
          created_at: string
          created_by: string | null
          effective_date: string
          hour_rate: number
          id: string
          plant_id: string | null
          role_label: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_date?: string
          hour_rate?: number
          id?: string
          plant_id?: string | null
          role_label?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_date?: string
          hour_rate?: number
          id?: string
          plant_id?: string | null
          role_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "labor_rates_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      lines: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          plant_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          plant_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          plant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lines_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      loss_valuations: {
        Row: {
          costing_version_id: string | null
          created_at: string
          created_by: string | null
          id: string
          loss_type: string
          loss_value: number
          method: string
          period_date: string
          quantity: number
          status: string
          unit_value: number
          validated_at: string | null
          validated_by: string | null
          work_order_id: string | null
        }
        Insert: {
          costing_version_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          loss_type: string
          loss_value?: number
          method?: string
          period_date?: string
          quantity?: number
          status?: string
          unit_value?: number
          validated_at?: string | null
          validated_by?: string | null
          work_order_id?: string | null
        }
        Update: {
          costing_version_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          loss_type?: string
          loss_value?: number
          method?: string
          period_date?: string
          quantity?: number
          status?: string
          unit_value?: number
          validated_at?: string | null
          validated_by?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loss_valuations_costing_version_id_fkey"
            columns: ["costing_version_id"]
            isOneToOne: false
            referencedRelation: "standard_hpp_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loss_valuations_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_production_daily"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "loss_valuations_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_production_kpi"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "loss_valuations_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      machine_rates: {
        Row: {
          created_at: string
          created_by: string | null
          effective_date: string
          hour_rate: number
          id: string
          machine_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_date?: string
          hour_rate?: number
          id?: string
          machine_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_date?: string
          hour_rate?: number
          id?: string
          machine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "machine_rates_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machine_rates_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "v_machine_health"
            referencedColumns: ["machine_id"]
          },
          {
            foreignKeyName: "machine_rates_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "v_production_daily"
            referencedColumns: ["machine_id"]
          },
          {
            foreignKeyName: "machine_rates_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "v_production_kpi"
            referencedColumns: ["machine_id"]
          },
        ]
      }
      machines: {
        Row: {
          code: string
          created_at: string
          id: string
          line_id: string | null
          machine_type: string | null
          manufacturer: string | null
          master_status: string
          name: string
          plant_id: string
          standard_speed: number
          updated_at: string
          work_center_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          line_id?: string | null
          machine_type?: string | null
          manufacturer?: string | null
          master_status?: string
          name: string
          plant_id: string
          standard_speed?: number
          updated_at?: string
          work_center_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          line_id?: string | null
          machine_type?: string | null
          manufacturer?: string | null
          master_status?: string
          name?: string
          plant_id?: string
          standard_speed?: number
          updated_at?: string
          work_center_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "machines_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machines_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machines_work_center_id_fkey"
            columns: ["work_center_id"]
            isOneToOne: false
            referencedRelation: "work_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_actions: {
        Row: {
          action: string
          created_at: string
          id: string
          maintenance_log_id: string
          performed_at: string
          performed_by: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          maintenance_log_id: string
          performed_at?: string
          performed_by?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          maintenance_log_id?: string
          performed_at?: string
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_actions_maintenance_log_id_fkey"
            columns: ["maintenance_log_id"]
            isOneToOne: false
            referencedRelation: "maintenance_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_logs: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          id: string
          log_date: string
          machine_id: string
          maintenance_type: string
          repair_minutes: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          log_date?: string
          machine_id: string
          maintenance_type?: string
          repair_minutes?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          log_date?: string
          machine_id?: string
          maintenance_type?: string
          repair_minutes?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_logs_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_logs_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "v_machine_health"
            referencedColumns: ["machine_id"]
          },
          {
            foreignKeyName: "maintenance_logs_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "v_production_daily"
            referencedColumns: ["machine_id"]
          },
          {
            foreignKeyName: "maintenance_logs_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "v_production_kpi"
            referencedColumns: ["machine_id"]
          },
        ]
      }
      manpower_recommendations: {
        Row: {
          created_at: string
          created_by: string | null
          current_manpower: number
          id: string
          line_id: string | null
          net_available_minutes_per_person: number
          note: string | null
          period_date: string
          plant_id: string | null
          recommended_manpower: number
          required_standard_minutes: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_manpower?: number
          id?: string
          line_id?: string | null
          net_available_minutes_per_person?: number
          note?: string | null
          period_date?: string
          plant_id?: string | null
          recommended_manpower?: number
          required_standard_minutes?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_manpower?: number
          id?: string
          line_id?: string | null
          net_available_minutes_per_person?: number
          note?: string | null
          period_date?: string
          plant_id?: string | null
          recommended_manpower?: number
          required_standard_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "manpower_recommendations_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manpower_recommendations_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      material_consumptions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          material_id: string
          production_entry_id: string | null
          qty_consumed: number
          qty_waste: number
          work_order_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          material_id: string
          production_entry_id?: string | null
          qty_consumed?: number
          qty_waste?: number
          work_order_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          material_id?: string
          production_entry_id?: string | null
          qty_consumed?: number
          qty_waste?: number
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_consumptions_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_consumptions_production_entry_id_fkey"
            columns: ["production_entry_id"]
            isOneToOne: false
            referencedRelation: "production_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_consumptions_production_entry_id_fkey"
            columns: ["production_entry_id"]
            isOneToOne: false
            referencedRelation: "v_production_daily"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_consumptions_production_entry_id_fkey"
            columns: ["production_entry_id"]
            isOneToOne: false
            referencedRelation: "v_production_kpi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_consumptions_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_production_daily"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "material_consumptions_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_production_kpi"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "material_consumptions_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      material_costs: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          effective_date: string
          id: string
          material_id: string
          unit_cost: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          effective_date?: string
          id?: string
          material_id: string
          unit_cost?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          effective_date?: string
          id?: string
          material_id?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "material_costs_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      material_issues: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          issue_date: string
          issue_no: string
          material_id: string
          qty: number
          warehouse_id: string | null
          work_order_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          issue_date?: string
          issue_no: string
          material_id: string
          qty: number
          warehouse_id?: string | null
          work_order_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          issue_date?: string
          issue_no?: string
          material_id?: string
          qty?: number
          warehouse_id?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_issues_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_issues_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_issues_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_production_daily"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "material_issues_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_production_kpi"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "material_issues_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      material_receipts: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          material_id: string
          note: string | null
          qty: number
          receipt_date: string
          receipt_no: string
          supplier_id: string | null
          unit_cost: number
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          material_id: string
          note?: string | null
          qty: number
          receipt_date?: string
          receipt_no: string
          supplier_id?: string | null
          unit_cost?: number
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          material_id?: string
          note?: string | null
          qty?: number
          receipt_date?: string
          receipt_no?: string
          supplier_id?: string | null
          unit_cost?: number
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_receipts_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_receipts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_receipts_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      material_returns: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          material_id: string
          qty: number
          reason: string | null
          return_date: string
          return_no: string
          warehouse_id: string | null
          work_order_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          material_id: string
          qty: number
          reason?: string | null
          return_date?: string
          return_no: string
          warehouse_id?: string | null
          work_order_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          material_id?: string
          qty?: number
          reason?: string | null
          return_date?: string
          return_no?: string
          warehouse_id?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_returns_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_returns_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_returns_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_production_daily"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "material_returns_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_production_kpi"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "material_returns_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          category: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          min_stock: number
          name: string
          reorder_point: number
          uom_id: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          min_stock?: number
          name: string
          reorder_point?: number
          uom_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          min_stock?: number
          name?: string
          reorder_point?: number
          uom_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_uom_id_fkey"
            columns: ["uom_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          category: string
          created_at: string
          entity: string | null
          id: string
          is_read: boolean
          link_path: string | null
          recipient_id: string | null
          recipient_role: string | null
          record_id: string | null
          severity: string
          title: string
        }
        Insert: {
          body?: string | null
          category?: string
          created_at?: string
          entity?: string | null
          id?: string
          is_read?: boolean
          link_path?: string | null
          recipient_id?: string | null
          recipient_role?: string | null
          record_id?: string | null
          severity?: string
          title: string
        }
        Update: {
          body?: string | null
          category?: string
          created_at?: string
          entity?: string | null
          id?: string
          is_read?: boolean
          link_path?: string | null
          recipient_id?: string | null
          recipient_role?: string | null
          record_id?: string | null
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      overhead_rates: {
        Row: {
          basis: string
          created_at: string
          created_by: string | null
          effective_date: string
          id: string
          plant_id: string | null
          rate: number
        }
        Insert: {
          basis?: string
          created_at?: string
          created_by?: string | null
          effective_date?: string
          id?: string
          plant_id?: string | null
          rate?: number
        }
        Update: {
          basis?: string
          created_at?: string
          created_by?: string | null
          effective_date?: string
          id?: string
          plant_id?: string | null
          rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "overhead_rates_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          code: string
          created_at: string
          description: string | null
          id: string
          module: string
        }
        Insert: {
          action: string
          code: string
          created_at?: string
          description?: string | null
          id?: string
          module: string
        }
        Update: {
          action?: string
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          module?: string
        }
        Relationships: []
      }
      plants: {
        Row: {
          address: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          product_id: string
          spec: Json
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          product_id: string
          spec?: Json
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          product_id?: string
          spec?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_production_daily"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_production_kpi"
            referencedColumns: ["product_id"]
          },
        ]
      }
      production_entries: {
        Row: {
          break_minutes: number
          created_at: string
          created_by: string | null
          created_role: string | null
          deleted_at: string | null
          downtime_frequency: number
          downtime_minutes: number
          end_time: string
          good_output: number
          handover_note: string | null
          id: string
          notes: string | null
          plant_id: string | null
          production_date: string
          reason_code: string | null
          reject_qty: number
          revision_note: string | null
          rework_qty: number
          shift_id: string | null
          start_time: string
          status: string
          total_output: number
          updated_at: string
          validated_at: string | null
          validated_by: string | null
          waste_material: number
          work_order_id: string
        }
        Insert: {
          break_minutes?: number
          created_at?: string
          created_by?: string | null
          created_role?: string | null
          deleted_at?: string | null
          downtime_frequency?: number
          downtime_minutes?: number
          end_time: string
          good_output?: number
          handover_note?: string | null
          id?: string
          notes?: string | null
          plant_id?: string | null
          production_date?: string
          reason_code?: string | null
          reject_qty?: number
          revision_note?: string | null
          rework_qty?: number
          shift_id?: string | null
          start_time: string
          status?: string
          total_output?: number
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          waste_material?: number
          work_order_id: string
        }
        Update: {
          break_minutes?: number
          created_at?: string
          created_by?: string | null
          created_role?: string | null
          deleted_at?: string | null
          downtime_frequency?: number
          downtime_minutes?: number
          end_time?: string
          good_output?: number
          handover_note?: string | null
          id?: string
          notes?: string | null
          plant_id?: string | null
          production_date?: string
          reason_code?: string | null
          reject_qty?: number
          revision_note?: string | null
          rework_qty?: number
          shift_id?: string | null
          start_time?: string
          status?: string
          total_output?: number
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          waste_material?: number
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_entries_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_entries_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_entries_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "v_production_daily"
            referencedColumns: ["shift_id"]
          },
          {
            foreignKeyName: "production_entries_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "v_production_kpi"
            referencedColumns: ["shift_id"]
          },
          {
            foreignKeyName: "production_entries_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_production_daily"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "production_entries_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_production_kpi"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "production_entries_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      production_plan_items: {
        Row: {
          created_at: string
          demand_qty: number
          id: string
          plan_id: string
          product_id: string
          target_qty: number
          uom_id: string | null
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          demand_qty: number
          id?: string
          plan_id: string
          product_id: string
          target_qty?: number
          uom_id?: string | null
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          demand_qty?: number
          id?: string
          plan_id?: string
          product_id?: string
          target_qty?: number
          uom_id?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "production_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_plan_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_plan_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_production_daily"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "production_plan_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_production_kpi"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "production_plan_items_uom_id_fkey"
            columns: ["uom_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_plan_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      production_plans: {
        Row: {
          capacity_readiness: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          line_id: string | null
          material_readiness: string
          plan_number: string
          plant_id: string | null
          production_date: string
          released_at: string | null
          released_by: string | null
          sales_order_id: string | null
          shift_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          capacity_readiness?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          line_id?: string | null
          material_readiness?: string
          plan_number?: string
          plant_id?: string | null
          production_date?: string
          released_at?: string | null
          released_by?: string | null
          sales_order_id?: string | null
          shift_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          capacity_readiness?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          line_id?: string | null
          material_readiness?: string
          plan_number?: string
          plant_id?: string | null
          production_date?: string
          released_at?: string | null
          released_by?: string | null
          sales_order_id?: string | null
          shift_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_plans_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_plans_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_plans_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_plans_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_plans_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "v_production_daily"
            referencedColumns: ["shift_id"]
          },
          {
            foreignKeyName: "production_plans_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "v_production_kpi"
            referencedColumns: ["shift_id"]
          },
        ]
      }
      products: {
        Row: {
          base_uom_id: string | null
          category: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          standard_selling_value: number
          updated_at: string
        }
        Insert: {
          base_uom_id?: string | null
          category?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          standard_selling_value?: number
          updated_at?: string
        }
        Update: {
          base_uom_id?: string | null
          category?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          standard_selling_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_base_uom_id_fkey"
            columns: ["base_uom_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          employee_code: string | null
          full_name: string
          id: string
          is_active: boolean
          line_id: string | null
          plant_id: string | null
          role_id: string | null
          shift_id: string | null
          theme_preference: string
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          employee_code?: string | null
          full_name: string
          id: string
          is_active?: boolean
          line_id?: string | null
          plant_id?: string | null
          role_id?: string | null
          shift_id?: string | null
          theme_preference?: string
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          employee_code?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          line_id?: string | null
          plant_id?: string | null
          role_id?: string | null
          shift_id?: string | null
          theme_preference?: string
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "v_production_daily"
            referencedColumns: ["shift_id"]
          },
          {
            foreignKeyName: "profiles_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "v_production_kpi"
            referencedColumns: ["shift_id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string
          id: string
          material_id: string
          po_id: string
          qty: number
          received_qty: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          material_id: string
          po_id: string
          qty: number
          received_qty?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          material_id?: string
          po_id?: string
          qty?: number
          received_qty?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          expected_date: string | null
          id: string
          order_date: string
          plant_id: string | null
          po_number: string
          pr_id: string | null
          status: string
          supplier_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          id?: string
          order_date?: string
          plant_id?: string | null
          po_number?: string
          pr_id?: string | null
          status?: string
          supplier_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          id?: string
          order_date?: string
          plant_id?: string | null
          po_number?: string
          pr_id?: string | null
          status?: string
          supplier_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_pr_id_fkey"
            columns: ["pr_id"]
            isOneToOne: false
            referencedRelation: "purchase_requisitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_requisition_items: {
        Row: {
          created_at: string
          estimated_price: number
          id: string
          material_id: string
          pr_id: string
          qty: number
        }
        Insert: {
          created_at?: string
          estimated_price?: number
          id?: string
          material_id: string
          pr_id: string
          qty: number
        }
        Update: {
          created_at?: string
          estimated_price?: number
          id?: string
          material_id?: string
          pr_id?: string
          qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_requisition_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requisition_items_pr_id_fkey"
            columns: ["pr_id"]
            isOneToOne: false
            referencedRelation: "purchase_requisitions"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_requisitions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          plant_id: string | null
          pr_number: string
          required_date: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          plant_id?: string | null
          pr_number?: string
          required_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          plant_id?: string | null
          pr_number?: string
          required_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_requisitions_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      recovery_links: {
        Row: {
          backlog_id: string
          created_at: string
          id: string
          recovered_qty: number
          recovery_wo_id: string
        }
        Insert: {
          backlog_id: string
          created_at?: string
          id?: string
          recovered_qty?: number
          recovery_wo_id: string
        }
        Update: {
          backlog_id?: string
          created_at?: string
          id?: string
          recovered_qty?: number
          recovery_wo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recovery_links_backlog_id_fkey"
            columns: ["backlog_id"]
            isOneToOne: false
            referencedRelation: "backlog_ledger"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recovery_links_recovery_wo_id_fkey"
            columns: ["recovery_wo_id"]
            isOneToOne: false
            referencedRelation: "v_production_daily"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "recovery_links_recovery_wo_id_fkey"
            columns: ["recovery_wo_id"]
            isOneToOne: false
            referencedRelation: "v_production_kpi"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "recovery_links_recovery_wo_id_fkey"
            columns: ["recovery_wo_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_readonly: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_readonly?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_readonly?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      routing_operations: {
        Row: {
          created_at: string
          id: string
          machine_id: string | null
          manpower: number
          operation_name: string
          routing_id: string
          seq: number
          setup_time_min: number
          standard_cycle_time_sec: number
          work_center_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          machine_id?: string | null
          manpower?: number
          operation_name: string
          routing_id: string
          seq: number
          setup_time_min?: number
          standard_cycle_time_sec?: number
          work_center_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          machine_id?: string | null
          manpower?: number
          operation_name?: string
          routing_id?: string
          seq?: number
          setup_time_min?: number
          standard_cycle_time_sec?: number
          work_center_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routing_operations_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routing_operations_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "v_machine_health"
            referencedColumns: ["machine_id"]
          },
          {
            foreignKeyName: "routing_operations_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "v_production_daily"
            referencedColumns: ["machine_id"]
          },
          {
            foreignKeyName: "routing_operations_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "v_production_kpi"
            referencedColumns: ["machine_id"]
          },
          {
            foreignKeyName: "routing_operations_routing_id_fkey"
            columns: ["routing_id"]
            isOneToOne: false
            referencedRelation: "routings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routing_operations_work_center_id_fkey"
            columns: ["work_center_id"]
            isOneToOne: false
            referencedRelation: "work_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      routings: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          effective_date: string
          id: string
          name: string
          product_id: string | null
          status: string
          updated_at: string
          variant_id: string | null
          version: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          effective_date?: string
          id?: string
          name: string
          product_id?: string | null
          status?: string
          updated_at?: string
          variant_id?: string | null
          version?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          effective_date?: string
          id?: string
          name?: string
          product_id?: string | null
          status?: string
          updated_at?: string
          variant_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "routings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_production_daily"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "routings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_production_kpi"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "routings_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_order_items: {
        Row: {
          created_at: string
          fulfilled_qty: number
          id: string
          note: string | null
          product_id: string
          quantity: number
          sales_order_id: string
          unit_price: number
          uom_id: string | null
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          fulfilled_qty?: number
          id?: string
          note?: string | null
          product_id: string
          quantity: number
          sales_order_id: string
          unit_price?: number
          uom_id?: string | null
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          fulfilled_qty?: number
          id?: string
          note?: string | null
          product_id?: string
          quantity?: number
          sales_order_id?: string
          unit_price?: number
          uom_id?: string | null
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_production_daily"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "sales_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_production_kpi"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "sales_order_items_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_uom_id_fkey"
            columns: ["uom_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          confirmed_delivery_date: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          customer_note: string | null
          customer_po_ref: string | null
          deleted_at: string | null
          id: string
          order_date: string
          plant_id: string | null
          priority: string
          progress_pct: number
          required_date: string
          revision_note: string | null
          so_number: string
          status: string
          submitted_at: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          confirmed_delivery_date?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          customer_note?: string | null
          customer_po_ref?: string | null
          deleted_at?: string | null
          id?: string
          order_date?: string
          plant_id?: string | null
          priority?: string
          progress_pct?: number
          required_date: string
          revision_note?: string | null
          so_number?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          confirmed_delivery_date?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          customer_note?: string | null
          customer_po_ref?: string | null
          deleted_at?: string | null
          id?: string
          order_date?: string
          plant_id?: string | null
          priority?: string
          progress_pct?: number
          required_date?: string
          revision_note?: string | null
          so_number?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          break_minutes: number
          code: string
          created_at: string
          end_time: string
          id: string
          is_active: boolean
          name: string
          plant_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          break_minutes?: number
          code: string
          created_at?: string
          end_time: string
          id?: string
          is_active?: boolean
          name: string
          plant_id: string
          start_time: string
          updated_at?: string
        }
        Update: {
          break_minutes?: number
          code?: string
          created_at?: string
          end_time?: string
          id?: string
          is_active?: boolean
          name?: string
          plant_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      standard_hpp_details: {
        Row: {
          contribution_margin_per_unit: number
          created_at: string
          hpp_per_unit: number | null
          id: string
          labor_cost: number
          machine_cost: number
          material_cost: number
          overhead_cost: number
          product_id: string
          rework_cost_per_unit: number
          variant_id: string | null
          version_id: string
        }
        Insert: {
          contribution_margin_per_unit?: number
          created_at?: string
          hpp_per_unit?: number | null
          id?: string
          labor_cost?: number
          machine_cost?: number
          material_cost?: number
          overhead_cost?: number
          product_id: string
          rework_cost_per_unit?: number
          variant_id?: string | null
          version_id: string
        }
        Update: {
          contribution_margin_per_unit?: number
          created_at?: string
          hpp_per_unit?: number | null
          id?: string
          labor_cost?: number
          machine_cost?: number
          material_cost?: number
          overhead_cost?: number
          product_id?: string
          rework_cost_per_unit?: number
          variant_id?: string | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "standard_hpp_details_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standard_hpp_details_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_production_daily"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "standard_hpp_details_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_production_kpi"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "standard_hpp_details_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standard_hpp_details_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "standard_hpp_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      standard_hpp_versions: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          created_at: string
          created_by: string | null
          effective_date: string
          id: string
          note: string | null
          status: string
          updated_at: string
          version_code: string
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          created_at?: string
          created_by?: string | null
          effective_date?: string
          id?: string
          note?: string | null
          status?: string
          updated_at?: string
          version_code: string
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          created_at?: string
          created_by?: string | null
          effective_date?: string
          id?: string
          note?: string | null
          status?: string
          updated_at?: string
          version_code?: string
        }
        Relationships: []
      }
      stock_adjustments: {
        Row: {
          adjustment_date: string
          adjustment_no: string
          created_at: string
          created_by: string | null
          id: string
          material_id: string
          qty_delta: number
          reason: string
          warehouse_id: string | null
        }
        Insert: {
          adjustment_date?: string
          adjustment_no: string
          created_at?: string
          created_by?: string | null
          id?: string
          material_id: string
          qty_delta: number
          reason: string
          warehouse_id?: string | null
        }
        Update: {
          adjustment_date?: string
          adjustment_no?: string
          created_at?: string
          created_by?: string | null
          id?: string
          material_id?: string
          qty_delta?: number
          reason?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_balances: {
        Row: {
          id: string
          material_id: string
          qty_on_hand: number
          qty_reserved: number
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          id?: string
          material_id: string
          qty_on_hand?: number
          qty_reserved?: number
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          id?: string
          material_id?: string
          qty_on_hand?: number
          qty_reserved?: number
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_balances_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_balances_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_ledger: {
        Row: {
          balance_after: number
          created_at: string
          created_by: string | null
          id: string
          material_id: string
          note: string | null
          qty_in: number
          qty_out: number
          ref_id: string | null
          ref_table: string | null
          txn_date: string
          txn_type: string
          unit_cost: number
          warehouse_id: string
        }
        Insert: {
          balance_after?: number
          created_at?: string
          created_by?: string | null
          id?: string
          material_id: string
          note?: string | null
          qty_in?: number
          qty_out?: number
          ref_id?: string | null
          ref_table?: string | null
          txn_date?: string
          txn_type: string
          unit_cost?: number
          warehouse_id: string
        }
        Update: {
          balance_after?: number
          created_at?: string
          created_by?: string | null
          id?: string
          material_id?: string
          note?: string | null
          qty_in?: number
          qty_out?: number
          ref_id?: string | null
          ref_table?: string | null
          txn_date?: string
          txn_type?: string
          unit_cost?: number
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_ledger_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_opnames: {
        Row: {
          counted_qty: number
          created_at: string
          created_by: string | null
          id: string
          material_id: string
          opname_date: string
          opname_no: string
          status: string
          system_qty: number
          variance_qty: number | null
          warehouse_id: string | null
        }
        Insert: {
          counted_qty?: number
          created_at?: string
          created_by?: string | null
          id?: string
          material_id: string
          opname_date?: string
          opname_no: string
          status?: string
          system_qty?: number
          variance_qty?: number | null
          warehouse_id?: string | null
        }
        Update: {
          counted_qty?: number
          created_at?: string
          created_by?: string | null
          id?: string
          material_id?: string
          opname_date?: string
          opname_no?: string
          status?: string
          system_qty?: number
          variance_qty?: number | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_opnames_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_opnames_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_reservations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          material_id: string
          qty: number
          status: string
          updated_at: string
          warehouse_id: string | null
          work_order_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          material_id: string
          qty: number
          status?: string
          updated_at?: string
          warehouse_id?: string | null
          work_order_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          material_id?: string
          qty?: number
          status?: string
          updated_at?: string
          warehouse_id?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_reservations_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reservations_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reservations_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_production_daily"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "stock_reservations_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_production_kpi"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "stock_reservations_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_deliveries: {
        Row: {
          actual_date: string | null
          created_at: string
          expected_date: string | null
          id: string
          note: string | null
          po_id: string | null
          status: string
          supplier_id: string | null
        }
        Insert: {
          actual_date?: string | null
          created_at?: string
          expected_date?: string | null
          id?: string
          note?: string | null
          po_id?: string | null
          status?: string
          supplier_id?: string | null
        }
        Update: {
          actual_date?: string | null
          created_at?: string
          expected_date?: string | null
          id?: string
          note?: string | null
          po_id?: string | null
          status?: string
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_deliveries_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_deliveries_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          code: string
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          lead_time_days: number
          name: string
          phone: string | null
          rating: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          lead_time_days?: number
          name: string
          phone?: string | null
          rating?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          lead_time_days?: number
          name?: string
          phone?: string | null
          rating?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      time_studies: {
        Row: {
          actual_cycle_time_sec: number
          created_at: string
          created_by: string | null
          id: string
          idle_time_min: number
          machine_id: string | null
          manpower: number
          notes: string | null
          observed_minutes: number
          observed_output: number
          observer_id: string | null
          process_name: string
          product_id: string | null
          setup_time_min: number
          shift_id: string | null
          status: string
          study_date: string
          updated_at: string
          validated_at: string | null
          validated_by: string | null
          variant_id: string | null
        }
        Insert: {
          actual_cycle_time_sec?: number
          created_at?: string
          created_by?: string | null
          id?: string
          idle_time_min?: number
          machine_id?: string | null
          manpower?: number
          notes?: string | null
          observed_minutes?: number
          observed_output?: number
          observer_id?: string | null
          process_name: string
          product_id?: string | null
          setup_time_min?: number
          shift_id?: string | null
          status?: string
          study_date?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          variant_id?: string | null
        }
        Update: {
          actual_cycle_time_sec?: number
          created_at?: string
          created_by?: string | null
          id?: string
          idle_time_min?: number
          machine_id?: string | null
          manpower?: number
          notes?: string | null
          observed_minutes?: number
          observed_output?: number
          observer_id?: string | null
          process_name?: string
          product_id?: string | null
          setup_time_min?: number
          shift_id?: string | null
          status?: string
          study_date?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_studies_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_studies_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "v_machine_health"
            referencedColumns: ["machine_id"]
          },
          {
            foreignKeyName: "time_studies_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "v_production_daily"
            referencedColumns: ["machine_id"]
          },
          {
            foreignKeyName: "time_studies_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "v_production_kpi"
            referencedColumns: ["machine_id"]
          },
          {
            foreignKeyName: "time_studies_observer_id_fkey"
            columns: ["observer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_studies_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_studies_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_production_daily"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "time_studies_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_production_kpi"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "time_studies_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_studies_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "v_production_daily"
            referencedColumns: ["shift_id"]
          },
          {
            foreignKeyName: "time_studies_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "v_production_kpi"
            referencedColumns: ["shift_id"]
          },
          {
            foreignKeyName: "time_studies_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      units_of_measure: {
        Row: {
          category: string
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          category?: string
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      uom_conversions: {
        Row: {
          created_at: string
          factor: number
          from_uom_id: string
          id: string
          to_uom_id: string
        }
        Insert: {
          created_at?: string
          factor: number
          from_uom_id: string
          id?: string
          to_uom_id: string
        }
        Update: {
          created_at?: string
          factor?: number
          from_uom_id?: string
          id?: string
          to_uom_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "uom_conversions_from_uom_id_fkey"
            columns: ["from_uom_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uom_conversions_to_uom_id_fkey"
            columns: ["to_uom_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          plant_id: string
          type: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          plant_id: string
          type?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          plant_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      wip_valuations: {
        Row: {
          completion_pct: number
          conversion_cost: number
          created_at: string
          created_by: string | null
          id: string
          material_cost_consumed: number
          valuation_date: string
          wip_value: number
          work_order_id: string | null
        }
        Insert: {
          completion_pct?: number
          conversion_cost?: number
          created_at?: string
          created_by?: string | null
          id?: string
          material_cost_consumed?: number
          valuation_date?: string
          wip_value?: number
          work_order_id?: string | null
        }
        Update: {
          completion_pct?: number
          conversion_cost?: number
          created_at?: string
          created_by?: string | null
          id?: string
          material_cost_consumed?: number
          valuation_date?: string
          wip_value?: number
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wip_valuations_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_production_daily"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "wip_valuations_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_production_kpi"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "wip_valuations_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_centers: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          plant_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          plant_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          plant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_centers_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_assignments: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          role_on_wo: string
          work_order_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          role_on_wo?: string
          work_order_id: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          role_on_wo?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_assignments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_assignments_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_production_daily"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "work_order_assignments_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_production_kpi"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "work_order_assignments_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          closed_at: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          line_id: string | null
          machine_id: string | null
          parent_wo_id: string | null
          plan_id: string | null
          planned_finish: string | null
          planned_start: string | null
          plant_id: string | null
          priority: string
          product_id: string
          released_at: string | null
          released_by: string | null
          routing_id: string | null
          sales_order_id: string | null
          shift_id: string | null
          standard_cycle_time_sec: number
          standard_speed: number
          status: string
          target_qty: number
          uom_id: string | null
          updated_at: string
          variant_id: string | null
          wo_number: string
          wo_type: string
          work_center_id: string | null
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          line_id?: string | null
          machine_id?: string | null
          parent_wo_id?: string | null
          plan_id?: string | null
          planned_finish?: string | null
          planned_start?: string | null
          plant_id?: string | null
          priority?: string
          product_id: string
          released_at?: string | null
          released_by?: string | null
          routing_id?: string | null
          sales_order_id?: string | null
          shift_id?: string | null
          standard_cycle_time_sec?: number
          standard_speed?: number
          status?: string
          target_qty: number
          uom_id?: string | null
          updated_at?: string
          variant_id?: string | null
          wo_number?: string
          wo_type?: string
          work_center_id?: string | null
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          line_id?: string | null
          machine_id?: string | null
          parent_wo_id?: string | null
          plan_id?: string | null
          planned_finish?: string | null
          planned_start?: string | null
          plant_id?: string | null
          priority?: string
          product_id?: string
          released_at?: string | null
          released_by?: string | null
          routing_id?: string | null
          sales_order_id?: string | null
          shift_id?: string | null
          standard_cycle_time_sec?: number
          standard_speed?: number
          status?: string
          target_qty?: number
          uom_id?: string | null
          updated_at?: string
          variant_id?: string | null
          wo_number?: string
          wo_type?: string
          work_center_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "v_machine_health"
            referencedColumns: ["machine_id"]
          },
          {
            foreignKeyName: "work_orders_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "v_production_daily"
            referencedColumns: ["machine_id"]
          },
          {
            foreignKeyName: "work_orders_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "v_production_kpi"
            referencedColumns: ["machine_id"]
          },
          {
            foreignKeyName: "work_orders_parent_wo_id_fkey"
            columns: ["parent_wo_id"]
            isOneToOne: false
            referencedRelation: "v_production_daily"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "work_orders_parent_wo_id_fkey"
            columns: ["parent_wo_id"]
            isOneToOne: false
            referencedRelation: "v_production_kpi"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "work_orders_parent_wo_id_fkey"
            columns: ["parent_wo_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "production_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_production_daily"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "work_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_production_kpi"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "work_orders_routing_id_fkey"
            columns: ["routing_id"]
            isOneToOne: false
            referencedRelation: "routings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "v_production_daily"
            referencedColumns: ["shift_id"]
          },
          {
            foreignKeyName: "work_orders_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "v_production_kpi"
            referencedColumns: ["shift_id"]
          },
          {
            foreignKeyName: "work_orders_uom_id_fkey"
            columns: ["uom_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_work_center_id_fkey"
            columns: ["work_center_id"]
            isOneToOne: false
            referencedRelation: "work_centers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_machine_health: {
        Row: {
          avg_oee: number | null
          avg_speed_index: number | null
          downtime_frequency: number | null
          downtime_minutes: number | null
          good_output: number | null
          line_id: string | null
          machine_code: string | null
          machine_condition: string | null
          machine_id: string | null
          machine_name: string | null
          master_status: string | null
          mtbf_hours: number | null
          mttr_minutes: number | null
          performance_status: string | null
          plant_id: string | null
          reject_qty: number | null
          total_output: number | null
        }
        Relationships: [
          {
            foreignKeyName: "machines_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machines_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_production_daily: {
        Row: {
          actual_speed: number | null
          created_by: string | null
          downtime_frequency: number | null
          downtime_minutes: number | null
          good_output: number | null
          id: string | null
          line_id: string | null
          machine_code: string | null
          machine_id: string | null
          machine_master_status: string | null
          machine_name: string | null
          operating_minutes: number | null
          planned_minutes: number | null
          plant_id: string | null
          product_code: string | null
          product_id: string | null
          product_name: string | null
          production_date: string | null
          reject_qty: number | null
          rework_qty: number | null
          shift_id: string | null
          shift_name: string | null
          standard_cycle_time_sec: number | null
          standard_speed: number | null
          status: string | null
          target_qty: number | null
          total_output: number | null
          validated_by: string | null
          variant_name: string | null
          waste_material: number | null
          wo_number: string | null
          wo_type: string | null
          work_order_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_entries_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "lines"
            referencedColumns: ["id"]
          },
        ]
      }
      v_production_kpi: {
        Row: {
          actual_speed: number | null
          availability: number | null
          created_by: string | null
          downtime_frequency: number | null
          downtime_minutes: number | null
          good_output: number | null
          id: string | null
          line_id: string | null
          lost_output: number | null
          machine_code: string | null
          machine_id: string | null
          machine_master_status: string | null
          machine_name: string | null
          oee: number | null
          operating_minutes: number | null
          performance: number | null
          planned_minutes: number | null
          plant_id: string | null
          product_code: string | null
          product_id: string | null
          product_name: string | null
          production_date: string | null
          quality: number | null
          reject_qty: number | null
          reject_rate: number | null
          rework_qty: number | null
          shift_id: string | null
          shift_name: string | null
          speed_index: number | null
          standard_cycle_time_sec: number | null
          standard_speed: number | null
          status: string | null
          target_qty: number | null
          total_output: number | null
          validated_by: string | null
          variant_name: string | null
          waste_material: number | null
          wo_number: string | null
          wo_type: string | null
          work_order_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_entries_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "lines"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_access_work_order: { Args: { wo_id: string }; Returns: boolean }
      current_user_plant: { Args: never; Returns: string }
      current_user_role: { Args: never; Returns: string }
      has_permission: { Args: { permission_code: string }; Returns: boolean }
      in_user_plant: { Args: { target: string }; Returns: boolean }
      is_role: { Args: { codes: string[] }; Returns: boolean }
      next_doc_no: { Args: { prefix: string; seq: unknown }; Returns: string }
      next_so_number: { Args: never; Returns: string }
      recalc_sales_order_progress: {
        Args: { p_so_id: string }
        Returns: undefined
      }
      sync_backlog: { Args: { p_wo_id: string }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
