import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser, hasPermission } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"

// GET /api/role-permissions - Get all role permissions
export async function GET(request: NextRequest) {
  try {
    const { user } = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { hasPermission: canRead } = await hasPermission(user.id, "role_permissions:read")
    if (!canRead) {
      return NextResponse.json({ error: "You dont have permission to read role permissions" }, { status: 403 })
    }

    const { data: rolePermissions, error } = await supabaseAdmin
      .from("role_permissions")
      .select(`
        id,
        role,
        permission:permissions(*)
      `)
      .order("role", { ascending: true })

    if (error) {
      console.error("Error fetching role permissions:", error)
      return NextResponse.json({ error: "Failed to fetch role permissions" }, { status: 500 })
    }

    // Group by role
    const groupedPermissions = rolePermissions?.reduce((acc: any, rp: any) => {
      if (!acc[rp.role]) {
        acc[rp.role] = []
      }
      acc[rp.role].push({
        id: rp.id,
        permission: rp.permission
      })
      return acc
    }, {}) || {}

    return NextResponse.json({ rolePermissions: groupedPermissions })
  } catch (error) {
    console.error("Error in GET /api/role-permissions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/role-permissions - Assign permission to role
export async function POST(request: NextRequest) {
  try {
    const { user } = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { hasPermission: canUpdate } = await hasPermission(user.id, "role_permissions:update")
    if (!canUpdate) {
      return NextResponse.json({ error: "You do not have permission to update role permissions." }, { status: 403 })
    }

    const body = await request.json()
    const { role, permissionId } = body

    if (!role || !permissionId) {
      return NextResponse.json({ error: "Role and permissionId are required" }, { status: 400 })
    }

    const validRoles = ['ADMIN', 'HR_MANAGER', 'MANAGER', 'EMPLOYEE']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    const { data: rolePermission, error } = await supabaseAdmin
      .from("role_permissions")
      .insert({
        role,
        permission_id: permissionId,
      })
      .select(`
        id,
        role,
        permission:permissions(*)
      `)
      .single()

    if (error) {
      console.error("Error assigning permission:", error)
      if (error.code === "23505") {
        return NextResponse.json({ error: "Permission already assigned to this role" }, { status: 409 })
      }
      return NextResponse.json({ error: "Failed to assign permission" }, { status: 500 })
    }

    return NextResponse.json(rolePermission, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/role-permissions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/role-permissions - Remove permission from role
export async function DELETE(request: NextRequest) {
  try {
    const { user } = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { hasPermission: canUpdate } = await hasPermission(user.id, "role_permissions:update")
    if (!canUpdate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get("role")
    const permissionId = searchParams.get("permissionId")

    if (!role || !permissionId) {
      return NextResponse.json({ error: "Role and permissionId are required" }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from("role_permissions")
      .delete()
      .eq("role", role)
      .eq("permission_id", permissionId)

    if (error) {
      console.error("Error removing permission:", error)
      return NextResponse.json({ error: "Failed to remove permission" }, { status: 500 })
    }

    return NextResponse.json({ message: "Permission removed successfully" })
  } catch (error) {
    console.error("Error in DELETE /api/role-permissions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}