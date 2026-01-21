import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser, hasPermission, getUserProfile } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"

// GET /api/leave-history - Get leave history
export async function GET(request: NextRequest) {
  try {
    const { user } = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { user: userProfile } = await getUserProfile(user.id)
    if (!userProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const userId = searchParams.get("userId") || ""
    const action = searchParams.get("action") || ""

    let query = supabaseAdmin
      .from("leave_history")
      .select(
        `
        *,
        user:users(id, first_name, last_name),
        leaveType:leave_types(id, name)
        `,
        { count: "exact" }
      )

    // Non-admin users can only view their own history
    if (userProfile.role === "EMPLOYEE") {
      query = query.eq("user_id", user.id)
    } else if (userId) {
      query = query.eq("user_id", userId)
    }

    if (action) {
      query = query.eq("action", action)
    }

    const { data: history, count } = await query
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    return NextResponse.json({
      history,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching leave history:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}