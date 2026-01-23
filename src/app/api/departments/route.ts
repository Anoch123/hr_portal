import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser, hasPermission } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"

// GET /api/departments - List all departments
export async function GET(request: NextRequest) {
  try {
    const { user } = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { hasPermission: canRead } = await hasPermission(user.id, "departments:read")
    if (!canRead) {
      return NextResponse.json({ error: "You do not have permission to read departments." }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const search = searchParams.get("search") || ""

    let query = supabaseAdmin
      .from("departments")
      .select("*", { count: "exact" })

    if (search) {
      query = query.ilike("name", `%${search}%`)
    }

    const { data: departments, count, error } = await query
      .eq("is_active", true)
      .order("name", { ascending: true })
      .range((page - 1) * limit, page * limit - 1)

    if (error) {
      console.error("Error fetching departments:", error)
      return NextResponse.json({ error: "Failed to fetch departments" }, { status: 500 })
    }

    return NextResponse.json({
      departments: departments || [],
      total: count || 0,
      page,
      limit,
    })
  } catch (error) {
    console.error("Error in GET /api/departments:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/departments - Create a new department
export async function POST(request: NextRequest) {
  try {
    const { user } = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { hasPermission: canCreate } = await hasPermission(user.id, "departments:create")
    if (!canCreate) {
      return NextResponse.json({ error: "You do not have permission to create departments." }, { status: 403 })
    }

    const body = await request.json()
    const { name, description } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Department name is required" }, { status: 400 })
    }

    const { data: department, error } = await supabaseAdmin
      .from("departments")
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating department:", error)
      if (error.code === "23505") { // Unique constraint violation
        return NextResponse.json({ error: "Department name already exists" }, { status: 409 })
      }
      return NextResponse.json({ error: "Failed to create department" }, { status: 500 })
    }

    return NextResponse.json(department, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/departments:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to get user profile
async function getUserProfile(userId: string) {
  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", userId)
    .single()

  if (error) {
    throw new Error("Failed to get user profile")
  }

  return { user }
}