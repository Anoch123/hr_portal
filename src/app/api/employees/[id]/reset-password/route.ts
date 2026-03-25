import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser, hasPermission } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"

// POST /api/employees/[id]/reset-password - Admin sets new password for employee
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: employeeId } = await params
    const { user } = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if the current user is an admin
    const { hasPermission: isAdmin } = await hasPermission(user.id, "ADMIN")
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Only administrators can reset employee passwords" },
        { status: 403 }
      )
    }

    // Parse request body
    let body: { password: string }
    try {
      body = await request.json()
    } catch (parseError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      )
    }

    const { password } = body

    // Validate password
    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      )
    }

    // Get the employee details
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from("users")
      .select("id, email, first_name, last_name")
      .eq("id", employeeId)
      .single()

    if (employeeError || !employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    // Prevent admin from resetting their own password through this endpoint
    if (employeeId === user.id) {
      return NextResponse.json(
        { error: "You cannot reset your own password through this endpoint" },
        { status: 400 }
      )
    }

    // Set the new password directly using Supabase admin API
    const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
      employeeId,
      { password }
    )

    if (passwordError) {
      console.error("Error setting password:", passwordError)
      return NextResponse.json(
        { error: "Failed to set password" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: `Password has been reset for ${employee.first_name} ${employee.last_name}`,
    })
  } catch (error) {
    console.error("Error resetting employee password:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}