import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser, hasPermission } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"

// GET /api/leave-types/[id] - Get single leave type
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user } = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: leaveType, error } = await supabaseAdmin
      .from("leave_types")
      .select("*")
      .eq("id", params.id)
      .single()

    if (error || !leaveType) {
      return NextResponse.json({ error: "Leave type not found" }, { status: 404 })
    }

    return NextResponse.json(leaveType)
  } catch (error) {
    console.error("Error fetching leave type:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT /api/leave-types/[id] - Update leave type
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user } = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { hasPermission: canUpdate } = await hasPermission(user.id, "ADMIN")
    if (!canUpdate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      description,
      default_days,
      is_active,
      is_paid,
      requires_approval,
      max_consecutive_days,
    } = body

    // Check if leave type exists
    const { data: existingType, error: fetchError } = await supabaseAdmin
      .from("leave_types")
      .select("*")
      .eq("id", params.id)
      .single()

    if (fetchError || !existingType) {
      return NextResponse.json({ error: "Leave type not found" }, { status: 404 })
    }

    // Check if name is being changed and if it's already taken
    if (name && name !== existingType.name) {
      const { data: nameExists } = await supabaseAdmin
        .from("leave_types")
        .select("id")
        .eq("name", name)
        .single()

      if (nameExists) {
        return NextResponse.json(
          { error: "Leave type with this name already exists" },
          { status: 400 }
        )
      }
    }

    const { data: leaveType, error: updateError } = await supabaseAdmin
      .from("leave_types")
      .update({
        name: name || existingType.name,
        description: description !== undefined ? description : existingType.description,
        default_days: default_days !== undefined ? default_days : existingType.default_days,
        is_active: is_active !== undefined ? is_active : existingType.is_active,
        is_paid: is_paid !== undefined ? is_paid : existingType.is_paid,
        requires_approval: requires_approval !== undefined ? requires_approval : existingType.requires_approval,
        max_consecutive_days: max_consecutive_days !== undefined ? max_consecutive_days : existingType.max_consecutive_days,
      })
      .eq("id", params.id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      message: "Leave type updated successfully",
      leaveType,
    })
  } catch (error) {
    console.error("Error updating leave type:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE /api/leave-types/[id] - Delete leave type
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user } = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { hasPermission: canDelete } = await hasPermission(user.id, "ADMIN")
    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Check if leave type exists
    const { data: leaveType, error: fetchError } = await supabaseAdmin
      .from("leave_types")
      .select("*")
      .eq("id", params.id)
      .single()

    if (fetchError || !leaveType) {
      return NextResponse.json({ error: "Leave type not found" }, { status: 404 })
    }

    // Check if there are any leave requests using this type
    const { count } = await supabaseAdmin
      .from("leave_requests")
      .select("*", { count: "exact", head: true })
      .eq("leave_type_id", params.id)

    if ((count || 0) > 0) {
      // Soft delete - just deactivate
      await supabaseAdmin
        .from("leave_types")
        .update({ is_active: false })
        .eq("id", params.id)

      return NextResponse.json({
        message: "Leave type deactivated (has existing requests)",
      })
    }

    // Hard delete if no requests
    const { error: deleteError } = await supabaseAdmin
      .from("leave_types")
      .delete()
      .eq("id", params.id)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({ message: "Leave type deleted successfully" })
  } catch (error) {
    console.error("Error deleting leave type:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}