import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser, hasPermission, ensureUserProfile } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-config"

// GET /api/approvals - Get pending approvals for current user
export async function GET(request: NextRequest) {
  console.log("GET /api/approvals called")
  try {
    const session = await getServerSession(authOptions)
    console.log("Session:", session)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    const { user: userProfile } = await ensureUserProfile(userId, session.user.email!)
    // console.log("userProfile ", userProfile);
    if (!userProfile) {
      // Return empty list if user profile not found
      return NextResponse.json({
        requests: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      })
    }

    const { hasPermission: canApprove } = await hasPermission(userId, "HR_MANAGER")
    if (!canApprove) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const offset = (page - 1) * limit

    let query = supabaseAdmin
      .from("leave_requests")
      .select(
        `
        *,
        user:users(id, first_name, last_name, email, department, position),
        leaveType:leave_types(*)
        `,
        { count: "exact" }
      )
      .eq("status", "PENDING")

    // Managers can only see their direct reports' requests
    if (userProfile.role === "MANAGER" || userProfile.role === "ADMIN") {
      const { data: employees } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("manager_id", userId)

      const employeeIds = employees?.map((e) => e.id) || []
      query = query.in("user_id", employeeIds)
    }
    // HR_MANAGER and ADMIN can see all pending requests

    const { data: requests, count } = await query
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1)

    return NextResponse.json({
      requests,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching pending approvals:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}