import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser, hasPermission, ensureUserProfile } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-config"

// Force dynamic rendering since this route uses session/auth
export const dynamic = 'force-dynamic'

// GET /api/approvals - Get pending approvals for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Get user profile to determine role
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userRole = userProfile.role

    // Only managers, HR managers, and admins can view approvals
    if (!['ADMIN', 'HR_MANAGER', 'MANAGER'].includes(userRole)) {
      return NextResponse.json({ error: "You do not have permission to approve leave requests." }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const offset = (page - 1) * limit
    const status = searchParams.get("status") || "PENDING"
    const search = searchParams.get("search") || ""

    // Managers can only see their direct reports' requests
    // HR_MANAGER and ADMIN can see all pending requests
    let allowedUserIds: string[] | null = null
    if (userRole === "MANAGER") {
      const { data: employees } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("manager_id", userId)

      allowedUserIds = employees?.map((e) => e.id) || []
    }

    // If search is provided, first find matching user IDs
    let searchUserIds: string[] | null = null
    if (search) {
      const { data: matchingUsers } = await supabaseAdmin
        .from("users")
        .select("id")
        .or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`)
      
      searchUserIds = matchingUsers?.map((u) => u.id) || []
    }

    // Build the query with appropriate filters
    let query = supabaseAdmin
      .from("leave_requests")
      .select(
        `
        *,
        user:users!leave_requests_user_id_fkey(id, first_name, last_name, email, department_id, position, department:departments(id, name)),
        leaveType:leave_types(*)
        `,
        { count: "exact" }
      )
      .eq("status", status)

    // Apply user filtering based on role and search
    if (allowedUserIds && searchUserIds) {
      // Manager with search: intersect both conditions
      const intersectedIds = allowedUserIds.filter(id => searchUserIds!.includes(id))
      query = query.in("user_id", intersectedIds.length > 0 ? intersectedIds : ["no-match-placeholder"])
    } else if (allowedUserIds) {
      // Manager without search
      query = query.in("user_id", allowedUserIds.length > 0 ? allowedUserIds : ["no-match-placeholder"])
    } else if (searchUserIds) {
      // HR/Admin with search
      query = query.in("user_id", searchUserIds.length > 0 ? searchUserIds : ["no-match-placeholder"])
    }

    const { data: requests, count, error: queryError } = await query
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1)
    
      // Transform snake_case to camelCase for frontend
      const transformedRequests = requests?.map((request: any) => ({
        id: request.id,
        startDate: request.start_date,
        endDate: request.end_date,
        totalDays: request.total_days,
        reason: request.reason,
        status: request.status,
        isNoPay: request.is_no_pay || false,
        rejectionReason: request.rejection_reason,
        createdAt: request.created_at,
        user: request.user ? {
          id: request.user.id,
          firstName: request.user.first_name,
          lastName: request.user.last_name,
          email: request.user.email,
          department: request.user.department ? request.user.department.name : null,
          position: request.user.position,
        } : null,
        leaveType: request.leaveType ? {
          id: request.leaveType.id,
          name: request.leaveType.name,
        } : null,
    })) || [];

    console.log("transformedRequests " , transformedRequests);
    
    return NextResponse.json({
      requests: transformedRequests,
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