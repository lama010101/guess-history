export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          created_at: string | null;
          updated_at: string | null;
          username: string | null;
          avatar_url: string | null;
          display_name: string | null;
          avatar_name: string | null;
          avatar_image_url: string | null;
          avatar_id: string | null;
          is_guest: boolean;
          earned_badges: string[] | null;
        };
        Insert: {
          id: string;
          created_at?: string | null;
          updated_at?: string | null;
          username?: string | null;
          avatar_url?: string | null;
          display_name?: string | null;
          avatar_name?: string | null;
          avatar_image_url?: string | null;
          avatar_id?: string | null;
          is_guest?: boolean;
          earned_badges?: string[] | null;
        };
        Update: {
          id?: string;
          created_at?: string | null;
          updated_at?: string | null;
          username?: string | null;
          avatar_url?: string | null;
          display_name?: string | null;
          avatar_name?: string | null;
          avatar_image_url?: string | null;
          avatar_id?: string | null;
          is_guest?: boolean;
          earned_badges?: string[] | null;
        };
      };

      avatars: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          description: string | null;
          birth_day: string | null;
          birth_city: string | null;
          birth_country: string | null;
          death_day: string | null;
          death_city: string | null;
          death_country: string | null;
          firebase_url: string;
          ready: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          description?: string | null;
          birth_day?: string | null;
          birth_city?: string | null;
          birth_country?: string | null;
          death_day?: string | null;
          death_city?: string | null;
          death_country?: string | null;
          firebase_url: string;
          ready?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
          description?: string | null;
          birth_day?: string | null;
          birth_city?: string | null;
          birth_country?: string | null;
          death_day?: string | null;
          death_city?: string | null;
          death_country?: string | null;
          firebase_url?: string;
          ready?: boolean | null;
          created_at?: string | null;
        };
      };

      user_metrics: {
        Row: {
          id: string;
          user_id: string;
          xp_total: number;
          overall_accuracy: number;
          games_played: number;
          created_at: string | null;
          updated_at: string | null;
          best_accuracy: number | null;
          perfect_games: number | null;
          global_rank: number | null;
          time_accuracy: number | null;
          location_accuracy: number | null;
          challenge_accuracy: number | null;
          year_bullseye: number | null;
          location_bullseye: number | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          xp_total?: number;
          overall_accuracy?: number;
          games_played?: number;
          created_at?: string | null;
          updated_at?: string | null;
          best_accuracy?: number | null;
          perfect_games?: number | null;
          global_rank?: number | null;
          time_accuracy?: number | null;
          location_accuracy?: number | null;
          challenge_accuracy?: number | null;
          year_bullseye?: number | null;
          location_bullseye?: number | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          xp_total?: number;
          overall_accuracy?: number;
          games_played?: number;
          created_at?: string | null;
          updated_at?: string | null;
          best_accuracy?: number | null;
          perfect_games?: number | null;
          global_rank?: number | null;
          time_accuracy?: number | null;
          location_accuracy?: number | null;
          challenge_accuracy?: number | null;
          year_bullseye?: number | null;
          location_bullseye?: number | null;
        };
      };

      settings: {
        Row: {
          id: string;
          value: unknown;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          value?: unknown;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          value?: unknown;
          updated_at?: string | null;
        };
      };

      game_sessions: {
        Row: {
          room_id: string;
          seed: string;
          image_ids: string[];
          started_at: string;
          current_round_number: number | null;
        };
        Insert: {
          room_id: string;
          seed: string;
          image_ids: string[];
          started_at?: string;
          current_round_number?: number | null;
        };
        Update: {
          room_id?: string;
          seed?: string;
          image_ids?: string[];
          started_at?: string;
          current_round_number?: number | null;
        };
      };

      room_rounds: {
        Row: {
          room_id: string;
          round_number: number;
          started_at: string;
          duration_sec: number;
        };
        Insert: {
          room_id: string;
          round_number: number;
          started_at?: string;
          duration_sec: number;
        };
        Update: {
          room_id?: string;
          round_number?: number;
          started_at?: string;
          duration_sec?: number;
        };
      };
      // Add other tables as needed
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
};
