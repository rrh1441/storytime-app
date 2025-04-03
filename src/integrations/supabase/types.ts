export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      stories: {
        Row: {
          age_range: string | null
          characters: Json | null
          content: string | null
          cover_image: string | null
          created_at: string
          educational_elements: string[] | null
          id: string
          is_public: boolean | null
          themes: string[] | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age_range?: string | null
          characters?: Json | null
          content?: string | null
          cover_image?: string | null
          created_at?: string
          educational_elements?: string[] | null
          id?: string
          is_public?: boolean | null
          themes?: string[] | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age_range?: string | null
          characters?: Json | null
          content?: string | null
          cover_image?: string | null
          created_at?: string
          educational_elements?: string[] | null
          id?: string
          is_public?: boolean | null
          themes?: string[] | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      story_readings: {
        Row: {
          audio_url: string | null
          created_at: string
          duration: number | null
          elevenlabs_professional_voice_id: string | null
          id: string
          story_id: string
          voice_profile_id: string | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          duration?: number | null
          elevenlabs_professional_voice_id?: string | null
          id?: string
          story_id: string
          voice_profile_id?: string | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          duration?: number | null
          elevenlabs_professional_voice_id?: string | null
          id?: string
          story_id?: string
          voice_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "story_readings_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_readings_voice_profile_id_fkey"
            columns: ["voice_profile_id"]
            isOneToOne: false
            referencedRelation: "voice_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      storybook_pages: {
        Row: {
          created_at: string
          id: string
          image_prompt: string | null
          image_status: string
          image_url: string | null
          page_number: number
          storybook_id: string
          text: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_prompt?: string | null
          image_status?: string
          image_url?: string | null
          page_number: number
          storybook_id: string
          text?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_prompt?: string | null
          image_status?: string
          image_url?: string | null
          page_number?: number
          storybook_id?: string
          text?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "storybook_pages_storybook_id_fkey"
            columns: ["storybook_id"]
            isOneToOne: false
            referencedRelation: "storybooks"
            referencedColumns: ["id"]
          },
        ]
      }
      storybooks: {
        Row: {
          created_at: string
          educational_focus: string | null
          id: string
          main_character: string | null
          reference_image_url: string | null
          theme: string
          title: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          educational_focus?: string | null
          id?: string
          main_character?: string | null
          reference_image_url?: string | null
          theme: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          educational_focus?: string | null
          id?: string
          main_character?: string | null
          reference_image_url?: string | null
          theme?: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          active_plan_price_id: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          story_credits: number
          stripe_customer_id: string | null
          subscription_current_period_end: string | null
          subscription_status: string | null
          subscription_tier: string | null
        }
        Insert: {
          active_plan_price_id?: string | null
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
          story_credits?: number
          stripe_customer_id?: string | null
          subscription_current_period_end?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
        }
        Update: {
          active_plan_price_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          story_credits?: number
          stripe_customer_id?: string | null
          subscription_current_period_end?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
        }
        Relationships: []
      }
      voice_profiles: {
        Row: {
          created_at: string
          elevenlabs_voice_id: string | null
          id: string
          is_default: boolean | null
          name: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          elevenlabs_voice_id?: string | null
          id?: string
          is_default?: boolean | null
          name?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          elevenlabs_voice_id?: string | null
          id?: string
          is_default?: boolean | null
          name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      subscription_status_enum:
        | "active"
        | "canceled"
        | "past_due"
        | "incomplete"
        | "trialing"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
