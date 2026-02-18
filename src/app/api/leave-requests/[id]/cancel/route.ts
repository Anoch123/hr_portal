import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-config"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { sendEmail, emailTemplates } from "@/lib/email"
import { formatDate } from "@/lib/utils"
import { hasPermission } from "@/lib/auth"

// POST /api/leave-requests/[id]/cancel - Cancel leave request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { hasPermission: canRead } = await hasPermission(session.user.id, "leave_requests:cancel")
    if (!canRead) {
      return NextResponse.json({ error: "You do not have permission to cancel leave requests." }, { status: 403 })
    }

    const userId = session.user.id
    const body = await request.json()
    const { reason } = body

    const { data: leaveRequest, error: fetchError } = await supabaseAdmin
      .from("leave_requests")
      .select(`
        *,
        leaveType:leave_types(*),
        user:users!leave_requests_user_id_fkey(
          id,
          first_name,
          last_name,
          email,
          manager_id
        )
      `)
      .eq("id", id)
      .single()

    if (fetchError || !leaveRequest) {
      console.error("Error fetching leave request:", fetchError)
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 })
    }

    // Only the owner can cancel their own request
    if (leaveRequest.user_id !== userId) {
      return NextResponse.json(
        { error: "You can only cancel your own leave requests" },
        { status: 403 }
      )
    }

    // Can only cancel pending or approved requests
    if (!["PENDING", "APPROVED"].includes(leaveRequest.status)) {
      return NextResponse.json(
        { error: "Can only cancel pending or approved requests" },
        { status: 400 }
      )
    }

    const previousStatus = leaveRequest.status

    // Update leave request
    const { data: updatedRequest, error: updateError } = await supabaseAdmin
      .from("leave_requests")
      .update({
        status: "CANCELLED",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
      })
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // Update leave balance - only if request was APPROVED (balance is updated only on approval)
    if (previousStatus === "APPROVED") {
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
            used_days: (balance.used_days || 0) - leaveRequest.total_days,
            updated_at: new Date().toISOString(),
          })
          .eq("id", balance.id)
      }
    }
    // Note: No balance update needed for PENDING status since balance is only updated on approval

    // Create history entry
    await supabaseAdmin.from("leave_history").insert({
      user_id: leaveRequest.user_id,
      leave_type_id: leaveRequest.leave_type_id,
      action: "CANCELLED",
      previous_status: previousStatus,
      new_status: "CANCELLED",
      changed_by: leaveRequest.user_id,
      details: reason ? `Leave request cancelled. Reason: ${reason}` : "Leave request cancelled",
    })

    // Send email to manager if request was approved
    if (previousStatus === "APPROVED" && leaveRequest.user.manager_id) {
      // Fetch manager details
      const { data: manager } = await supabaseAdmin
        .from("users")
        .select("id, first_name, last_name, email")
        .eq("id", leaveRequest.user.manager_id)
        .single()

      if (manager) {
        const emailContent = emailTemplates.leaveRequestCancelled(
          `${leaveRequest.user.first_name} ${leaveRequest.user.last_name}`,
          leaveRequest.leaveType.name,
          formatDate(leaveRequest.start_date),
          formatDate(leaveRequest.end_date),
          `${manager.first_name} ${manager.last_name}`,
          reason
        )
        await sendEmail({
          to: manager.email,
          subject: emailContent.subject,
          html: emailContent.html,
        })
      }
    }

    return NextResponse.json({
      message: "Leave request cancelled successfully",
      leaveRequest: updatedRequest,
    })
  } catch (error) {
    console.error("Error cancelling leave request:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}