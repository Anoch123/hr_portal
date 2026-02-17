import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"

// GET /api/attendance - List attendance records
export async function GET(request: NextRequest) {
  try {
    const { user } = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const month = searchParams.get("month")
    const year = searchParams.get("year")
    const limit = parseInt(searchParams.get("limit") || "100")
    const offset = parseInt(searchParams.get("offset") || "0")

    let query = supabaseAdmin
      .from("attendance")
      .select(`
        id,
        user_id,
        date,
        check_in,
        check_out,
        status,
        working_hours,
        overtime_hours,
        source,
        notes,
        created_at,
        updated_at,
        users:user_id (first_name, last_name, email, department)
      `)
      .order("date", { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters based on role
    // Users can only see their own attendance unless they're admin/hr/manager
    const { data: userProfile } = await supabaseAdmin
      .from("users")
      .select("role, manager_id")
      .eq("id", user.id)
      .single()

    const isAdminOrHR = userProfile?.role === "ADMIN" || userProfile?.role === "HR_MANAGER"
    const isManager = userProfile?.role === "MANAGER"

    if (!isAdminOrHR && !isManager) {
      // Regular employee can only see their own attendance
      query = query.eq("user_id", user.id)
    } else if (userId) {
      query = query.eq("user_id", userId)
    }

    if (startDate) {
      query = query.gte("date", startDate)
    }

    if (endDate) {
      query = query.lte("date", endDate)
    }

    // Handle month and year parameters
    if (month && year) {
      const startOfMonth = `${year}-${month.padStart(2, '0')}-01`
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
      const endOfMonth = `${year}-${month.padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`
      query = query.gte("date", startOfMonth)
      query = query.lte("date", endOfMonth)
    }

    const { data: attendance, error } = await query

    if (error) {
      console.error("Error fetching attendance:", error)
      // Check if table exists
      if (error.code === 'PGRST205' || error.message?.includes("Could not find the table")) {
        return NextResponse.json(
          { error: "Attendance table not found. Please run database migrations." },
          { status: 500 }
        )
      }
      return NextResponse.json({ error: "Failed to fetch attendance" }, { status: 500 })
    }

    // Get total count
    let countQuery = supabaseAdmin
      .from("attendance")
      .select("*", { count: "exact", head: true })

    if (!isAdminOrHR && !isManager) {
      countQuery = countQuery.eq("user_id", user.id)
    } else if (userId) {
      countQuery = countQuery.eq("user_id", userId)
    }

    if (startDate) {
      countQuery = countQuery.gte("date", startDate)
    }

    if (endDate) {
      countQuery = countQuery.lte("date", endDate)
    }

    // Handle month and year parameters for count query
    if (month && year) {
      const startOfMonth = `${year}-${month.padStart(2, '0')}-01`
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
      const endOfMonth = `${year}-${month.padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`
      countQuery = countQuery.gte("date", startOfMonth)
      countQuery = countQuery.lte("date", endOfMonth)
    }

    const { count } = await countQuery

    return NextResponse.json({
      attendance: attendance || [],
      total: count || 0,
      limit,
      offset
    })
  } catch (error) {
    console.error("Error in GET /api/attendance:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/attendance - Create or update attendance records
export async function POST(request: NextRequest) {
  try {
    const { user } = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check permission
    const { data: userProfile } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    const isAdminOrHR = userProfile?.role === "ADMIN" || userProfile?.role === "HR_MANAGER"
    
    if (!isAdminOrHR) {
      return NextResponse.json({ error: "You do not have permission to manage attendance" }, { status: 403 })
    }

    const body = await request.json()
    const { records } = body

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: "Records array is required" }, { status: 400 })
    }

    // Process each record
    const results = []
    const errors = []

    for (const record of records) {
      const { userId, date, checkIn, checkOut, status, workingHours, overtimeHours, notes, source } = record

      if (!userId || !date) {
        errors.push({ record, error: "userId and date are required" })
        continue
      }

      // Check if record already exists
      const { data: existingRecord } = await supabaseAdmin
        .from("attendance")
        .select("id")
        .eq("user_id", userId)
        .eq("date", date)
        .single()

      if (existingRecord) {
        // Update existing record
        const { data: updatedRecord, error: updateError } = await supabaseAdmin
          .from("attendance")
          .update({
            check_in: checkIn,
            check_out: checkOut,
            status: status || "PRESENT",
            working_hours: workingHours,
            overtime_hours: overtimeHours,
            notes,
            source: source || "MANUAL",
            updated_at: new Date().toISOString()
          })
          .eq("id", existingRecord.id)
          .select()
          .single()

        if (updateError) {
          errors.push({ record, error: updateError.message })
        } else {
          results.push(updatedRecord)
        }
      } else {
        // Insert new record
        const { data: newRecord, error: insertError } = await supabaseAdmin
          .from("attendance")
          .insert({
            user_id: userId,
            date,
            check_in: checkIn,
            check_out: checkOut,
            status: status || "PRESENT",
            working_hours: workingHours,
            overtime_hours: overtimeHours,
            notes,
            source: source || "MANUAL"
          })
          .select()
          .single()

        if (insertError) {
          errors.push({ record, error: insertError.message })
        } else {
          results.push(newRecord)
        }
      }
    }

    return NextResponse.json({
      message: `Processed ${results.length} records successfully`,
      inserted: results,
      errors: errors.length > 0 ? errors : undefined
    }, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/attendance:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/attendance - Update a single attendance record
export async function PATCH(request: NextRequest) {
  try {
    const { user } = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check permission
    const { data: userProfile } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    const isAdminOrHR = userProfile?.role === "ADMIN" || userProfile?.role === "HR_MANAGER"
    
    if (!isAdminOrHR) {
      return NextResponse.json({ error: "You do not have permission to update attendance" }, { status: 403 })
    }

    const body = await request.json()
    const { id, checkIn, checkOut, status, workingHours, overtimeHours, notes } = body

    if (!id) {
      return NextResponse.json({ error: "Attendance ID is required" }, { status: 400 })
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (checkIn !== undefined) updateData.check_in = checkIn
    if (checkOut !== undefined) updateData.check_out = checkOut
    if (status !== undefined) updateData.status = status
    if (workingHours !== undefined) updateData.working_hours = workingHours
    if (overtimeHours !== undefined) updateData.overtime_hours = overtimeHours
    if (notes !== undefined) updateData.notes = notes

    const { data: updatedRecord, error } = await supabaseAdmin
      .from("attendance")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating attendance:", error)
      return NextResponse.json({ error: "Failed to update attendance" }, { status: 500 })
    }

    return NextResponse.json({
      message: "Attendance record updated successfully",
      record: updatedRecord
    })
  } catch (error) {
    console.error("Error in PATCH /api/attendance:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/attendance - Delete attendance record
export async function DELETE(request: NextRequest) {
  try {
    const { user } = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check permission
    const { data: userProfile } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    const isAdminOrHR = userProfile?.role === "ADMIN" || userProfile?.role === "HR_MANAGER"
    
    if (!isAdminOrHR) {
      return NextResponse.json({ error: "You do not have permission to delete attendance" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Attendance ID is required" }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from("attendance")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting attendance:", error)
      return NextResponse.json({ error: "Failed to delete attendance" }, { status: 500 })
    }

    return NextResponse.json({ message: "Attendance record deleted successfully" })
  } catch (error) {
    console.error("Error in DELETE /api/attendance:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
