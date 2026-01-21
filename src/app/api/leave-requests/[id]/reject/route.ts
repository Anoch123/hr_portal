import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser, hasPermission, getUserProfile } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { sendEmail, emailTemplates } from "@/lib/email"
import { formatDate } from "@/lib/utils"

// POST /api/leave-requests/[id]/reject - Reject leave request
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user } = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { user: userProfile } = await getUserProfile(user.id)
    if (!userProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { hasPermission: canReject } = await hasPermission(user.id, "HR_MANAGER")
    if (!canReject && userProfile.role !== "MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { reason } = body

    if (!reason) {
      return NextResponse.json(
        { error: "Rejection reason is required" },
        { status: 400 }
      )
    }

    const { data: leaveRequest, error: fetchError } = await supabaseAdmin
      .from("leave_requests")
      .select(
        `
        *,
        user:users(id, first_name, last_name, email, manager_id),
        leaveType:leave_types(*)
        `
      )
      .eq("id", params.id)
      .single()

    if (fetchError || !leaveRequest) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 })
    }

    if (leaveRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: "Can only reject pending requests" },
        { status: 400 }
      )
    }

    // Check if user can reject this request
    if (userProfile.role === "MANAGER") {
      if (leaveRequest.user.manager_id !== user.id) {
        return NextResponse.json(
          { error: "You can only reject requests from your direct reports" },
          { status: 403 }
        )
      }
    }

    // Update leave request
    const { data: updatedRequest, error: updateError } = await supabaseAdmin
      .from("leave_requests")
      .update({
        status: "REJECTED",
        rejection_reason: reason,
        approved_by_id: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // Restore pending days to balance
    const currentYear = new Date().getFullYear()
    
    const { data: balance } = await supabaseAdmin
      .from("leave_balances")
      .select("*")
      .eq("user_id", leaveRequest.user_id)
      .eq("leave_type_id", leaveRequest.leave_type_id)
      .eq("year", currentYear)
      .single()

    if (balance) {
      await supabaseAdmin
        .from("leave_balances")
        .update({
          pending_days: (balance.pending_days || 0) - leaveRequest.total_days,
        })
        .eq("id", balance.id)
    }

    // Create history entry
    await supabaseAdmin.from("leave_history").insert({
      user_id: leaveRequest.user_id,
      leave_type_id: leaveRequest.leave_type_id,
      action: "REJECTED",
      previous_status: "PENDING",
      new_status: "REJECTED",
      changed_by: user.id,
      details: `Leave request rejected by ${userProfile.first_name} ${userProfile.last_name}. Reason: ${reason}`,
    })

    // Send email to employee
    const emailContent = emailTemplates.leaveRequestRejected(
      `${leaveRequest.user.first_name} ${leaveRequest.user.last_name}`,
      leaveRequest.leaveType.name,
      formatDate(leaveRequest.start_date),
      formatDate(leaveRequest.end_date),
      `${userProfile.first_name} ${userProfile.last_name}`,
      reason
    )
    await sendEmail({
      to: leaveRequest.user.email,
      subject: emailContent.subject,
      html: emailContent.html,
    })

    return NextResponse.json({
      message: "Leave request rejected successfully",
      leaveRequest: updatedRequest,
    })
  } catch (error) {
    console.error("Error rejecting leave request:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}