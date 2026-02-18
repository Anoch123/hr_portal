import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser, hasPermission, getUserProfile } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { sendEmail, emailTemplates } from "@/lib/email"
import { formatDate } from "@/lib/utils"

// POST /api/leave-requests/[id]/approve - Approve leave request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const { user } = await getCurrentUser()
    if (!user) {
      console.error("No user found in session")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("userProfile " , user);
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()
    
    console.log("userProfile data:", userProfile)
    console.log("profileError:", profileError)
    
    if (profileError || !userProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }


    const { hasPermission: canApprove } = await hasPermission(user.id, "HR_MANAGER")
    if (!canApprove && userProfile.role !== "MANAGER") {
      return NextResponse.json({ error: "You do not have permission to approve leave requests." }, { status: 403 })
    }

    const { data: leaveRequest, error: fetchError } = await supabaseAdmin
      .from("leave_requests")
      .select(
        `
        *,
        user:users!leave_requests_user_id_fkey(id, first_name, last_name, email, manager_id),
        leaveType:leave_types(*)
        `
      )
      .eq("id", id)
      .single()

      console.log("leaveRequest " , leaveRequest);
      console.log("fetchError " , fetchError);
    if (fetchError || !leaveRequest) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 })
    }

    if (leaveRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: "Can only approve pending requests" },
        { status: 400 }
      )
    }

    console.log("userProfile.role ", userProfile.role);
    // Check if user can approve this request
    // Managers can only approve their direct reports
    // HR_MANAGER and ADMIN can approve anyone
    if (userProfile.role === "MANAGER") {
      if (leaveRequest.user.manager_id !== user.id) {
        return NextResponse.json(
          { error: "You can only approve requests from your direct reports" },
          { status: 403 }
        )
      }
    }

    // Update leave request
    const { data: updatedRequest, error: updateError } = await supabaseAdmin
      .from("leave_requests")
      .update({
        status: "APPROVED",
        approved_by_id: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // Update leave balance - add to used_days (balance is now updated only on approval)
    // For no-pay leave, we still update used_days to track the leave taken (can go negative)
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
          used_days: (balance.used_days || 0) + leaveRequest.total_days,
          updated_at: new Date().toISOString(),
        })
        .eq("id", balance.id)
    } else if (leaveRequest.is_no_pay) {
      // For no-pay leave without existing balance, create one with negative used_days
      await supabaseAdmin
        .from("leave_balances")
        .insert({
          user_id: leaveRequest.user_id,
          leave_type_id: leaveRequest.leave_type_id,
          year: currentYear,
          total_days: 0,
          carried_over: 0,
          used_days: leaveRequest.total_days,
        })
    }

    // Create history entry
    await supabaseAdmin.from("leave_history").insert({
      user_id: leaveRequest.user_id,
      leave_type_id: leaveRequest.leave_type_id,
      action: "APPROVED",
      previous_status: "PENDING",
      new_status: "APPROVED",
      changed_by: user.id,
      details: leaveRequest.is_no_pay 
        ? `No-pay leave request approved by ${userProfile.first_name} ${userProfile.last_name}`
        : `Leave request approved by ${userProfile.first_name} ${userProfile.last_name}`,
    })

    // Send email to employee
    const emailContent = emailTemplates.leaveRequestApproved(
      `${leaveRequest.user.first_name} ${leaveRequest.user.last_name}`,
      leaveRequest.leaveType.name,
      formatDate(leaveRequest.start_date),
      formatDate(leaveRequest.end_date),
      `${userProfile.first_name} ${userProfile.last_name}`
    )
    await sendEmail({
      to: leaveRequest.user.email,
      subject: emailContent.subject,
      html: emailContent.html,
    })

    return NextResponse.json({
      message: "Leave request approved successfully",
      leaveRequest: updatedRequest,
    })
  } catch (error) {
    console.error("Error approving leave request:", error)
    console.log(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}