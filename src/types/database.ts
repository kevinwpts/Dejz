// Genererad från Supabase (projekt smddiufwpdpmzhvideto). Ändra inte för hand –
// generera om när databasen ändras (Supabase MCP: generate_typescript_types).
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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          created_at: string | null
          currency: string | null
          current_balance: number | null
          id: string
          initial_balance: number | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          current_balance?: number | null
          id?: string
          initial_balance?: number | null
          name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          current_balance?: number | null
          id?: string
          initial_balance?: number | null
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          balance_amount: number | null
          balance_currency: string | null
          balance_label: string | null
          balance_type: string | null
          balances_json: Json
          bban: string | null
          connection_id: string
          continuation_key: string | null
          created_at: string
          currency: string
          custom_name: string | null
          has_incomplete_history: boolean
          iban: string | null
          id: string
          import_start_date: string | null
          include_in_budget: boolean
          is_selected: boolean
          last_synced_at: string | null
          name: string
          ongoing_import_enabled: boolean
          product: string | null
          provider_account_uid: string
          reconciliation_completed_at: string | null
          stable_account_key: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_amount?: number | null
          balance_currency?: string | null
          balance_label?: string | null
          balance_type?: string | null
          balances_json?: Json
          bban?: string | null
          connection_id: string
          continuation_key?: string | null
          created_at?: string
          currency?: string
          custom_name?: string | null
          has_incomplete_history?: boolean
          iban?: string | null
          id?: string
          import_start_date?: string | null
          include_in_budget?: boolean
          is_selected?: boolean
          last_synced_at?: string | null
          name: string
          ongoing_import_enabled?: boolean
          product?: string | null
          provider_account_uid: string
          reconciliation_completed_at?: string | null
          stable_account_key?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_amount?: number | null
          balance_currency?: string | null
          balance_label?: string | null
          balance_type?: string | null
          balances_json?: Json
          bban?: string | null
          connection_id?: string
          continuation_key?: string | null
          created_at?: string
          currency?: string
          custom_name?: string | null
          has_incomplete_history?: boolean
          iban?: string | null
          id?: string
          import_start_date?: string | null
          include_in_budget?: boolean
          is_selected?: boolean
          last_synced_at?: string | null
          name?: string
          ongoing_import_enabled?: boolean
          product?: string | null
          provider_account_uid?: string
          reconciliation_completed_at?: string | null
          stable_account_key?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "bank_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_auth_states: {
        Row: {
          aspsp_country: string
          aspsp_logo: string | null
          aspsp_name: string
          connection_id: string | null
          created_at: string
          environment: string
          expires_at: string
          id: string
          origin_context: string
          return_step: string | null
          state_token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          aspsp_country?: string
          aspsp_logo?: string | null
          aspsp_name: string
          connection_id?: string | null
          created_at?: string
          environment?: string
          expires_at: string
          id?: string
          origin_context?: string
          return_step?: string | null
          state_token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          aspsp_country?: string
          aspsp_logo?: string | null
          aspsp_name?: string
          connection_id?: string | null
          created_at?: string
          environment?: string
          expires_at?: string
          id?: string
          origin_context?: string
          return_step?: string | null
          state_token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bank_connections: {
        Row: {
          aspsp_country: string
          aspsp_logo: string | null
          aspsp_name: string
          created_at: string
          environment: string
          id: string
          last_error: string | null
          last_synced_at: string | null
          provider: string
          status: string
          updated_at: string
          user_id: string
          valid_until: string | null
        }
        Insert: {
          aspsp_country?: string
          aspsp_logo?: string | null
          aspsp_name: string
          created_at?: string
          environment?: string
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          provider?: string
          status?: string
          updated_at?: string
          user_id: string
          valid_until?: string | null
        }
        Update: {
          aspsp_country?: string
          aspsp_logo?: string | null
          aspsp_name?: string
          created_at?: string
          environment?: string
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          provider?: string
          status?: string
          updated_at?: string
          user_id?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      bank_provider_sessions: {
        Row: {
          connection_id: string
          created_at: string
          provider_session_id: string
          raw_access_meta: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          provider_session_id: string
          raw_access_meta?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          provider_session_id?: string
          raw_access_meta?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_provider_sessions_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: true
            referencedRelation: "bank_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          amount: number
          bank_account_id: string
          booking_date: string | null
          booking_status: string
          connection_id: string
          counterparty_name: string | null
          created_at: string
          credit_debit_indicator: string | null
          currency: string
          custom_category: string | null
          custom_title: string | null
          description: string
          entry_reference: string | null
          external_key: string
          id: string
          is_excluded: boolean | null
          is_hearted: boolean | null
          is_waiting_for_package: boolean | null
          linked_fixed_expense_id: string | null
          linked_income_id: string | null
          linked_period_key: string | null
          linked_refund_transaction_id: string | null
          linked_saving_id: string | null
          linked_transaction_id: string | null
          linked_transfer_bank_tx_id: string | null
          note: string | null
          payment_method: string | null
          planned_amount_at_match: number | null
          previous_reconciliation_state: Json | null
          raw_json: Json | null
          receipt_name: string | null
          receipt_url: string | null
          reconciliation_status: string
          replaced_by_bank_tx_id: string | null
          reservation_disappeared_at: string | null
          review_reason: string | null
          transaction_date: string | null
          transaction_id: string | null
          updated_at: string
          user_decision_at: string | null
          user_id: string
          value_date: string | null
        }
        Insert: {
          amount: number
          bank_account_id: string
          booking_date?: string | null
          booking_status?: string
          connection_id: string
          counterparty_name?: string | null
          created_at?: string
          credit_debit_indicator?: string | null
          currency?: string
          custom_category?: string | null
          custom_title?: string | null
          description: string
          entry_reference?: string | null
          external_key: string
          id?: string
          is_excluded?: boolean | null
          is_hearted?: boolean | null
          is_waiting_for_package?: boolean | null
          linked_fixed_expense_id?: string | null
          linked_income_id?: string | null
          linked_period_key?: string | null
          linked_refund_transaction_id?: string | null
          linked_saving_id?: string | null
          linked_transaction_id?: string | null
          linked_transfer_bank_tx_id?: string | null
          note?: string | null
          payment_method?: string | null
          planned_amount_at_match?: number | null
          previous_reconciliation_state?: Json | null
          raw_json?: Json | null
          receipt_name?: string | null
          receipt_url?: string | null
          reconciliation_status?: string
          replaced_by_bank_tx_id?: string | null
          reservation_disappeared_at?: string | null
          review_reason?: string | null
          transaction_date?: string | null
          transaction_id?: string | null
          updated_at?: string
          user_decision_at?: string | null
          user_id: string
          value_date?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string
          booking_date?: string | null
          booking_status?: string
          connection_id?: string
          counterparty_name?: string | null
          created_at?: string
          credit_debit_indicator?: string | null
          currency?: string
          custom_category?: string | null
          custom_title?: string | null
          description?: string
          entry_reference?: string | null
          external_key?: string
          id?: string
          is_excluded?: boolean | null
          is_hearted?: boolean | null
          is_waiting_for_package?: boolean | null
          linked_fixed_expense_id?: string | null
          linked_income_id?: string | null
          linked_period_key?: string | null
          linked_refund_transaction_id?: string | null
          linked_saving_id?: string | null
          linked_transaction_id?: string | null
          linked_transfer_bank_tx_id?: string | null
          note?: string | null
          payment_method?: string | null
          planned_amount_at_match?: number | null
          previous_reconciliation_state?: Json | null
          raw_json?: Json | null
          receipt_name?: string | null
          receipt_url?: string | null
          reconciliation_status?: string
          replaced_by_bank_tx_id?: string | null
          reservation_disappeared_at?: string | null
          review_reason?: string | null
          transaction_date?: string | null
          transaction_id?: string | null
          updated_at?: string
          user_decision_at?: string | null
          user_id?: string
          value_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "bank_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_linked_transfer_bank_tx_id_fkey"
            columns: ["linked_transfer_bank_tx_id"]
            isOneToOne: false
            referencedRelation: "bank_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_replaced_by_bank_tx_id_fkey"
            columns: ["replaced_by_bank_tx_id"]
            isOneToOne: false
            referencedRelation: "bank_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      email_verification: {
        Row: {
          email: string | null
          sent_at: string | null
          token_hash: string | null
          user_id: string
          verified_at: string | null
        }
        Insert: {
          email?: string | null
          sent_at?: string | null
          token_hash?: string | null
          user_id: string
          verified_at?: string | null
        }
        Update: {
          email?: string | null
          sent_at?: string | null
          token_hash?: string | null
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          context: Json | null
          created_at: string | null
          id: string
          message: string
          type: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          id?: string
          message: string
          type?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          id?: string
          message?: string
          type?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_expenses: {
        Row: {
          active_months: number[] | null
          amount: number
          bank_account_name: string | null
          binding_end_date: string | null
          cancellation_date: string | null
          cancellation_watch: boolean | null
          cancelled_at: number | null
          category: string | null
          color: string | null
          created_at: string | null
          custom_interval: number | null
          deduction_day: number | null
          end_date: string | null
          frequency: string | null
          has_end_date: boolean | null
          icon: string | null
          id: string
          is_cancelled: boolean | null
          is_variable: boolean | null
          logo: string | null
          name: string
          note: string | null
          notice_period_months: number | null
          original_name: string | null
          payment_method: string | null
          period_overrides: Json | null
          price_history: Json | null
          provider: string | null
          receipt_name: string | null
          receipt_url: string | null
          reminder_days_before: number | null
          start_date: string | null
          start_month: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active_months?: number[] | null
          amount: number
          bank_account_name?: string | null
          binding_end_date?: string | null
          cancellation_date?: string | null
          cancellation_watch?: boolean | null
          cancelled_at?: number | null
          category?: string | null
          color?: string | null
          created_at?: string | null
          custom_interval?: number | null
          deduction_day?: number | null
          end_date?: string | null
          frequency?: string | null
          has_end_date?: boolean | null
          icon?: string | null
          id?: string
          is_cancelled?: boolean | null
          is_variable?: boolean | null
          logo?: string | null
          name: string
          note?: string | null
          notice_period_months?: number | null
          original_name?: string | null
          payment_method?: string | null
          period_overrides?: Json | null
          price_history?: Json | null
          provider?: string | null
          receipt_name?: string | null
          receipt_url?: string | null
          reminder_days_before?: number | null
          start_date?: string | null
          start_month?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active_months?: number[] | null
          amount?: number
          bank_account_name?: string | null
          binding_end_date?: string | null
          cancellation_date?: string | null
          cancellation_watch?: boolean | null
          cancelled_at?: number | null
          category?: string | null
          color?: string | null
          created_at?: string | null
          custom_interval?: number | null
          deduction_day?: number | null
          end_date?: string | null
          frequency?: string | null
          has_end_date?: boolean | null
          icon?: string | null
          id?: string
          is_cancelled?: boolean | null
          is_variable?: boolean | null
          logo?: string | null
          name?: string
          note?: string | null
          notice_period_months?: number | null
          original_name?: string | null
          payment_method?: string | null
          period_overrides?: Json | null
          price_history?: Json | null
          provider?: string | null
          receipt_name?: string | null
          receipt_url?: string | null
          reminder_days_before?: number | null
          start_date?: string | null
          start_month?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fixed_expenses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      income_sources: {
        Row: {
          active_months: number[] | null
          amount: number
          bank_account_name: string | null
          category: string | null
          color: string | null
          created_at: string | null
          custom_interval: number | null
          deduction_day: number | null
          end_date: string | null
          icon: string | null
          id: string
          is_variable: boolean | null
          logo: string | null
          name: string
          note: string | null
          original_name: string | null
          payment_method: string | null
          period_overrides: Json | null
          price_history: Json | null
          start_date: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active_months?: number[] | null
          amount: number
          bank_account_name?: string | null
          category?: string | null
          color?: string | null
          created_at?: string | null
          custom_interval?: number | null
          deduction_day?: number | null
          end_date?: string | null
          icon?: string | null
          id?: string
          is_variable?: boolean | null
          logo?: string | null
          name: string
          note?: string | null
          original_name?: string | null
          payment_method?: string | null
          period_overrides?: Json | null
          price_history?: Json | null
          start_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active_months?: number[] | null
          amount?: number
          bank_account_name?: string | null
          category?: string | null
          color?: string | null
          created_at?: string | null
          custom_interval?: number | null
          deduction_day?: number | null
          end_date?: string | null
          icon?: string | null
          id?: string
          is_variable?: boolean | null
          logo?: string | null
          name?: string
          note?: string | null
          original_name?: string | null
          payment_method?: string | null
          period_overrides?: Json | null
          price_history?: Json | null
          start_date?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "income_sources_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      incomes: {
        Row: {
          amount: number | null
          category: string | null
          created_at: string | null
          deduction_day: number | null
          icon: string | null
          id: string
          is_variable: boolean | null
          name: string
          period_overrides: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          category?: string | null
          created_at?: string | null
          deduction_day?: number | null
          icon?: string | null
          id?: string
          is_variable?: boolean | null
          name: string
          period_overrides?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          category?: string | null
          created_at?: string | null
          deduction_day?: number | null
          icon?: string | null
          id?: string
          is_variable?: boolean | null
          name?: string
          period_overrides?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      marketing_consent: {
        Row: {
          consented: boolean
          consented_at: string | null
          email: string | null
          source: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          consented?: boolean
          consented_at?: string | null
          email?: string | null
          source?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          consented?: boolean
          consented_at?: string | null
          email?: string | null
          source?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      monthly_savings: {
        Row: {
          amount: number | null
          category: string | null
          created_at: string | null
          deduction_day: number | null
          icon: string | null
          id: string
          is_variable: boolean | null
          name: string
          period_overrides: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          category?: string | null
          created_at?: string | null
          deduction_day?: number | null
          icon?: string | null
          id?: string
          is_variable?: boolean | null
          name: string
          period_overrides?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          category?: string | null
          created_at?: string | null
          deduction_day?: number | null
          icon?: string | null
          id?: string
          is_variable?: boolean | null
          name?: string
          period_overrides?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          description: string
          id: string
          read: boolean
          timestamp: number
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          read?: boolean
          timestamp: number
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          read?: boolean
          timestamp?: number
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          app_icon_theme: string | null
          avatar_url: string | null
          categories: Json | null
          country: string | null
          created_at: string | null
          currency: string | null
          currency_code: string | null
          dark_mode: boolean | null
          email: string | null
          exclude_internal_transfers: boolean | null
          full_name: string | null
          hide_budget_on_home: boolean | null
          hide_empty_categories: boolean | null
          home_widgets: Json | null
          id: string
          include_fixed_expenses_in_analysis: boolean | null
          income_categories: Json | null
          initial_spent: number | null
          language: string | null
          locale: string | null
          monthly_mandatory_savings: number | null
          monthly_savings: number | null
          monthly_savings_items: Json | null
          my_swish_phone: string | null
          next_billing_date: string | null
          notifications: Json | null
          payday: number | null
          payday_before_weekend: boolean | null
          payday_type: string | null
          payment_methods: Json | null
          planned_changes: Json | null
          quick_choices: Json | null
          role: string | null
          savings_goal_target: number | null
          savings_goals: Json | null
          savings_pot: number | null
          security_lock: boolean | null
          show_accounts_on_home: boolean | null
          show_fixed_expenses_in_calendar: boolean | null
          show_fixed_expenses_in_history: boolean | null
          show_fixed_expenses_in_today_view: boolean | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_price_id: string | null
          subscription_status: string | null
          surplus_income: number | null
          swish_contacts: Json | null
          theme_color: string | null
          theme_mode: string | null
          timezone: string | null
          total_saved_lifetime: number | null
          trial_end: string | null
          updated_at: string | null
          user_preferences: Json | null
          weekend_handling: string | null
        }
        Insert: {
          app_icon_theme?: string | null
          avatar_url?: string | null
          categories?: Json | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          currency_code?: string | null
          dark_mode?: boolean | null
          email?: string | null
          exclude_internal_transfers?: boolean | null
          full_name?: string | null
          hide_budget_on_home?: boolean | null
          hide_empty_categories?: boolean | null
          home_widgets?: Json | null
          id: string
          include_fixed_expenses_in_analysis?: boolean | null
          income_categories?: Json | null
          initial_spent?: number | null
          language?: string | null
          locale?: string | null
          monthly_mandatory_savings?: number | null
          monthly_savings?: number | null
          monthly_savings_items?: Json | null
          my_swish_phone?: string | null
          next_billing_date?: string | null
          notifications?: Json | null
          payday?: number | null
          payday_before_weekend?: boolean | null
          payday_type?: string | null
          payment_methods?: Json | null
          planned_changes?: Json | null
          quick_choices?: Json | null
          role?: string | null
          savings_goal_target?: number | null
          savings_goals?: Json | null
          savings_pot?: number | null
          security_lock?: boolean | null
          show_accounts_on_home?: boolean | null
          show_fixed_expenses_in_calendar?: boolean | null
          show_fixed_expenses_in_history?: boolean | null
          show_fixed_expenses_in_today_view?: boolean | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_price_id?: string | null
          subscription_status?: string | null
          surplus_income?: number | null
          swish_contacts?: Json | null
          theme_color?: string | null
          theme_mode?: string | null
          timezone?: string | null
          total_saved_lifetime?: number | null
          trial_end?: string | null
          updated_at?: string | null
          user_preferences?: Json | null
          weekend_handling?: string | null
        }
        Update: {
          app_icon_theme?: string | null
          avatar_url?: string | null
          categories?: Json | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          currency_code?: string | null
          dark_mode?: boolean | null
          email?: string | null
          exclude_internal_transfers?: boolean | null
          full_name?: string | null
          hide_budget_on_home?: boolean | null
          hide_empty_categories?: boolean | null
          home_widgets?: Json | null
          id?: string
          include_fixed_expenses_in_analysis?: boolean | null
          income_categories?: Json | null
          initial_spent?: number | null
          language?: string | null
          locale?: string | null
          monthly_mandatory_savings?: number | null
          monthly_savings?: number | null
          monthly_savings_items?: Json | null
          my_swish_phone?: string | null
          next_billing_date?: string | null
          notifications?: Json | null
          payday?: number | null
          payday_before_weekend?: boolean | null
          payday_type?: string | null
          payment_methods?: Json | null
          planned_changes?: Json | null
          quick_choices?: Json | null
          role?: string | null
          savings_goal_target?: number | null
          savings_goals?: Json | null
          savings_pot?: number | null
          security_lock?: boolean | null
          show_accounts_on_home?: boolean | null
          show_fixed_expenses_in_calendar?: boolean | null
          show_fixed_expenses_in_history?: boolean | null
          show_fixed_expenses_in_today_view?: boolean | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_price_id?: string | null
          subscription_status?: string | null
          surplus_income?: number | null
          swish_contacts?: Json | null
          theme_color?: string | null
          theme_mode?: string | null
          timezone?: string | null
          total_saved_lifetime?: number | null
          trial_end?: string | null
          updated_at?: string | null
          user_preferences?: Json | null
          weekend_handling?: string | null
        }
        Relationships: []
      }
      savings_goals: {
        Row: {
          created_at: string | null
          current_amount: number | null
          icon: string | null
          id: string
          logo: string | null
          monthly_savings: number | null
          name: string
          priority: number | null
          target_amount: number
          target_date: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_amount?: number | null
          icon?: string | null
          id?: string
          logo?: string | null
          monthly_savings?: number | null
          name: string
          priority?: number | null
          target_amount: number
          target_date?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_amount?: number | null
          icon?: string | null
          id?: string
          logo?: string | null
          monthly_savings?: number | null
          name?: string
          priority?: number | null
          target_amount?: number
          target_date?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "savings_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      savings_pot_transactions: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          note: string | null
          timestamp: number
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          note?: string | null
          timestamp: number
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          note?: string | null
          timestamp?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "savings_pot_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          bank_account_id: string | null
          bank_account_name: string | null
          bank_transaction_id: string | null
          category: string
          created_at: string | null
          icon: string | null
          id: string
          is_backdated: boolean | null
          is_excluded: boolean | null
          is_hearted: boolean | null
          is_recurring: boolean | null
          is_waiting_for_package: boolean | null
          linked_fixed_expense_id: string | null
          logo: string | null
          merchant: string | null
          note: string | null
          original_bank_amount: number | null
          original_bank_currency: string | null
          original_bank_description: string | null
          payment_method: string | null
          receipt_name: string | null
          receipt_url: string | null
          receipt_urls: Json | null
          refund_of_transaction_id: string | null
          splits: Json | null
          tags: string[] | null
          timestamp: number
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          bank_account_id?: string | null
          bank_account_name?: string | null
          bank_transaction_id?: string | null
          category: string
          created_at?: string | null
          icon?: string | null
          id?: string
          is_backdated?: boolean | null
          is_excluded?: boolean | null
          is_hearted?: boolean | null
          is_recurring?: boolean | null
          is_waiting_for_package?: boolean | null
          linked_fixed_expense_id?: string | null
          logo?: string | null
          merchant?: string | null
          note?: string | null
          original_bank_amount?: number | null
          original_bank_currency?: string | null
          original_bank_description?: string | null
          payment_method?: string | null
          receipt_name?: string | null
          receipt_url?: string | null
          receipt_urls?: Json | null
          refund_of_transaction_id?: string | null
          splits?: Json | null
          tags?: string[] | null
          timestamp: number
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          bank_account_id?: string | null
          bank_account_name?: string | null
          bank_transaction_id?: string | null
          category?: string
          created_at?: string | null
          icon?: string | null
          id?: string
          is_backdated?: boolean | null
          is_excluded?: boolean | null
          is_hearted?: boolean | null
          is_recurring?: boolean | null
          is_waiting_for_package?: boolean | null
          linked_fixed_expense_id?: string | null
          logo?: string | null
          merchant?: string | null
          note?: string | null
          original_bank_amount?: number | null
          original_bank_currency?: string | null
          original_bank_description?: string | null
          payment_method?: string | null
          receipt_name?: string | null
          receipt_url?: string | null
          receipt_urls?: Json | null
          refund_of_transaction_id?: string | null
          splits?: Json | null
          tags?: string[] | null
          timestamp?: number
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_bank_transaction_id_fkey"
            columns: ["bank_transaction_id"]
            isOneToOne: false
            referencedRelation: "bank_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity: {
        Row: {
          email: string | null
          first_seen_at: string
          last_platform: string | null
          last_seen_at: string
          user_id: string
          visit_count: number
        }
        Insert: {
          email?: string | null
          first_seen_at?: string
          last_platform?: string | null
          last_seen_at?: string
          user_id: string
          visit_count?: number
        }
        Update: {
          email?: string | null
          first_seen_at?: string
          last_platform?: string | null
          last_seen_at?: string
          user_id?: string
          visit_count?: number
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          categories: Json | null
          created_at: string
          currency: string | null
          language: string | null
          payday: number | null
          payday_before_weekend: boolean | null
          payday_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          categories?: Json | null
          created_at?: string
          currency?: string | null
          language?: string | null
          payday?: number | null
          payday_before_weekend?: boolean | null
          payday_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          categories?: Json | null
          created_at?: string
          currency?: string | null
          language?: string | null
          payday?: number | null
          payday_before_weekend?: boolean | null
          payday_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          pain: string | null
          source: string | null
          updated_at: string
          utm_source: string | null
          welcome_sent_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          pain?: string | null
          source?: string | null
          updated_at?: string
          utm_source?: string | null
          welcome_sent_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          pain?: string | null
          source?: string | null
          updated_at?: string
          utm_source?: string | null
          welcome_sent_at?: string | null
        }
        Relationships: []
      }
      waitlist_attempts: {
        Row: {
          created_at: string
          ip_hash: string
        }
        Insert: {
          created_at?: string
          ip_hash: string
        }
        Update: {
          created_at?: string
          ip_hash?: string
        }
        Relationships: []
      }
    }
    Views: {
      active_now: {
        Row: {
          email: string | null
          last_platform: string | null
          last_seen_at: string | null
        }
        Insert: {
          email?: string | null
          last_platform?: string | null
          last_seen_at?: string | null
        }
        Update: {
          email?: string | null
          last_platform?: string | null
          last_seen_at?: string | null
        }
        Relationships: []
      }
      active_today: {
        Row: {
          email: string | null
          last_platform: string | null
          last_seen_at: string | null
          visit_count: number | null
        }
        Insert: {
          email?: string | null
          last_platform?: string | null
          last_seen_at?: string | null
          visit_count?: number | null
        }
        Update: {
          email?: string | null
          last_platform?: string | null
          last_seen_at?: string | null
          visit_count?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      join_waitlist: {
        Args: {
          p_elapsed_ms?: number
          p_email: string
          p_pain?: string
          p_source?: string
          p_utm_source?: string
          p_website?: string
        }
        Returns: number
      }
      merge_user_preferences: { Args: { patch: Json }; Returns: Json }
      touch_activity: {
        Args: { p_new_visit?: boolean; p_platform?: string }
        Returns: undefined
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
