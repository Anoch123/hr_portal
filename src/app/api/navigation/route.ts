import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getNavigationForRole } from "@/lib/acl"

export async function GET(request: NextRequest) {
  try {
    const { user } = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile to determine role
    const { supabaseAdmin } = await import('@/lib/supabase-admin')
    const { data: userProfile, error } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (error || !userProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userRole = userProfile.role as any

    // Get navigation for role
    const navigation = await getNavigationForRole(userRole)

    return NextResponse.json({ navigation })
  } catch (error) {
    console.error("Error in GET /api/navigation:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}