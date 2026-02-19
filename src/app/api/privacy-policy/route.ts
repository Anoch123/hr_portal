import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser, hasPermission } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"

// GET /api/privacy-policy - List all privacy policies
export async function GET(request: NextRequest) {
  try {
    const { user } = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { hasPermission: canRead } = await hasPermission(user.id, "privacy_policy:read")
    if (!canRead) {
      return NextResponse.json({ error: "You do not have permission to read privacy policy." }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get("active_only") === "true"

    let query = supabaseAdmin
      .from("privacy_policy")
      .select("*, created_by_user:users!privacy_policy_created_by_fkey(id, first_name, last_name, email), updated_by_user:users!privacy_policy_updated_by_fkey(id, first_name, last_name, email)")

    if (activeOnly) {
      query = query.eq("is_active", true)
    }

    const { data: policies, error } = await query
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching privacy policies:", error)
      return NextResponse.json({ error: "Failed to fetch privacy policies" }, { status: 500 })
    }

    return NextResponse.json({
      policies: policies || [],
    })
  } catch (error) {
    console.error("Error in GET /api/privacy-policy:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/privacy-policy - Create a new privacy policy
export async function POST(request: NextRequest) {
  try {
    const { user } = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { hasPermission: canCreate } = await hasPermission(user.id, "privacy_policy:create")
    if (!canCreate) {
      return NextResponse.json({ error: "You do not have permission to create privacy policy." }, { status: 403 })
    }

    const body = await request.json()
    const { title, content, version, is_active } = body

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    // If this policy is set to active, deactivate all other policies first
    if (is_active) {
      await supabaseAdmin
        .from("privacy_policy")
        .update({ is_active: false })
        .eq("is_active", true)
    }

    const { data: policy, error } = await supabaseAdmin
      .from("privacy_policy")
      .insert({
        title: title.trim(),
        content: content.trim(),
        version: version?.trim() || null,
        is_active: is_active ?? true,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating privacy policy:", error)
      return NextResponse.json({ error: "Failed to create privacy policy" }, { status: 500 })
    }

    return NextResponse.json(policy, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/privacy-policy:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
