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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      companies: {
        Row: {
          cnpj: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      department_activities: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          deadline: string | null
          deadline_status: Database["public"]["Enums"]["deadline_status"] | null
          department_id: string
          description: string | null
          goal_date: string | null
          id: string
          is_recurring: boolean | null
          last_recurrence_date: string | null
          name: string
          order_index: number | null
          parent_activity_id: string | null
          priority: string | null
          recurrence_active: boolean | null
          recurrence_day: number | null
          recurrence_type: string | null
          scheduled_date: string | null
          status: Database["public"]["Enums"]["activity_status"] | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          deadline?: string | null
          deadline_status?:
            | Database["public"]["Enums"]["deadline_status"]
            | null
          department_id: string
          description?: string | null
          goal_date?: string | null
          id?: string
          is_recurring?: boolean | null
          last_recurrence_date?: string | null
          name: string
          order_index?: number | null
          parent_activity_id?: string | null
          priority?: string | null
          recurrence_active?: boolean | null
          recurrence_day?: number | null
          recurrence_type?: string | null
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["activity_status"] | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          deadline?: string | null
          deadline_status?:
            | Database["public"]["Enums"]["deadline_status"]
            | null
          department_id?: string
          description?: string | null
          goal_date?: string | null
          id?: string
          is_recurring?: boolean | null
          last_recurrence_date?: string | null
          name?: string
          order_index?: number | null
          parent_activity_id?: string | null
          priority?: string | null
          recurrence_active?: boolean | null
          recurrence_day?: number | null
          recurrence_type?: string | null
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["activity_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_activities_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_activities_parent_activity_id_fkey"
            columns: ["parent_activity_id"]
            isOneToOne: false
            referencedRelation: "department_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      department_activity_assignees: {
        Row: {
          activity_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_activity_assignees_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "department_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      department_activity_checklist: {
        Row: {
          activity_id: string
          completed: boolean | null
          created_at: string
          id: string
          order_index: number | null
          title: string
          updated_at: string
        }
        Insert: {
          activity_id: string
          completed?: boolean | null
          created_at?: string
          id?: string
          order_index?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          activity_id?: string
          completed?: boolean | null
          created_at?: string
          id?: string
          order_index?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_activity_checklist_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "department_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      department_activity_comments: {
        Row: {
          activity_id: string
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_id: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_activity_comments_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "department_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      department_activity_history: {
        Row: {
          action: string
          activity_id: string
          created_at: string
          field_name: string | null
          id: string
          new_value: string | null
          old_value: string | null
          user_id: string
        }
        Insert: {
          action: string
          activity_id: string
          created_at?: string
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          user_id: string
        }
        Update: {
          action?: string
          activity_id?: string
          created_at?: string
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_activity_history_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "department_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      department_activity_notes: {
        Row: {
          activity_id: string
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_id: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_activity_notes_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "department_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          color: string | null
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          activity_id: string | null
          created_at: string
          created_by: string
          department_id: string | null
          description: string | null
          id: string
          project_id: string | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          activity_id?: string | null
          created_at?: string
          created_by: string
          department_id?: string | null
          description?: string | null
          id?: string
          project_id?: string | null
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          activity_id?: string | null
          created_at?: string
          created_by?: string
          department_id?: string | null
          description?: string | null
          id?: string
          project_id?: string | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_activities: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          deadline: string | null
          deadline_status: Database["public"]["Enums"]["deadline_status"] | null
          description: string | null
          goal_date: string | null
          id: string
          kanban_column: string | null
          name: string
          order_index: number | null
          priority: string | null
          project_id: string
          scheduled_date: string | null
          status: Database["public"]["Enums"]["activity_status"] | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          deadline?: string | null
          deadline_status?:
            | Database["public"]["Enums"]["deadline_status"]
            | null
          description?: string | null
          goal_date?: string | null
          id?: string
          kanban_column?: string | null
          name: string
          order_index?: number | null
          priority?: string | null
          project_id: string
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["activity_status"] | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          deadline?: string | null
          deadline_status?:
            | Database["public"]["Enums"]["deadline_status"]
            | null
          description?: string | null
          goal_date?: string | null
          id?: string
          kanban_column?: string | null
          name?: string
          order_index?: number | null
          priority?: string | null
          project_id?: string
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["activity_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_activity_assignees: {
        Row: {
          activity_id: string
          created_at: string
          department_id: string | null
          id: string
          user_id: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          department_id?: string | null
          id?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          department_id?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_activity_assignees_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "project_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_activity_assignees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      project_activity_checklist: {
        Row: {
          activity_id: string
          completed: boolean | null
          created_at: string
          id: string
          order_index: number | null
          title: string
          updated_at: string
        }
        Insert: {
          activity_id: string
          completed?: boolean | null
          created_at?: string
          id?: string
          order_index?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          activity_id?: string
          completed?: boolean | null
          created_at?: string
          id?: string
          order_index?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_activity_checklist_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "project_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      project_activity_comments: {
        Row: {
          activity_id: string
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_id: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_activity_comments_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "project_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      project_activity_history: {
        Row: {
          action: string
          activity_id: string
          created_at: string
          field_name: string | null
          id: string
          new_value: string | null
          old_value: string | null
          user_id: string
        }
        Insert: {
          action: string
          activity_id: string
          created_at?: string
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          user_id: string
        }
        Update: {
          action?: string
          activity_id?: string
          created_at?: string
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_activity_history_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "project_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      project_activity_notes: {
        Row: {
          activity_id: string
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_id: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_activity_notes_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "project_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          created_at: string
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          color: string | null
          company_id: string
          completed_activities: number | null
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          progress: number | null
          start_date: string | null
          status: string | null
          total_activities: number | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          company_id: string
          completed_activities?: number | null
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          progress?: number | null
          start_date?: string | null
          status?: string | null
          total_activities?: number | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          company_id?: string
          completed_activities?: number | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          progress?: number | null
          start_date?: string | null
          status?: string | null
          total_activities?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_companies: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_departments: {
        Row: {
          created_at: string
          department_id: string
          id: string
          is_manager: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string
          department_id: string
          id?: string
          is_manager?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string
          department_id?: string
          id?: string
          is_manager?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_departments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_scores: {
        Row: {
          beat_goal_count: number
          company_id: string
          created_at: string
          current_score: number
          id: string
          on_time_count: number
          total_cycles_completed: number
          updated_at: string
          user_id: string
        }
        Insert: {
          beat_goal_count?: number
          company_id: string
          created_at?: string
          current_score?: number
          id?: string
          on_time_count?: number
          total_cycles_completed?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          beat_goal_count?: number
          company_id?: string
          created_at?: string
          current_score?: number
          id?: string
          on_time_count?: number
          total_cycles_completed?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_scores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_user_score: {
        Args: {
          _company_id: string
          _is_beat_goal?: boolean
          _points: number
          _user_id: string
        }
        Returns: undefined
      }
      get_project_indicators_for_user: {
        Args: never
        Returns: {
          beat_goal_count: number
          company_id: string
          completed_count: number
          completed_late_count: number
          completed_on_time_count: number
          late_count: number
          on_time_count: number
          progress: number
          project_id: string
          project_name: string
          total_activities: number
        }[]
      }
      get_user_company_role: {
        Args: { _company_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      reset_user_score: {
        Args: { _company_id: string; _user_id: string }
        Returns: undefined
      }
      user_belongs_to_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      user_belongs_to_department: {
        Args: { _department_id: string; _user_id: string }
        Returns: boolean
      }
      user_is_project_member_or_admin: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      activity_status: "pendente" | "em_andamento" | "concluida" | "cancelada"
      app_role: "admin" | "gestor" | "colaborador"
      deadline_status:
        | "no_prazo"
        | "fora_do_prazo"
        | "concluido_no_prazo"
        | "concluido_atrasado"
        | "bateu_meta"
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
    Enums: {
      activity_status: ["pendente", "em_andamento", "concluida", "cancelada"],
      app_role: ["admin", "gestor", "colaborador"],
      deadline_status: [
        "no_prazo",
        "fora_do_prazo",
        "concluido_no_prazo",
        "concluido_atrasado",
        "bateu_meta",
      ],
    },
  },
} as const
