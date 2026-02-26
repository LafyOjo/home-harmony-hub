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
      application_documents: {
        Row: {
          application_id: string
          created_at: string | null
          document_type: string
          file_name: string
          id: string
          storage_key: string
          uploaded_by: string
        }
        Insert: {
          application_id: string
          created_at?: string | null
          document_type: string
          file_name: string
          id?: string
          storage_key: string
          uploaded_by: string
        }
        Update: {
          application_id?: string
          created_at?: string | null
          document_type?: string
          file_name?: string
          id?: string
          storage_key?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_references: {
        Row: {
          application_id: string
          created_at: string | null
          id: string
          reference_request_id: string
        }
        Insert: {
          application_id: string
          created_at?: string | null
          id?: string
          reference_request_id: string
        }
        Update: {
          application_id?: string
          created_at?: string | null
          id?: string
          reference_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_references_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_references_reference_request_id_fkey"
            columns: ["reference_request_id"]
            isOneToOne: false
            referencedRelation: "reference_requests"
            referencedColumns: ["id"]
          },
        ]
      }
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
      complaints: {
        Row: {
          attachments: Json | null
          category: string
          created_at: string | null
          description: string
          id: string
          priority: string
          resolved_at: string | null
          response: string | null
          status: string
          subject: string
          submitted_by: string
          tenancy_id: string
          updated_at: string | null
        }
        Insert: {
          attachments?: Json | null
          category: string
          created_at?: string | null
          description: string
          id?: string
          priority?: string
          resolved_at?: string | null
          response?: string | null
          status?: string
          subject: string
          submitted_by: string
          tenancy_id: string
          updated_at?: string | null
        }
        Update: {
          attachments?: Json | null
          category?: string
          created_at?: string | null
          description?: string
          id?: string
          priority?: string
          resolved_at?: string | null
          response?: string | null
          status?: string
          subject?: string
          submitted_by?: string
          tenancy_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "complaints_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancies"
            referencedColumns: ["id"]
          },
        ]
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
      contracts: {
        Row: {
          contract_type: string
          created_at: string | null
          id: string
          is_uploaded: boolean | null
          landlord_signature_ip: string | null
          landlord_signature_name: string | null
          landlord_signed_at: string | null
          lease_content: string | null
          notes: string | null
          status: string
          storage_key: string | null
          tenancy_id: string
          tenant_signature_ip: string | null
          tenant_signature_name: string | null
          tenant_signed_at: string | null
          title: string
          updated_at: string | null
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          contract_type?: string
          created_at?: string | null
          id?: string
          is_uploaded?: boolean | null
          landlord_signature_ip?: string | null
          landlord_signature_name?: string | null
          landlord_signed_at?: string | null
          lease_content?: string | null
          notes?: string | null
          status?: string
          storage_key?: string | null
          tenancy_id: string
          tenant_signature_ip?: string | null
          tenant_signature_name?: string | null
          tenant_signed_at?: string | null
          title: string
          updated_at?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          contract_type?: string
          created_at?: string | null
          id?: string
          is_uploaded?: boolean | null
          landlord_signature_ip?: string | null
          landlord_signature_name?: string | null
          landlord_signed_at?: string | null
          lease_content?: string | null
          notes?: string | null
          status?: string
          storage_key?: string | null
          tenancy_id?: string
          tenant_signature_ip?: string | null
          tenant_signature_name?: string | null
          tenant_signed_at?: string | null
          title?: string
          updated_at?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancies"
            referencedColumns: ["id"]
          },
        ]
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
      listing_photos: {
        Row: {
          created_at: string | null
          display_order: number
          id: string
          listing_id: string
          storage_key: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number
          id?: string
          listing_id: string
          storage_key: string
        }
        Update: {
          created_at?: string | null
          display_order?: number
          id?: string
          listing_id?: string
          storage_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_photos_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_tenants: {
        Row: {
          added_by: string
          created_at: string | null
          id: string
          listing_id: string
          tenant_email: string | null
          tenant_name: string
          tenant_user_id: string | null
          verification_status: string
        }
        Insert: {
          added_by: string
          created_at?: string | null
          id?: string
          listing_id: string
          tenant_email?: string | null
          tenant_name: string
          tenant_user_id?: string | null
          verification_status?: string
        }
        Update: {
          added_by?: string
          created_at?: string | null
          id?: string
          listing_id?: string
          tenant_email?: string | null
          tenant_name?: string
          tenant_user_id?: string | null
          verification_status?: string
        }
        Relationships: []
      }
      listings: {
        Row: {
          address: string
          available_from: string | null
          bathrooms: number | null
          bedrooms: number | null
          created_at: string | null
          deposit: number | null
          description: string | null
          epc_rating: string | null
          floor_plan_key: string | null
          furnished: string | null
          garden: string | null
          id: string
          is_active: boolean | null
          owner_id: string
          parking: string | null
          postcode: string
          property_type: string | null
          rent_pcm: number
          title: string
          updated_at: string | null
        }
        Insert: {
          address: string
          available_from?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string | null
          deposit?: number | null
          description?: string | null
          epc_rating?: string | null
          floor_plan_key?: string | null
          furnished?: string | null
          garden?: string | null
          id?: string
          is_active?: boolean | null
          owner_id: string
          parking?: string | null
          postcode: string
          property_type?: string | null
          rent_pcm: number
          title: string
          updated_at?: string | null
        }
        Update: {
          address?: string
          available_from?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string | null
          deposit?: number | null
          description?: string | null
          epc_rating?: string | null
          floor_plan_key?: string | null
          furnished?: string | null
          garden?: string | null
          id?: string
          is_active?: boolean | null
          owner_id?: string
          parking?: string | null
          postcode?: string
          property_type?: string | null
          rent_pcm?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      maintenance_requests: {
        Row: {
          assigned_worker_id: string | null
          category: string
          completed_at: string | null
          completion_notes: string | null
          created_at: string | null
          description: string
          id: string
          photos: Json | null
          priority: string
          scheduled_date: string | null
          scheduled_time_window: string | null
          status: string
          submitted_by: string
          tenancy_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_worker_id?: string | null
          category?: string
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string | null
          description: string
          id?: string
          photos?: Json | null
          priority?: string
          scheduled_date?: string | null
          scheduled_time_window?: string | null
          status?: string
          submitted_by: string
          tenancy_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_worker_id?: string | null
          category?: string
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string | null
          description?: string
          id?: string
          photos?: Json | null
          priority?: string
          scheduled_date?: string | null
          scheduled_time_window?: string | null
          status?: string
          submitted_by?: string
          tenancy_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_assigned_worker_id_fkey"
            columns: ["assigned_worker_id"]
            isOneToOne: false
            referencedRelation: "maintenance_workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancies"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_workers: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          landlord_id: string
          name: string
          notes: string | null
          phone: string | null
          specialty: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          landlord_id: string
          name: string
          notes?: string | null
          phone?: string | null
          specialty?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          landlord_id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          specialty?: string | null
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
      policy_consents: {
        Row: {
          consented: boolean
          consented_at: string | null
          created_at: string | null
          id: string
          ip_address: string | null
          policy_type: string
          policy_version: string
          tenancy_id: string
          user_id: string
        }
        Insert: {
          consented?: boolean
          consented_at?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          policy_type: string
          policy_version?: string
          tenancy_id: string
          user_id: string
        }
        Update: {
          consented?: boolean
          consented_at?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          policy_type?: string
          policy_version?: string
          tenancy_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_consents_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancies"
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
      renewal_proposals: {
        Row: {
          created_at: string | null
          id: string
          new_end_date: string
          new_rent_pcm: number
          new_start_date: string
          notes: string | null
          proposed_by: string
          responded_at: string | null
          status: string
          tenancy_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          new_end_date: string
          new_rent_pcm: number
          new_start_date: string
          notes?: string | null
          proposed_by: string
          responded_at?: string | null
          status?: string
          tenancy_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          new_end_date?: string
          new_rent_pcm?: number
          new_start_date?: string
          notes?: string | null
          proposed_by?: string
          responded_at?: string | null
          status?: string
          tenancy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "renewal_proposals_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancies"
            referencedColumns: ["id"]
          },
        ]
      }
      rent_payments: {
        Row: {
          amount: number
          created_at: string | null
          due_date: string
          id: string
          paid_amount: number | null
          paid_date: string | null
          payment_method: string | null
          reference: string | null
          status: string
          tenancy_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          due_date: string
          id?: string
          paid_amount?: number | null
          paid_date?: string | null
          payment_method?: string | null
          reference?: string | null
          status?: string
          tenancy_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          due_date?: string
          id?: string
          paid_amount?: number | null
          paid_date?: string | null
          payment_method?: string | null
          reference?: string | null
          status?: string
          tenancy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rent_payments_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancies"
            referencedColumns: ["id"]
          },
        ]
      }
      tenancies: {
        Row: {
          application_id: string | null
          contract_storage_key: string | null
          created_at: string | null
          deposit: number | null
          end_date: string
          id: string
          landlord_id: string
          listing_id: string
          rent_pcm: number
          start_date: string
          status: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          application_id?: string | null
          contract_storage_key?: string | null
          created_at?: string | null
          deposit?: number | null
          end_date: string
          id?: string
          landlord_id: string
          listing_id: string
          rent_pcm: number
          start_date: string
          status?: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          application_id?: string | null
          contract_storage_key?: string | null
          created_at?: string | null
          deposit?: number | null
          end_date?: string
          id?: string
          landlord_id?: string
          listing_id?: string
          rent_pcm?: number
          start_date?: string
          status?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: []
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
      termination_notices: {
        Row: {
          acknowledged_at: string | null
          created_at: string | null
          effective_date: string
          id: string
          issued_by: string
          notice_date: string
          notice_type: string
          reason: string | null
          status: string
          tenancy_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string | null
          effective_date: string
          id?: string
          issued_by: string
          notice_date?: string
          notice_type?: string
          reason?: string | null
          status?: string
          tenancy_id: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string | null
          effective_date?: string
          id?: string
          issued_by?: string
          notice_date?: string
          notice_type?: string
          reason?: string | null
          status?: string
          tenancy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "termination_notices_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancies"
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
      utilities: {
        Row: {
          amount: number | null
          created_at: string | null
          due_date: string | null
          id: string
          notes: string | null
          provider_name: string | null
          responsibility: string
          status: string
          tenancy_id: string
          updated_at: string | null
          utility_type: string
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          provider_name?: string | null
          responsibility?: string
          status?: string
          tenancy_id: string
          updated_at?: string | null
          utility_type: string
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          provider_name?: string | null
          responsibility?: string
          status?: string
          tenancy_id?: string
          updated_at?: string | null
          utility_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "utilities_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancies"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_requests: {
        Row: {
          created_at: string | null
          document_ids: Json | null
          id: string
          listing_id: string | null
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string | null
          user_id: string
          verification_type: string
        }
        Insert: {
          created_at?: string | null
          document_ids?: Json | null
          id?: string
          listing_id?: string | null
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
          verification_type: string
        }
        Update: {
          created_at?: string | null
          document_ids?: Json | null
          id?: string
          listing_id?: string | null
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
          verification_type?: string
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
