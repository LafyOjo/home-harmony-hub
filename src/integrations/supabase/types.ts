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
      applications: {
        Row: {
          apply_link_id: string | null
          created_at: string | null
          id: string
          listing_id: string
          status: Database["public"]["Enums"]["application_status"] | null
          submitted_at: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          apply_link_id?: string | null
          created_at?: string | null
          id?: string
          listing_id: string
          status?: Database["public"]["Enums"]["application_status"] | null
          submitted_at?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          apply_link_id?: string | null
          created_at?: string | null
          id?: string
          listing_id?: string
          status?: Database["public"]["Enums"]["application_status"] | null
          submitted_at?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_apply_link_id_fkey"
            columns: ["apply_link_id"]
            isOneToOne: false
            referencedRelation: "listing_apply_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      consents: {
        Row: {
          accepted_at: string | null
          consent_type: string
          id: string
          user_id: string
          version: string
        }
        Insert: {
          accepted_at?: string | null
          consent_type: string
          id?: string
          user_id: string
          version: string
        }
        Update: {
          accepted_at?: string | null
          consent_type?: string
          id?: string
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          category: string
          content_type: string | null
          created_at: string | null
          file_name: string
          file_size: number | null
          id: string
          storage_key: string
          user_id: string
        }
        Insert: {
          category: string
          content_type?: string | null
          created_at?: string | null
          file_name: string
          file_size?: number | null
          id?: string
          storage_key: string
          user_id: string
        }
        Update: {
          category?: string
          content_type?: string | null
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          id?: string
          storage_key?: string
          user_id?: string
        }
        Relationships: []
      }
      guarantors: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          relationship: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          relationship?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          relationship?: string | null
          user_id?: string
        }
        Relationships: []
      }
      household_members: {
        Row: {
          created_at: string | null
          id: string
          name: string
          relationship: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          relationship: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          relationship?: string
          user_id?: string
        }
        Relationships: []
      }
      listing_apply_links: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          listing_id: string
          token: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          listing_id: string
          token?: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          listing_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_apply_links_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          address: string
          available_from: string | null
          created_at: string | null
          deposit: number | null
          description: string | null
          id: string
          is_active: boolean | null
          owner_id: string
          postcode: string
          rent_pcm: number
          title: string
          updated_at: string | null
        }
        Insert: {
          address: string
          available_from?: string | null
          created_at?: string | null
          deposit?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          owner_id: string
          postcode: string
          rent_pcm: number
          title: string
          updated_at?: string | null
        }
        Update: {
          address?: string
          available_from?: string | null
          created_at?: string | null
          deposit?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          owner_id?: string
          postcode?: string
          rent_pcm?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          application_id: string
          content: string
          created_at: string | null
          id: string
          sender_id: string
        }
        Insert: {
          application_id: string
          content: string
          created_at?: string | null
          id?: string
          sender_id: string
        }
        Update: {
          application_id?: string
          content?: string
          created_at?: string | null
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      owner_notes: {
        Row: {
          application_id: string
          author_id: string
          content: string
          created_at: string | null
          id: string
        }
        Insert: {
          application_id: string
          author_id: string
          content: string
          created_at?: string | null
          id?: string
        }
        Update: {
          application_id?: string
          author_id?: string
          content?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_notes_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          date_of_birth: string | null
          email: string
          full_name: string | null
          id: string
          move_in_preference: string | null
          phone: string | null
          profile_completed: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date_of_birth?: string | null
          email: string
          full_name?: string | null
          id?: string
          move_in_preference?: string | null
          phone?: string | null
          profile_completed?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date_of_birth?: string | null
          email?: string
          full_name?: string | null
          id?: string
          move_in_preference?: string | null
          phone?: string | null
          profile_completed?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reference_requests: {
        Row: {
          created_at: string | null
          id: string
          referee_email: string
          referee_name: string
          status: string | null
          token: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          referee_email: string
          referee_name: string
          status?: string | null
          token?: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          referee_email?: string
          referee_name?: string
          status?: string | null
          token?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      reference_responses: {
        Row: {
          id: string
          request_id: string
          response_data: Json
          submitted_at: string | null
        }
        Insert: {
          id?: string
          request_id: string
          response_data: Json
          submitted_at?: string | null
        }
        Update: {
          id?: string
          request_id?: string
          response_data?: Json
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reference_responses_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "reference_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_addresses: {
        Row: {
          address_line_1: string
          address_line_2: string | null
          city: string
          created_at: string | null
          from_date: string
          id: string
          is_current: boolean | null
          postcode: string
          to_date: string | null
          user_id: string
        }
        Insert: {
          address_line_1: string
          address_line_2?: string | null
          city: string
          created_at?: string | null
          from_date: string
          id?: string
          is_current?: boolean | null
          postcode: string
          to_date?: string | null
          user_id: string
        }
        Update: {
          address_line_1?: string
          address_line_2?: string | null
          city?: string
          created_at?: string | null
          from_date?: string
          id?: string
          is_current?: boolean | null
          postcode?: string
          to_date?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tenant_employment: {
        Row: {
          annual_income: number | null
          created_at: string | null
          employer_name: string
          id: string
          job_title: string
          start_date: string
          user_id: string
        }
        Insert: {
          annual_income?: number | null
          created_at?: string | null
          employer_name: string
          id?: string
          job_title: string
          start_date: string
          user_id: string
        }
        Update: {
          annual_income?: number | null
          created_at?: string | null
          employer_name?: string
          id?: string
          job_title?: string
          start_date?: string
          user_id?: string
        }
        Relationships: []
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "tenant" | "landlord" | "agent" | "admin"
      application_status:
        | "draft"
        | "submitted"
        | "reviewed"
        | "shortlisted"
        | "offered"
        | "accepted"
        | "rejected"
        | "withdrawn"
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
      app_role: ["tenant", "landlord", "agent", "admin"],
      application_status: [
        "draft",
        "submitted",
        "reviewed",
        "shortlisted",
        "offered",
        "accepted",
        "rejected",
        "withdrawn",
      ],
    },
  },
} as const
