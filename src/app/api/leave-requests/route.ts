import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-config"
import { supabase } from "@/lib/supabase"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getLeaveRequests, createLeaveRequest as createRequest, isUserOnProbation } from "@/lib/leave"
import { sendEmail, emailTemplates } from "@/lib/email"
import { calculateBusinessDays, formatDate } from "@/lib/utils"
import { hasPermission } from "@/lib/auth"

// GET /api/leave-requests - List leave requests
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    const { hasPermission: canRead } = await hasPermission(userId, "leave_requests:read")
    if (!canRead) {
      return NextResponse.json({ error: "You do not have permission to read leave requests." }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") as any
    const myRequests = searchParams.get("myRequests") === "true"

    if (myRequests) {
      const { requests, error } = await getLeaveRequests(userId, status)
      if (error) throw error
      return NextResponse.json({ requests })
    }

    // For managers/admins, get team requests
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (userError) throw userError

    if (!userProfile || !['ADMIN', 'HR_MANAGER', 'MANAGER'].includes(userProfile.role)) {
      const { requests, error } = await getLeaveRequests(userId, status)
      if (error) throw error
      return NextResponse.json({ requests })
    }

    // Get team members
    const { data: teamMembers, error: teamError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('manager_id', userId)

    if (teamError) throw teamError

    const teamIds = teamMembers?.map(m => m.id) || []
    const userIds = [userId, ...teamIds]

    let query = supabaseAdmin
      .from('leave_requests')
      .select('*, leaveType:leave_types(*)')
      .in('user_id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000'])

    if (status) {
      query = query.eq('status', status)
    }

    const { data: requests, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ requests })
  } catch (error) {
    console.error("Error fetching leave requests:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/leave-requests - Create new leave request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    const { hasPermission: canCreate } = await hasPermission(userId, "leave_requests:create")
    if (!canCreate) {
      return NextResponse.json({ error: "You do not have permission to create leave requests." }, { status: 403 })
    }
    const body = await request.json()
    const { leaveTypeId, startDate, endDate, reason, leaveMode = 'FULL' } = body

    // Validate required fields
    if (!leaveTypeId || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Leave type, start date, and end date are required" },
        { status: 400 }
      )
    }

    // Validate leave mode
    if (!['FULL', 'HALF', 'SHORT'].includes(leaveMode)) {
      return NextResponse.json(
        { error: "Invalid leave mode" },
        { status: 400 }
      )
    }

    // Check if user is on probation and restrict leave modes
    const { isOnProbation, error: probationError } = await isUserOnProbation(userId)
    if (probationError) {
      console.error("Error checking probation status:", probationError)
      return NextResponse.json(
        { error: "Failed to check probation status" },
        { status: 500 }
      )
    }

    if (isOnProbation && leaveMode !== 'HALF') {
      return NextResponse.json(
        { error: "Employees on probation can only request half-day leave" },
        { status: 400 }
      )
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    // Validate dates
    if (start > end) {
      return NextResponse.json(
        { error: "Start date must be before end date" },
        { status: 400 }
      )
    }

    // Allow current date and future dates (use local date comparison)
    const today = new Date()

    const minSelectableDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - 2
    )
    const startLocal = new Date(start.getFullYear(), start.getMonth(), start.getDate())

    if (startLocal < minSelectableDate) {
      return NextResponse.json(
        { error: "Cannot request leave for past dates" },
        { status: 400 }
      )
    }

    // Get leave type
    const { data: leaveType, error: leaveTypeError } = await supabaseAdmin
      .from('leave_types')
      .select('*')
      .eq('id', leaveTypeId)
      .eq('is_active', true)
      .single()

    if (leaveTypeError || !leaveType) {
      return NextResponse.json(
        { error: "Invalid or inactive leave type" },
        { status: 400 }
      )
    }

    // Calculate total days based on leave mode
    let totalDays: number
    if (leaveMode === 'FULL') {
      totalDays = calculateBusinessDays(start, end)
    } else if (leaveMode === 'HALF') {
      totalDays = 0.5
    } else if (leaveMode === 'SHORT') {
      totalDays = 0.25
    } else {
      totalDays = calculateBusinessDays(start, end)
    }

    // For partial days, ensure start and end are the same date
    if (leaveMode !== 'FULL' && start.toDateString() !== end.toDateString()) {
      return NextResponse.json(
        { error: "Half day and short leave must be for the same date" },
        { status: 400 }
      )
    }

    // Check max consecutive days (only for full days)
    if (leaveMode === 'FULL' && leaveType.max_consecutive_days && totalDays > leaveType.max_consecutive_days) {
      return NextResponse.json(
        { error: `Maximum ${leaveType.max_consecutive_days} consecutive days allowed for this leave type` },
        { status: 400 }
      )
    }

    // Check leave balance
    const currentYear = new Date().getFullYear()
    const { data: balance, error: balanceError } = await supabaseAdmin
      .from('leave_balances')
      .select('*')
      .eq('user_id', userId)
      .eq('leave_type_id', leaveTypeId)
      .eq('year', currentYear)
      .single()

    if (balanceError || !balance) {
      return NextResponse.json(
        { error: "No leave balance found for this leave type" },
        { status: 400 }
      )
    }

    const availableDays = balance.total_days - balance.used_days - balance.pending_days
    if (totalDays > availableDays) {
      return NextResponse.json(
        { error: `Insufficient leave balance. Available: ${availableDays} days` },
        { status: 400 }
      )
    }

    // Check for overlapping requests
    const { data: overlapping, error: overlapError } = await supabaseAdmin
      .from('leave_requests')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['PENDING', 'APPROVED'])
      .or(`and(start_date.lte.${endDate},end_date.gte.${startDate})`)
      .limit(1)

    if (!overlapError && overlapping && overlapping.length > 0) {
      return NextResponse.json(
        { error: "You already have a leave request for these dates" },
        { status: 400 }
      )
    }

    // Create leave request
    const { leaveRequest, error: createError } = await createRequest(
      userId,
      leaveTypeId,
      startDate,
      endDate,
      totalDays,
      reason,
      leaveMode
    )

    if (createError) throw createError

    // Update pending days in balance
    await supabaseAdmin
      .from('leave_balances')
      .update({
        pending_days: balance.pending_days + totalDays,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('leave_type_id', leaveTypeId)
      .eq('year', currentYear)

    // Get user profile for email (optional - don't fail if this fails)
    let userProfile: any = null
    try {
      const { data } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      userProfile = data
    } catch (profileError) {
      console.warn("[Leave Request API] Could not fetch user profile:", profileError)
      // Continue without profile - we can still create the request
    }

    // Send email to manager if requires approval
    if (leaveType.requires_approval) {
      // Send to manager if exists
      if (userProfile?.manager_id) {
        const { data: manager } = await supabaseAdmin
          .from('users')
          .select('email, first_name, last_name')
          .eq('id', userProfile.manager_id)
          .single()

        if (manager) {
          const emailContent = emailTemplates.leaveRequestSubmitted(
            `${userProfile.first_name} ${userProfile.last_name}`,
            leaveType.name,
            formatDate(start),
            formatDate(end),
            `${manager.first_name} ${manager.last_name}`
          )
          await sendEmail({
            to: manager.email,
            subject: emailContent.subject,
            html: emailContent.html,
          })
        }
      }

      // Send to HR managers and admins
      const { data: admins } = await supabaseAdmin
        .from('users')
        .select('email, first_name, last_name')
        .in('role', ['ADMIN', 'HR_MANAGER'])

      if (admins && admins.length > 0) {
        for (const admin of admins) {
          const emailContent = emailTemplates.leaveRequestSubmitted(
            `${userProfile.first_name} ${userProfile.last_name}`,
            leaveType.name,
            formatDate(start),
            formatDate(end),
            `${admin.first_name} ${admin.last_name}`
          )
          await sendEmail({
            to: admin.email,
            subject: emailContent.subject,
            html: emailContent.html,
          })
        }
      }
    }

    return NextResponse.json(
      {
        message: "Leave request created successfully",
        leaveRequest,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("[Leave Request API] Error creating leave request:")
    console.error("Error object:", error)
    console.error("Error message:", error?.message)
    console.error("Error stack:", error?.stack)
    console.error("Full error:", JSON.stringify(error, null, 2))

    const errorMessage = error?.message || error?.toString?.() || "Unknown error"
    return NextResponse.json({
      error: "Internal server error",
      details: errorMessage,
      type: typeof error
    }, { status: 500 })
  }
}
