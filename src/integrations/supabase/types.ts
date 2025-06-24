export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      avatars: {
        Row: {
          created_at: string | null
          id: string
          image_url: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string
          name?: string
        }
        Relationships: []
      }
      hints: {
        Row: {
          id: string
          image_id: string
          type: string
          category: string
          level: number
          text: string
          xp_cost: number
          accuracy_penalty: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          image_id: string
          type: string
          category: string
          level: number
          text: string
          xp_cost?: number
          accuracy_penalty?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          image_id?: string
          type?: string
          category?: string
          level?: number
          text?: string
          xp_cost?: number
          accuracy_penalty?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hints_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "images"
            referencedColumns: ["id"]
          }
        ]
      }
      hint_dependencies: {
        Row: {
          id: string
          hint_id: string
          required_hint_id: string
          created_at: string
        }
        Insert: {
          id?: string
          hint_id: string
          required_hint_id: string
          created_at?: string
        }
        Update: {
          id?: string
          hint_id?: string
          required_hint_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hint_dependencies_hint_id_fkey"
            columns: ["hint_id"]
            isOneToOne: false
            referencedRelation: "hints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hint_dependencies_required_hint_id_fkey"
            columns: ["required_hint_id"]
            isOneToOne: false
            referencedRelation: "hints"
            referencedColumns: ["id"]
          }
        ]
      }
      hint_purchases: {
        Row: {
          id: string
          user_id: string
          hint_id: string
          image_id: string
          game_id: string | null
          round_index: number | null
          xp_cost: number
          accuracy_penalty: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          hint_id: string
          image_id: string
          game_id?: string | null
          round_index?: number | null
          xp_cost?: number
          accuracy_penalty?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          hint_id?: string
          image_id?: string
          game_id?: string | null
          round_index?: number | null
          xp_cost?: number
          accuracy_penalty?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hint_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hint_purchases_hint_id_fkey"
            columns: ["hint_id"]
            isOneToOne: false
            referencedRelation: "hints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hint_purchases_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hint_purchases_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          }
        ]
      }
      friends: {
        Row: {
          created_at: string | null
          friend_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          friend_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          friend_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      game_rounds: {
        Row: {
          created_at: string | null
          game_id: string
          id: string
          image_id: string
          round_index: number
        }
        Insert: {
          created_at?: string | null
          game_id: string
          id?: string
          image_id: string
          round_index: number
        }
        Update: {
          created_at?: string | null
          game_id?: string
          id?: string
          image_id?: string
          round_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_rounds_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_rounds_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "images"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          completed: boolean | null
          created_at: string | null
          created_by: string | null
          current_round: number | null
          guest_id: string | null
          id: string
          mode: string
          round_count: number | null
          score: number | null
          user_id: string | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          created_by?: string | null
          current_round?: number | null
          guest_id?: string | null
          id?: string
          mode: string
          round_count?: number | null
          score?: number | null
          user_id?: string | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          created_by?: string | null
          current_round?: number | null
          guest_id?: string | null
          id?: string
          mode?: string
          round_count?: number | null
          score?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      guesses: {
        Row: {
          accuracy: number | null
          created_at: string | null
          game_id: string
          guess_lat: number
          guess_lon: number
          guess_year: number
          id: string
          image_id: string
          is_fallback_location: boolean | null
          round_index: number
          user_id: string | null
        }
        Insert: {
          accuracy?: number | null
          created_at?: string | null
          game_id: string
          guess_lat: number
          guess_lon: number
          guess_year: number
          id?: string
          image_id: string
          is_fallback_location?: boolean | null
          round_index: number
          user_id?: string | null
        }
        Update: {
          accuracy?: number | null
          created_at?: string | null
          game_id?: string
          guess_lat?: number
          guess_lon?: number
          guess_year?: number
          id?: string
          image_id?: string
          is_fallback_location?: boolean | null
          round_index?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guesses_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guesses_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "images"
            referencedColumns: ["id"]
          },
        ]
      }
      images: {
        Row: {
          accuracy_score: Json | null
          ai_generated: boolean | null
          created_at: string | null
          description: string
          id: string
          image_url: string
          latitude: number
          location_name: string
          longitude: number
          mature_content: boolean | null
          ready: boolean | null
          title: string
          true_event: boolean | null
          year: number
        }
        Insert: {
          accuracy_score?: Json | null
          ai_generated?: boolean | null
          created_at?: string | null
          description: string
          id?: string
          image_url: string
          latitude: number
          location_name: string
          longitude: number
          mature_content?: boolean | null
          ready?: boolean | null
          title: string
          true_event?: boolean | null
          year: number
        }
        Update: {
          accuracy_score?: Json | null
          ai_generated?: boolean | null
          created_at?: string | null
          description?: string
          id?: string
          image_url?: string
          latitude?: number
          location_name?: string
          longitude?: number
          mature_content?: boolean | null
          ready?: boolean | null
          title?: string
          true_event?: boolean | null
          year?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_image_url: string | null
          avatar_name: string | null
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          earned_badges: string[] | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_image_url?: string | null
          avatar_name?: string | null
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          earned_badges?: string[] | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_image_url?: string | null
          avatar_name?: string | null
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          earned_badges?: string[] | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          id: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          id: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          id?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      },
      badges: {
        Row: {
          id: string
          name: string
          description: string
          icon_name: string
          category: string
          difficulty: string
          requirement_code: string
          requirement_value: number
          image_url?: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          icon_name: string
          category: string
          difficulty: string
          requirement_code: string
          requirement_value: number
          image_url?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          icon_name?: string
          category?: string
          difficulty?: string
          requirement_code?: string
          requirement_value?: number
          image_url?: string
          created_at?: string
        }
        Relationships: []
      },
      user_metrics: {
        Row: {
          id: string
          user_id: string
          xp_total: number
          overall_accuracy: number
          games_played: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          xp_total: number
          overall_accuracy: number
          games_played: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          xp_total?: number
          overall_accuracy?: number
          games_played?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
