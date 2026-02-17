import { supabaseAdmin } from "@/lib/supabase-admin"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Check if environment variables are set
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ 
        initialized: false, 
        error: "Missing environment variables",
        details: {
          hasSupabaseUrl: !!supabaseUrl,
          hasServiceRoleKey: !!supabaseServiceRoleKey
        }
      }, { status: 500 })
    }

    // Check if users table exists
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id', { count: 'exact', head: true })
      .limit(1)

    if (!error) {
      // Table exists - database is initialized
      return NextResponse.json({ 
        initialized: true, 
        message: "Database is initialized" 
      })
    }

    // Table doesn't exist - need initialization
    return NextResponse.json({ 
      initialized: false, 
      message: "Database not initialized. Please run setup." 
    }, { status: 200 })
  } catch (error) {
    console.error("DB status check error:", error)
    return NextResponse.json({ 
      initialized: false, 
      error: error instanceof Error ? error.message : "Database check failed" 
    }, { status: 500 })
  }
}
