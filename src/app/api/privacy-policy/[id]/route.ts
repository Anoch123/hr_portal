import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser, hasPermission } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"

// GET /api/privacy-policy/[id] - Get a single privacy policy
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { hasPermission: canRead } = await hasPermission(user.id, "privacy_policy:read")
    if (!canRead) {
      return NextResponse.json({ error: "You do not have permission to read privacy policy." }, { status: 403 })
    }

    const { id } = await params

    const { data: policy, error } = await supabaseAdmin
      .from("privacy_policy")
      .select("*, created_by_user:users!privacy_policy_created_by_fkey(id, first_name, last_name, email), updated_by_user:users!privacy_policy_updated_by_fkey(id, first_name, last_name, email)")
      .eq("id", id)
      .single()

    if (error) {
      console.error("Error fetching privacy policy:", error)
      return NextResponse.json({ error: "Privacy policy not found" }, { status: 404 })
    }

    return NextResponse.json(policy)
  } catch (error) {
    console.error("Error in GET /api/privacy-policy/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/privacy-policy/[id] - Update a privacy policy
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { hasPermission: canUpdate } = await hasPermission(user.id, "privacy_policy:update")
    if (!canUpdate) {
      return NextResponse.json({ error: "You do not have permission to update privacy policy." }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { title, content, version, is_active } = body

    // Check if policy exists
    const { data: existingPolicy, error: fetchError } = await supabaseAdmin
      .from("privacy_policy")
      .select("id")
      .eq("id", id)
      .single()

    if (fetchError || !existingPolicy) {
      return NextResponse.json({ error: "Privacy policy not found" }, { status: 404 })
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_by: user.id,
    }

    if (title !== undefined) {
      if (typeof title !== "string" || title.trim().length === 0) {
        return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 })
      }
      updateData.title = title.trim()
    }

    if (content !== undefined) {
      if (typeof content !== "string" || content.trim().length === 0) {
        return NextResponse.json({ error: "Content cannot be empty" }, { status: 400 })
      }
      updateData.content = content.trim()
    }

    if (version !== undefined) {
      updateData.version = version?.trim() || null
    }

    if (is_active !== undefined) {
      // If this policy is set to active, deactivate all other policies first
      if (is_active) {
        await supabaseAdmin
          .from("privacy_policy")
          .update({ is_active: false })
          .neq("id", id)
          .eq("is_active", true)
      }
      updateData.is_active = is_active
    }

    const { data: policy, error } = await supabaseAdmin
      .from("privacy_policy")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating privacy policy:", error)
      return NextResponse.json({ error: "Failed to update privacy policy" }, { status: 500 })
    }

    return NextResponse.json(policy)
  } catch (error) {
    console.error("Error in PUT /api/privacy-policy/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/privacy-policy/[id] - Delete a privacy policy
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { hasPermission: canDelete } = await hasPermission(user.id, "privacy_policy:delete")
    if (!canDelete) {
      return NextResponse.json({ error: "You do not have permission to delete privacy policy." }, { status: 403 })
    }

    const { id } = await params

    // Check if policy exists
    const { data: existingPolicy, error: fetchError } = await supabaseAdmin
      .from("privacy_policy")
      .select("id")
      .eq("id", id)
      .single()

    if (fetchError || !existingPolicy) {
      return NextResponse.json({ error: "Privacy policy not found" }, { status: 404 })
    }

    const { error } = await supabaseAdmin
      .from("privacy_policy")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting privacy policy:", error)
      return NextResponse.json({ error: "Failed to delete privacy policy" }, { status: 500 })
    }

    return NextResponse.json({ message: "Privacy policy deleted successfully" })
  } catch (error) {
    console.error("Error in DELETE /api/privacy-policy/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}