export * from '@/integrations/supabase/types';
        Relationships: []
      }
      auth_consensus: {
        Row: {
          created_at: string | null
          details: Json | null
          event_id: string | null
          evidence_hash: string | null
          id: string
          method: string
          score: number | null
          updated_at: string | null
          verdict: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          event_id?: string | null
          evidence_hash?: string | null
          id?: string
          method: string
          score?: number | null
          updated_at?: string | null
          verdict?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          event_id?: string | null
          evidence_hash?: string | null
          id?: string
          method?: string
          score?: number | null
          updated_at?: string | null
          verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auth_consensus_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auth_consensus_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "prompts_latest"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auth_consensus_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "prompts_public"
            referencedColumns: ["id"]
          },
        ]
      }
      
      // Hints purchased per round (from migration 20250723165900_create_hint_system_v2.sql)
      round_hints: {
        Row: {
          id: string
          round_id: string
          user_id: string
          hint_id: string
          purchased_at: string
          cost_xp: number
          cost_accuracy: number
        }
        Insert: {
          id?: string
          round_id: string
          user_id: string
          hint_id: string
          purchased_at?: string
          cost_xp: number
          cost_accuracy: number
        }
        Update: {
          id?: string
          round_id?: string
          user_id?: string
          hint_id?: string
          purchased_at?: string
          cost_xp?: number
          cost_accuracy?: number
        }
        Relationships: [
          {
            foreignKeyName: "round_hints_hint_id_fkey"
            columns: ["hint_id"]
            isOneToOne: false
            referencedRelation: "hints"
            referencedColumns: ["id"]
          },
        ]
      }

      // Minimal profiles schema with Level Up fields
      profiles: {
        Row: {
          id: string
          created_at: string | null
          updated_at: string | null
          display_name: string | null
          avatar_image_url: string | null
          avatar_name: string | null
          avatar_url: string | null
          is_guest: boolean
          level_up_best_level: number
        }
        Insert: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
          display_name?: string | null
          avatar_image_url?: string | null
          avatar_name?: string | null
          avatar_url?: string | null
          is_guest?: boolean
          level_up_best_level?: number
        }
        Update: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
          display_name?: string | null
          avatar_image_url?: string | null
          avatar_name?: string | null
          avatar_url?: string | null
          is_guest?: boolean
          level_up_best_level?: number
        }
        Relationships: []
      }

      // Minimal games schema with level field
      games: {
        Row: {
          id: string
          created_at: string | null
          created_by: string | null
          mode: string | null
          round_count: number | null
          current_round: number | null
          score: number | null
          user_id: string | null
          guest_id: string | null
          level: number
        }
        Insert: {
          id?: string
          created_at?: string | null
          created_by?: string | null
          mode?: string | null
          round_count?: number | null
          current_round?: number | null
          score?: number | null
          user_id?: string | null
          guest_id?: string | null
          level?: number
        }
        Update: {
          id?: string
          created_at?: string | null
          created_by?: string | null
          mode?: string | null
          round_count?: number | null
          current_round?: number | null
          score?: number | null
          user_id?: string | null
          guest_id?: string | null
          level?: number
        }
        Relationships: []
      }

      // ... The remainder of the file continues with the full generated schema ...
    }
    Views: {}
    Functions: {
      // Full generated function definitions
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
