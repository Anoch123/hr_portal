import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser, hasPermission, getUserProfile, ensureUserProfile } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-config"

// GET /api/leave-balances - Get leave balances
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString())
    const employeeId = searchParams.get("employee_id")

    let targetUserId = userId
    if (employeeId) {
      // Check if user has permission to view other employees' balances
      const { hasPermission: canViewOthers } = await hasPermission(userId, "leave_balances:read")
      if (!canViewOthers) {
        return NextResponse.json({ error: "You do not have permission to view leave balances." }, { status: 403 })
      }
      targetUserId = employeeId
    }

    console.log(targetUserId);
    const { data: balances, error } = await supabaseAdmin
      .from("leave_balances")
      .select(
        `
        *,
        leaveType:leave_types(*)
        `
      )
      .eq("user_id", targetUserId)
      .eq("year", year)
      .order("leaveType(name)", { ascending: true })

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json(
        { error: "Failed to fetch leave balances" },
        { status: 400 }
      )
    }

    return NextResponse.json(balances || [])
  } catch (error) {
    console.error("Error fetching leave balances:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/leave-balances - Create or update leave balance
export async function POST(request: NextRequest) {
  try {
    const { user } = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { hasPermission: canUpdate } = await hasPermission(user.id, "leave_balances:update")
    if (!canUpdate) {
      return NextResponse.json({ error: "You do not have permission to update leave balances." }, { status: 403 })
    }

    const body = await request.json()
    const { userId, leaveTypeId, year, totalDays, carriedOver } = body

    // Validate required fields
    if (!userId || !leaveTypeId) {
      return NextResponse.json(
        { error: "User ID and leave type ID are required" },
        { status: 400 }
      )
    }

    const targetYear = year || new Date().getFullYear()

    // Check if balance already exists
    const { data: existingBalance } = await supabaseAdmin
      .from("leave_balances")
      .select("*")
      .eq("user_id", userId)
      .eq("leave_type_id", leaveTypeId)
      .eq("year", targetYear)
      .single()

    let balance
    if (existingBalance) {
      // Update existing balance
      const { data: updatedBalance, error: updateError } = await supabaseAdmin
        .from("leave_balances")
        .update({
          total_days: totalDays !== undefined ? totalDays : existingBalance.total_days,
          carried_over: carriedOver !== undefined ? carriedOver : existingBalance.carried_over,
        })
        .eq("user_id", userId)
        .eq("leave_type_id", leaveTypeId)
        .eq("year", targetYear)
        .select(
          `
          *,
          leaveType:leave_types(*)
          `
        )
        .single()

      if (updateError) {
        throw updateError
      }

      balance = updatedBalance
    } else {
      // Get leave type details
      const { data: leaveType, error: leaveTypeError } = await supabaseAdmin
        .from("leave_types")
        .select("*")
        .eq("id", leaveTypeId)
        .single()

      if (leaveTypeError || !leaveType) {
        return NextResponse.json(
          { error: "Leave type not found" },
          { status: 404 }
        )
      }

      // Create new balance
      const { data: newBalance, error: createError } = await supabaseAdmin
        .from("leave_balances")
        .insert({
          user_id: userId,
          leave_type_id: leaveTypeId,
          year: targetYear,
          total_days: totalDays !== undefined ? totalDays : leaveType.default_days,
          carried_over: carriedOver || 0,
        })
        .select(
          `
          *,
          leaveType:leave_types(*)
          `
        )
        .single()

      if (createError) {
        throw createError
      }

      balance = newBalance
    }

    return NextResponse.json({
      message: "Leave balance updated successfully",
      balance,
    })
  } catch (error) {
    console.error("Error updating leave balance:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}