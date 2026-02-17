import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are not fully configured:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey
  })
}

// Create client with fallback to prevent runtime crashes
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          first_name: string
          last_name: string
          role: 'ADMIN' | 'HR_MANAGER' | 'MANAGER' | 'EMPLOYEE'
          department: string | null
          position: string | null
          manager_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          first_name: string
          last_name: string
          role?: 'ADMIN' | 'HR_MANAGER' | 'MANAGER' | 'EMPLOYEE'
          department?: string | null
          position?: string | null
          manager_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          email?: string
          first_name?: string
          last_name?: string
          role?: 'ADMIN' | 'HR_MANAGER' | 'MANAGER' | 'EMPLOYEE'
          department?: string | null
          position?: string | null
          manager_id?: string | null
          is_active?: boolean
          updated_at?: string
        }
      }
      leave_types: {
        Row: {
          id: string
          name: string
          description: string | null
          default_days: number
          is_active: boolean
          is_paid: boolean
          requires_approval: boolean
          max_consecutive_days: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          default_days?: number
          is_active?: boolean
          is_paid?: boolean
          requires_approval?: boolean
          max_consecutive_days?: number | null
        }
        Update: {
          name?: string
          description?: string | null
          default_days?: number
          is_active?: boolean
          is_paid?: boolean
          requires_approval?: boolean
          max_consecutive_days?: number | null
          updated_at?: string
        }
      }
      leave_balances: {
        Row: {
          id: string
          user_id: string
          leave_type_id: string
          year: number
          total_days: number
          used_days: number
          pending_days: number
          carried_over: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          leave_type_id: string
          year: number
          total_days?: number
          used_days?: number
          pending_days?: number
          carried_over?: number
        }
        Update: {
          total_days?: number
          used_days?: number
          pending_days?: number
          carried_over?: number
          updated_at?: string
        }
      }
      leave_requests: {
        Row: {
          id: string
          user_id: string
          leave_type_id: string
          start_date: string
          end_date: string
          total_days: number
          reason: string | null
          status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
          approved_by_id: string | null
          approved_at: string | null
          rejection_reason: string | null
          cancelled_at: string | null
          cancellation_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          leave_type_id: string
          start_date: string
          end_date: string
          total_days: number
          reason?: string | null
          status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
          approved_by_id?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          cancelled_at?: string | null
          cancellation_reason?: string | null
        }
        Update: {
          status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
          reason?: string | null
          approved_by_id?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          cancelled_at?: string | null
          cancellation_reason?: string | null
          updated_at?: string
        }
      }
      leave_history: {
        Row: {
          id: string
          user_id: string
          leave_type_id: string
          action: 'CREATED' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'MODIFIED'
          previous_status: string | null
          new_status: string | null
          changed_by: string
          details: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          leave_type_id: string
          action: 'CREATED' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'MODIFIED'
          previous_status?: string | null
          new_status?: string | null
          changed_by: string
          details?: string | null
        }
        Update: {}
      }
      email_logs: {
        Row: {
          id: string
          to_email: string
          subject: string
          body: string
          status: 'PENDING' | 'SENT' | 'FAILED'
          sent_at: string | null
          error: string | null
          created_at: string
        }
        Insert: {
          id?: string
          to_email: string
          subject: string
          body: string
          status?: 'PENDING' | 'SENT' | 'FAILED'
          sent_at?: string | null
          error?: string | null
        }
        Update: {
          status?: 'PENDING' | 'SENT' | 'FAILED'
          sent_at?: string | null
          error?: string | null
        }
      }
      file_uploads: {
        Row: {
          id: string
          user_id: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          bucket_name: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          bucket_name: string
        }
        Update: {}
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}
