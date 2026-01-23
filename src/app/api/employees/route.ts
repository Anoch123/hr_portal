import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser, hasPermission, getUserProfile } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { sendEmail, emailTemplates } from "@/lib/email"
import { generatePassword } from "@/lib/utils"

// GET /api/employees - List all employees
export async function GET(request: NextRequest) {
  try {
    const { user } = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { user: userProfile } = await getUserProfile(user.id)
    const { hasPermission: canRead } = await hasPermission(user.id, "ADMIN")
    if (!canRead) {
      return NextResponse.json({ error: "You do not have permission to read employees." }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const search = searchParams.get("search") || ""
    const department = searchParams.get("department") || ""
    const role = searchParams.get("role") || ""

    let query = supabaseAdmin
      .from("users")
      .select("*, manager:manager_id(id, first_name, last_name), department:department_id(id, name)", { count: "exact" })

    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
      )
    }

    if (department) {
      // Filter by department name (join with departments table)
      query = query.eq("department.name", department)
    }

    if (role) {
      query = query.eq("role", role)
    }

    const { data: employees, count } = await query
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    return NextResponse.json({
      employees,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching employees:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/employees - Create new employee
export async function POST(request: NextRequest) {
  try {
    const { user } = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { hasPermission: canCreate } = await hasPermission(user.id, "ADMIN")
    if (!canCreate) {
      return NextResponse.json({ error: "You do not have permission to create employees." }, { status: 403 })
    }

    const body = await request.json()
    console.log("POST body received:", body)

    // Normalize camelCase to snake_case
    const email = body.email
    const first_name = body.first_name || body.firstName
    const last_name = body.last_name || body.lastName
    const role = body.role
    const department_id = body.department_id || body.departmentId
    const position = body.position
    const nic_no = body.nic_no
    const joining_date = body.joining_date
    const employee_no = body.employee_no
    const managerId = body.managerId

    // Validate required fields
    if (!email || !first_name || !last_name) {
      console.error("Validation failed:", { email, first_name, last_name })
      return NextResponse.json(
        { error: "Email, first name, and last name are required" },
        { status: 400 }
      )
    }

    // Check if email already exists
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      )
    }

    // Generate temporary password
    const tempPassword = generatePassword()

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    })

    if (authError) {
      console.error("Auth user creation error:", authError)
      return NextResponse.json(
        { error: `Failed to create user: ${authError.message}` },
        { status: 400 }
      )
    }

    // Create user profile
    const { data: newUser, error: userError } = await supabaseAdmin
      .from("users")
      .insert({
        id: authData.user.id,
        email,
        first_name: first_name,
        last_name: last_name,
        role: role || "EMPLOYEE",
        department_id,
        position,
        nic_no,
        joining_date,
        employee_no,
        manager_id: managerId,
      })
      .select()
      .single()

    if (userError) {
      console.error("User profile creation error:", userError)
      return NextResponse.json(
        { error: "Failed to create user profile" },
        { status: 400 }
      )
    }

    // Get all active leave types and create balances
    const { data: leaveTypes } = await supabaseAdmin
      .from("leave_types")
      .select("*")
      .eq("is_active", true)

    const currentYear = new Date().getFullYear()
    if (leaveTypes && leaveTypes.length > 0) {
      await Promise.all(
        leaveTypes.map((leaveType) =>
          supabaseAdmin.from("leave_balances").insert({
            user_id: authData.user.id,
            leave_type_id: leaveType.id,
            year: currentYear,
            total_days: leaveType.default_days,
          })
        )
      )
    }

    // Send welcome email
    const emailContent = emailTemplates.welcomeEmployee(
      `${first_name} ${last_name}`,
      email,
      tempPassword
    )
    const emailResult = await sendEmail({
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
    })
    
    if (!emailResult.success) {
      console.warn("Welcome email failed to send (non-critical):", emailResult.error)
    }

    return NextResponse.json(
      {
        message: "Employee created successfully",
        employee: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.first_name,
          lastName: newUser.last_name,
          role: newUser.role,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating employee:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}