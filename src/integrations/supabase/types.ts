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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          created_at: string
          id: string
          job_id: string
          status: string
          worker_availability: string | null
          worker_id: string
          worker_name: string
          worker_skills: string[]
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          status?: string
          worker_availability?: string | null
          worker_id: string
          worker_name?: string
          worker_skills?: string[]
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          status?: string
          worker_availability?: string | null
          worker_id?: string
          worker_name?: string
          worker_skills?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          application_id: string
          contractor_id: string
          contractor_name: string
          created_at: string
          id: string
          job_id: string
          reference: string
          status: string
          terms: Json
          terms_version: number
          worker_id: string
          worker_name: string
        }
        Insert: {
          application_id: string
          contractor_id: string
          contractor_name?: string
          created_at?: string
          id?: string
          job_id: string
          reference: string
          status?: string
          terms: Json
          terms_version: number
          worker_id: string
          worker_name?: string
        }
        Update: {
          application_id?: string
          contractor_id?: string
          contractor_name?: string
          created_at?: string
          id?: string
          job_id?: string
          reference?: string
          status?: string
          terms?: Json
          terms_version?: number
          worker_id?: string
          worker_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_terms: {
        Row: {
          created_at: string
          id: string
          job_id: string
          terms: Json
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          terms: Json
          version: number
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          terms?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_terms_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          address: string
          contractor_id: string | null
          contractor_name: string
          created_at: string
          demo_day_offset: number | null
          description: string
          end_time: string
          id: string
          is_demo: boolean
          lat: number
          lng: number
          locality: string
          payment_timing: string
          skill: string
          start_time: string
          status: string
          terms_version: number
          tools_by: string
          wage: number
          wage_unit: string
          work_date: string
          workers_needed: number
        }
        Insert: {
          address?: string
          contractor_id?: string | null
          contractor_name?: string
          created_at?: string
          demo_day_offset?: number | null
          description?: string
          end_time: string
          id?: string
          is_demo?: boolean
          lat: number
          lng: number
          locality: string
          payment_timing: string
          skill: string
          start_time: string
          status?: string
          terms_version?: number
          tools_by: string
          wage: number
          wage_unit: string
          work_date: string
          workers_needed: number
        }
        Update: {
          address?: string
          contractor_id?: string | null
          contractor_name?: string
          created_at?: string
          demo_day_offset?: number | null
          description?: string
          end_time?: string
          id?: string
          is_demo?: boolean
          lat?: number
          lng?: number
          locality?: string
          payment_timing?: string
          skill?: string
          start_time?: string
          status?: string
          terms_version?: number
          tools_by?: string
          wage?: number
          wage_unit?: string
          work_date?: string
          workers_needed?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          job_id: string | null
          kind: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          job_id?: string | null
          kind: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          job_id?: string | null
          kind?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          availability: string | null
          created_at: string
          display_name: string
          expected_wage: number | null
          id: string
          is_demo: boolean
          locality: string | null
          skills: string[]
        }
        Insert: {
          availability?: string | null
          created_at?: string
          display_name?: string
          expected_wage?: number | null
          id: string
          is_demo?: boolean
          locality?: string | null
          skills?: string[]
        }
        Update: {
          availability?: string | null
          created_at?: string
          display_name?: string
          expected_wage?: number | null
          id?: string
          is_demo?: boolean
          locality?: string | null
          skills?: string[]
        }
        Relationships: []
      }
      saved_jobs: {
        Row: {
          created_at: string
          job_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          job_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          job_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      term_acceptances: {
        Row: {
          accepted_at: string
          id: string
          job_id: string
          party: string
          terms_version: number
          user_id: string
        }
        Insert: {
          accepted_at?: string
          id?: string
          job_id: string
          party: string
          terms_version: number
          user_id: string
        }
        Update: {
          accepted_at?: string
          id?: string
          job_id?: string
          party?: string
          terms_version?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "term_acceptances_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_current_terms: {
        Args: { _job: string; _version: number }
        Returns: undefined
      }
      apply_to_job: {
        Args: { _job: string; _version: number }
        Returns: string
      }
      confirm_worker: { Args: { _application: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_demo_user: { Args: { _user_id: string }; Returns: boolean }
      job_confirmed_counts: {
        Args: never
        Returns: {
          confirmed: number
          job_id: string
        }[]
      }
      job_terms_json: {
        Args: { j: Database["public"]["Tables"]["jobs"]["Row"] }
        Returns: Json
      }
      notify: {
        Args: {
          _body: string
          _job: string
          _kind: string
          _title: string
          _user: string
        }
        Returns: undefined
      }
      publish_job: { Args: { p: Json }; Returns: string }
      refresh_demo_jobs: { Args: { _contractor: string }; Returns: undefined }
      set_application_status: {
        Args: { _application: string; _status: string }
        Returns: undefined
      }
      set_job_status: {
        Args: { _job: string; _status: string }
        Returns: undefined
      }
      update_job_terms: { Args: { _job: string; p: Json }; Returns: number }
      validate_job_payload: { Args: { p: Json }; Returns: undefined }
    }
    Enums: {
      app_role: "worker" | "contractor" | "admin"
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
    Enums: {
      app_role: ["worker", "contractor", "admin"],
    },
  },
} as const
