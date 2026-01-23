import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser, hasPermission } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"

// GET /api/departments/[id] - Get a specific department
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

    const { hasPermission: canRead } = await hasPermission(user.id, "departments:read")
    if (!canRead) {
      return NextResponse.json({ error: "You do not have permission to read departments." }, { status: 403 })
    }

    const { data: department, error } = await supabaseAdmin
      .from("departments")
      .select("*")
      .eq("id", id)
      .eq("is_active", true)
      .single()

    if (error) {
      console.error("Error fetching department:", error)
      if (error.code === "PGRST116") { // No rows returned
        return NextResponse.json({ error: "Department not found" }, { status: 404 })
      }
      return NextResponse.json({ error: "Failed to fetch department" }, { status: 500 })
    }

    return NextResponse.json(department)
  } catch (error) {
    console.error("Error in GET /api/departments/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/departments/[id] - Update a department
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user } = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { hasPermission: canUpdate } = await hasPermission(user.id, "departments:update")
    if (!canUpdate) {
      return NextResponse.json({ error: "You do not have permission to update departments." }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, is_active } = body

    if (name !== undefined && (!name || typeof name !== "string" || name.trim().length === 0)) {
      return NextResponse.json({ error: "Department name cannot be empty" }, { status: 400 })
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (is_active !== undefined) updateData.is_active = is_active

    const { data: department, error } = await supabaseAdmin
      .from("departments")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating department:", error)
      if (error.code === "23505") { // Unique constraint violation
        return NextResponse.json({ error: "Department name already exists" }, { status: 409 })
      }
      if (error.code === "PGRST116") { // No rows returned
        return NextResponse.json({ error: "Department not found" }, { status: 404 })
      }
      return NextResponse.json({ error: "Failed to update department" }, { status: 500 })
    }

    return NextResponse.json(department)
  } catch (error) {
    console.error("Error in PUT /api/departments/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/departments/[id] - Delete a department (soft delete by setting is_active to false)
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

    const { hasPermission: canDelete } = await hasPermission(user.id, "departments:delete")
    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Check if department has employees
    const { data: employees, error: checkError } = await supabaseAdmin
      .from("users")
      .select("id", { count: "exact" })
      .eq("department_id", id)
      .eq("is_active", true)

    if (checkError) {
      console.error("Error checking department usage:", checkError)
      return NextResponse.json({ error: "Failed to check department usage" }, { status: 500 })
    }

    if (employees && employees.length > 0) {
      return NextResponse.json({
        error: "Cannot delete department with active employees. Please reassign employees first."
      }, { status: 409 })
    }

    // Soft delete by setting is_active to false
    const { data: department, error } = await supabaseAdmin
      .from("departments")
      .update({ is_active: false })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error deleting department:", error)
      if (error.code === "PGRST116") { // No rows returned
        return NextResponse.json({ error: "Department not found" }, { status: 404 })
      }
      return NextResponse.json({ error: "Failed to delete department" }, { status: 500 })
    }

    return NextResponse.json({ message: "Department deleted successfully" })
  } catch (error) {
    console.error("Error in DELETE /api/departments/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}