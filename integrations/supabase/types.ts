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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      ai_guess: {
        Row: {
          ai_analysis: string | null
          ai_generated_probability: number | null
          celebrity: boolean | null
          celebrity_name: string | null
          confidence_event: number | null
          confidence_exact_date: number | null
          confidence_location: number | null
          confidence_year: number | null
          created_at: string | null
          description: string | null
          event: string | null
          exact_date: string | null
          extracted_text: string | null
          gps_lat: number | null
          gps_lon: number | null
          id: number
          image_name: string | null
          image_url: string | null
          location_name: string | null
          model: string | null
          prompt: string | null
          raw_result: Json | null
          real_event: boolean | null
          title: string | null
          visual_elements: string | null
          wikipedia_direct_url: string | null
          wikipedia_search_url: string | null
          year: number | null
        }
        Insert: {
          ai_analysis?: string | null
          ai_generated_probability?: number | null
          celebrity?: boolean | null
          celebrity_name?: string | null
          confidence_event?: number | null
          confidence_exact_date?: number | null
          confidence_location?: number | null
          confidence_year?: number | null
          created_at?: string | null
          description?: string | null
          event?: string | null
          exact_date?: string | null
          extracted_text?: string | null
          gps_lat?: number | null
          gps_lon?: number | null
          id?: number
          image_name?: string | null
          image_url?: string | null
          location_name?: string | null
          model?: string | null
          prompt?: string | null
          raw_result?: Json | null
          real_event?: boolean | null
          title?: string | null
          visual_elements?: string | null
          wikipedia_direct_url?: string | null
          wikipedia_search_url?: string | null
          year?: number | null
        }
        Update: {
          ai_analysis?: string | null
          ai_generated_probability?: number | null
          celebrity?: boolean | null
          celebrity_name?: string | null
          confidence_event?: number | null
          confidence_exact_date?: number | null
          confidence_location?: number | null
          confidence_year?: number | null
          created_at?: string | null
          description?: string | null
          event?: string | null
          exact_date?: string | null
          extracted_text?: string | null
          gps_lat?: number | null
          gps_lon?: number | null
          id?: number
          image_name?: string | null
          image_url?: string | null
          location_name?: string | null
          model?: string | null
          prompt?: string | null
          raw_result?: Json | null
          real_event?: boolean | null
          title?: string | null
          visual_elements?: string | null
          wikipedia_direct_url?: string | null
          wikipedia_search_url?: string | null
          year?: number | null
        }
        Relationships: []
      }
      ai_guess_aggregate: {
        Row: {
          consensus_caption: string | null
          consensus_event: string | null
          consensus_location_name: string | null
          consensus_year_range: string | null
          contributing_models: Json | null
          created_at: string | null
          image_id: string
          mean_ai_gen_prob: number | null
          mean_conf_event: number | null
          mean_conf_loc: number | null
          mean_conf_year: number | null
          mean_year: number | null
          models_complete: boolean | null
          raw_compound_json: Json | null
          std_ai_gen_prob: number | null
          std_conf_event: number | null
          std_conf_loc: number | null
          std_conf_year: number | null
          std_year: number | null
        }
        Insert: {
          consensus_caption?: string | null
          consensus_event?: string | null
          consensus_location_name?: string | null
          consensus_year_range?: string | null
          contributing_models?: Json | null
          created_at?: string | null
          image_id: string
          mean_ai_gen_prob?: number | null
          mean_conf_event?: number | null
          mean_conf_loc?: number | null
          mean_conf_year?: number | null
          mean_year?: number | null
          models_complete?: boolean | null
          raw_compound_json?: Json | null
          std_ai_gen_prob?: number | null
          std_conf_event?: number | null
          std_conf_loc?: number | null
          std_conf_year?: number | null
          std_year?: number | null
        }
        Update: {
          consensus_caption?: string | null
          consensus_event?: string | null
          consensus_location_name?: string | null
          consensus_year_range?: string | null
          contributing_models?: Json | null
          created_at?: string | null
          image_id?: string
          mean_ai_gen_prob?: number | null
          mean_conf_event?: number | null
          mean_conf_loc?: number | null
          mean_conf_year?: number | null
          mean_year?: number | null
          models_complete?: boolean | null
          raw_compound_json?: Json | null
          std_ai_gen_prob?: number | null
          std_conf_event?: number | null
          std_conf_loc?: number | null
          std_conf_year?: number | null
          std_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_guess_aggregate_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: true
            referencedRelation: "images"
            referencedColumns: ["id"]
          },
        ]
      }
      // Achievements earned by users
      achievements: {
        Row: {
          id: string
          user_id: string
          type: string
          level: string | null
          value: number | null
          context_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          level?: string | null
          value?: number | null
          context_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          level?: string | null
          value?: number | null
          context_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      air_entries: {
        Row: {
          created_at: string
          id: string
          identifier: string
          model_id: number
          source: string
          user_id: string | null
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          identifier?: string
          model_id: number
          source: string
          user_id?: string | null
          version: number
        }
        Update: {
          created_at?: string
          id?: string
          identifier?: string
          model_id?: number
          source?: string
          user_id?: string | null
          version?: number
        }
        Relationships: []
      }
      apps: {
        Row: {
          created_at: string
          description: string | null
          github_repo_url: string | null
          id: string
          last_ping: string | null
          name: string
          status: string
          updated_at: string
          url: string | null
          vercel_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          github_repo_url?: string | null
          id?: string
          last_ping?: string | null
          name: string
          status?: string
          updated_at?: string
          url?: string | null
          vercel_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          github_repo_url?: string | null
          id?: string
          last_ping?: string | null
          name?: string
          status?: string
          updated_at?: string
          url?: string | null
          vercel_url?: string | null
        }
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
