import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser, hasPermission } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"

// GET /api/employees/[id] - Get single employee
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user } = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { hasPermission: canRead } = await hasPermission(user.id, "ADMIN")
    if (!canRead) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data: employee, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", params.id)
      .single()

    if (error || !employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    return NextResponse.json(employee)
  } catch (error) {
    console.error("Error fetching employee:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/employees/[id] - Update employee
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user } = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { hasPermission: canUpdate } = await hasPermission(user.id, "HR_MANAGER")
    if (!canUpdate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()

    // Map incoming body keys to DB column names and whitelist allowed fields
    const updateData: Record<string, any> = {}
    if (body.email !== undefined) updateData.email = body.email
    if (body.first_name !== undefined) updateData.first_name = body.first_name
    if (body.last_name !== undefined) updateData.last_name = body.last_name
    if (body.role !== undefined) updateData.role = body.role
    if (body.department !== undefined) updateData.department = body.department
    if (body.position !== undefined) updateData.position = body.position
    if (body.managerId !== undefined) updateData.manager_id = body.managerId
    if (body.is_active !== undefined) updateData.is_active = body.is_active
    updateData.updated_at = new Date().toISOString()

    const { data: employee, error } = await supabaseAdmin
      .from("users")
      .update(updateData)
      .eq("id", params.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating employee:", error)
      return NextResponse.json({ error: "Failed to update employee" }, { status: 400 })
    }

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    return NextResponse.json({
      message: "Employee updated successfully",
      employee,
    })
  } catch (error) {
    console.error("Error updating employee:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/employees/[id] - Delete employee
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

    const { error } = await supabaseAdmin
      .from("users")
      .update({ is_active: false })
      .eq("id", params.id)

    if (error) {
      return NextResponse.json({ error: "Failed to deactivate employee" }, { status: 400 })
    }

    return NextResponse.json({ message: "Employee deactivated successfully" })
  } catch (error) {
    console.error("Error deleting employee:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}