import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Only log warnings on the server side (not during client bundling)
if (typeof window === 'undefined') {
  if (!supabaseUrl) {
    console.error('NEXT_PUBLIC_SUPABASE_URL is not set')
  }
  if (!supabaseServiceRoleKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not set - this is required for server-side operations')
  }
}

// Create a lazy-initialized admin client that only works on the server
// This prevents issues with environment variables not being available during build
function createSupabaseAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !key) {
    // Return a dummy client that will fail gracefully
    // This prevents build-time errors while still failing at runtime if misconfigured
    return createClient(
      url || 'https://placeholder.supabase.co',
      key || 'placeholder-key'
    )
  }
  
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Export a getter function to ensure the client is created lazily
let _supabaseAdmin: SupabaseClient | undefined

export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createSupabaseAdminClient()
  }
  return _supabaseAdmin
}

// For backward compatibility, also export as supabaseAdmin
export const supabaseAdmin: SupabaseClient = getSupabaseAdmin()