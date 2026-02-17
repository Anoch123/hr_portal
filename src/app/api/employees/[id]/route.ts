import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser, hasPermission } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"

// GET /api/employees/[id] - Get single employee
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

    const { hasPermission: canRead } = await hasPermission(user.id, "ADMIN")
    if (!canRead) {
      return NextResponse.json({ error: "You do not have permission to read employees." }, { status: 403 })
    }

    const { data: employee, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", id)
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user } = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { hasPermission: canUpdate } = await hasPermission(user.id, "HR_MANAGER")
    if (!canUpdate) {
      return NextResponse.json({ error: "You do not have permission to update employees." }, { status: 403 })
    }

    let body: any
    try {
      body = await request.json()
    } catch (parseError) {
      console.error("Error parsing request body:", parseError)
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
    }

    // Map incoming body keys to DB column names and whitelist allowed fields
    const updateData: Record<string, any> = {}
    if (body.email !== undefined) updateData.email = body.email
    if (body.first_name !== undefined) updateData.first_name = body.first_name
    if (body.last_name !== undefined) updateData.last_name = body.last_name
    if (body.role !== undefined) updateData.role = body.role
    if (body.department_id !== undefined || body.departmentId !== undefined) updateData.department_id = body.department_id || body.departmentId
    if (body.position !== undefined) updateData.position = body.position
    if (body.nic_no !== undefined) updateData.nic_no = body.nic_no
    // Handle date fields - convert empty strings to null
    if (body.joining_date !== undefined) updateData.joining_date = body.joining_date ? body.joining_date : null
    if (body.employee_no !== undefined) updateData.employee_no = body.employee_no
    if (body.managerId !== undefined) updateData.manager_id = body.managerId
    if (body.is_active !== undefined) updateData.is_active = body.is_active
    if (body.is_on_probation !== undefined || body.isOnProbation !== undefined) updateData.is_on_probation = body.is_on_probation || body.isOnProbation
    if (body.probation_start_date !== undefined || body.probationStartDate !== undefined) {
      const probationDate = body.probation_start_date || body.probationStartDate
      updateData.probation_start_date = probationDate ? probationDate : null
    }
    if (body.probation_period_months !== undefined || body.probationPeriodMonths !== undefined) updateData.probation_period_months = body.probation_period_months || body.probationPeriodMonths
    if (body.resignation_date !== undefined) updateData.resignation_date = body.resignation_date ? body.resignation_date : null
    if (body.termination_reason !== undefined) updateData.termination_reason = body.termination_reason
    
    // Handle probation constraint logic:
    // - If setting is_on_probation to false, always clear probation_start_date
    // - If setting is_on_probation to true, probation_start_date is required
    if (updateData.is_on_probation === false) {
      // Removing from probation - clear the start date
      updateData.probation_start_date = null
    } else if (updateData.is_on_probation === true) {
      // Adding to probation - start date is required
      if (!updateData.probation_start_date && body.probation_start_date === undefined && body.probationStartDate === undefined) {
        return NextResponse.json(
          { error: "Probation start date is required when marking employee as on probation" },
          { status: 400 }
        )
      }
    }
    
    updateData.updated_at = new Date().toISOString()

    console.log(`Updating employee ${id} with data:`, updateData)

    const { data: employee, error } = await supabaseAdmin
      .from("users")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error(`Error updating employee ${id}:`, {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      // Check for specific error codes
      if (error.code === '23505') {
        // Unique constraint violation (e.g., email already exists)
        return NextResponse.json(
          { error: "Email or employee number already exists" },
          { status: 409 }
        )
      }
      if (error.code === '23514') {
        // Check constraint violation
        if (error.message.includes('probation_dates_check')) {
          return NextResponse.json(
            { error: "Probation start date is required when employee is on probation" },
            { status: 400 }
          )
        }
        if (error.message.includes('probation_period_positive')) {
          return NextResponse.json(
            { error: "Probation period must be a positive number" },
            { status: 400 }
          )
        }
      }
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: "Failed to deactivate employee" }, { status: 400 })
    }

    return NextResponse.json({ message: "Employee deactivated successfully" })
  } catch (error) {
    console.error("Error deleting employee:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}