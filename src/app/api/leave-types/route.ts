import { NextRequest, NextResponse } from "next/server"
import { supabase, supabaseAdmin } from "@/lib/supabase"
import { getLeaveTypes } from "@/lib/leave"

// GET /api/leave-types - List all leave types
export async function GET(request: NextRequest) {
  try {

    const { leaveTypes, error } = await getLeaveTypes()

    if (error) throw error

    return NextResponse.json(leaveTypes)
  } catch (error) {
    console.error("Error fetching leave types:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/leave-types - Create new leave type (Admin only)
export async function POST(request: NextRequest) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userProfile || userProfile.role !== 'ADMIN') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      description,
      default_days,
      is_paid,
      requires_approval,
      max_consecutive_days,
    } = body

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      )
    }

    // Check if name already exists
    const { data: existingType, error: checkError } = await supabaseAdmin
      .from('leave_types')
      .select('id')
      .eq('name', name)
      .single()

    if (existingType && !checkError) {
      return NextResponse.json(
        { error: "Leave type with this name already exists" },
        { status: 400 }
      )
    }

    const { data: leaveType, error } = await supabaseAdmin
      .from('leave_types')
      .insert({
        name,
        description: description || null,
        default_days: default_days || 0,
        is_paid: is_paid !== undefined ? is_paid : true,
        requires_approval: requires_approval !== undefined ? requires_approval : true,
        max_consecutive_days: max_consecutive_days || null,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(
      {
        message: "Leave type created successfully",
        leaveType,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating leave type:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
