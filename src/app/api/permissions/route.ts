import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser, hasPermission } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"

// GET /api/permissions - List all permissions
export async function GET(request: NextRequest) {
  try {
    const { user } = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { hasPermission: canRead } = await hasPermission(user.id, "permissions:read")
    if (!canRead) {
      return NextResponse.json({ error: "You do not have permission to read permissions." }, { status: 403 })
    }

    const { data: permissions, error } = await supabaseAdmin
      .from("permissions")
      .select("*")
      .eq("is_active", true)
      .order("module", { ascending: true })
      .order("action", { ascending: true })

    if (error) {
      console.error("Error fetching permissions:", error)
      return NextResponse.json({ error: "Failed to fetch permissions" }, { status: 500 })
    }

    return NextResponse.json({ permissions: permissions || [] })
  } catch (error) {
    console.error("Error in GET /api/permissions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/permissions - Create a new permission
export async function POST(request: NextRequest) {
  try {
    const { user } = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { hasPermission: canCreate } = await hasPermission(user.id, "permissions:create")
    if (!canCreate) {
      return NextResponse.json({ error: "You do not have permission to create permissions." }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, module, action } = body

    if (!name || !module || !action) {
      return NextResponse.json({ error: "Name, module, and action are required" }, { status: 400 })
    }

    const { data: permission, error } = await supabaseAdmin
      .from("permissions")
      .insert({
        name,
        description,
        module,
        action,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating permission:", error)
      if (error.code === "23505") {
        return NextResponse.json({ error: "Permission name already exists" }, { status: 409 })
      }
      return NextResponse.json({ error: "Failed to create permission" }, { status: 500 })
    }

    return NextResponse.json(permission, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/permissions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}