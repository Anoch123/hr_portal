import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-config"
import { supabaseAdmin } from "@/lib/supabase-admin"

// Force dynamic rendering since this route uses session/auth
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*, department:departments(*)')
      .eq('id', session.user.id)
      .single()

    if (error || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get email verification status from auth.users
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(session.user.id)

    const emailVerified = authUser?.user?.email_confirmed_at ? true : false

    return NextResponse.json({
      user: {
        ...user,
        email_verified: emailVerified
      }
    })
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}