import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser, hasPermission, getUserProfile } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"

// GET /api/leave-requests/[id] - Get single leave request
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user } = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { hasPermission: canRead } = await hasPermission(user.id, "leave_requests:read")
    if (!canRead) {
      return NextResponse.json({ error: "You do not have permission to read leave requests." }, { status: 403 })
    }

    const { user: userProfile } = await getUserProfile(user.id)
    if (!userProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { data: leaveRequest, error } = await supabaseAdmin
      .from("leave_requests")
      .select(
        `
        *,
        user:users!leave_requests_user_id_fkey(id, first_name, last_name, email, department),
        leaveType:leave_types(*),
        approvedBy:users!leave_requests_approved_by_id_fkey(id, first_name, last_name)
        `
      )
      .eq("id", id)
      .single()

    if (error || !leaveRequest) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 })
    }

    return NextResponse.json(leaveRequest)
  } catch (error) {
    console.error("Error fetching leave request:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE /api/leave-requests/[id] - Delete leave request (only if pending)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user } = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { user: userProfile } = await getUserProfile(user.id)
    if (!userProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { data: leaveRequest, error: fetchError } = await supabaseAdmin
      .from("leave_requests")
      .select("*")
      .eq("id", id)
      .single()

    if (fetchError || !leaveRequest) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 })
    }

    // Only allow deletion of own pending requests or users with delete permission
    if (leaveRequest.user_id !== user.id) {
      const { hasPermission: canDelete } = await hasPermission(user.id, "leave_requests:delete")
      if (!canDelete) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    if (leaveRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: "Can only delete pending requests" },
        { status: 400 }
      )
    }

    // Note: No balance update needed on deletion since balance is only updated on approval

    // Delete the request
    const { error: deleteError } = await supabaseAdmin
      .from("leave_requests")
      .delete()
      .eq("id", id)

    if (deleteError) {
      throw deleteError
    }

    // Create history entry
    await supabaseAdmin.from("leave_history").insert({
      user_id: leaveRequest.user_id,
      leave_type_id: leaveRequest.leave_type_id,
      action: "DELETED",
      previous_status: leaveRequest.status,
      changed_by: user.id,
      details: "Leave request deleted",
    })

    return NextResponse.json({ message: "Leave request deleted successfully" })
  } catch (error) {
    console.error("Error deleting leave request:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}