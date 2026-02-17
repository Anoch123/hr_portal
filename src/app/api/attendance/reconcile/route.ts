import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"

// POST /api/attendance/reconcile - Reconcile attendance with leave data from database
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
      return NextResponse.json({ error: "You do not have permission to reconcile attendance" }, { status: 403 })
    }

    const body = await request.json()
    const { month, year } = body

    if (!month || !year) {
      return NextResponse.json({ error: "Month and year are required" }, { status: 400 })
    }

    // Check if attendance records already exist for this month/year
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`

    // Fetch existing attendance records from the database
    const { data: attendanceRecords, error: fetchError } = await supabaseAdmin
      .from("attendance")
      .select("id, user_id, date, status")
      .gte("date", startDate)
      .lte("date", endDate)

    if (fetchError) {
      console.error("Error fetching attendance records:", fetchError)
      return NextResponse.json({ error: "Failed to fetch attendance records" }, { status: 500 })
    }

    if (!attendanceRecords || attendanceRecords.length === 0) {
      return NextResponse.json({ 
        error: "No attendance records found for this month/year in Attendance Records. Please upload the attendance data first using the Upload tab.",
        noRecordsFound: true
      }, { status: 400 })
    }

    // Get approved leave requests for the month
    const { data: leaveRequests } = await supabaseAdmin
      .from("leave_requests")
      .select(`
        user_id,
        start_date,
        end_date,
        leave_types:name,
        status
      `)
      .eq("status", "APPROVED")
      .or(`and(start_date.lte.${endDate},end_date.gte.${startDate})`)

    // Create a map of leave dates per user
    const leaveDatesMap = new Map<string, Set<string>>()
    
    if (leaveRequests) {
      for (const lr of leaveRequests) {
        const userId = lr.user_id
        if (!leaveDatesMap.has(userId)) {
          leaveDatesMap.set(userId, new Set<string>())
        }
        
        // Add all dates in the leave range
        const start = new Date(lr.start_date)
        const end = new Date(lr.end_date)
        const current = new Date(start)
        
        while (current <= end) {
          const dateStr = current.toISOString().split('T')[0]
          leaveDatesMap.get(userId)?.add(dateStr)
          current.setDate(current.getDate() + 1)
        }
      }
    }

    // Update attendance records that fall on leave days
    let updated = 0
    let skipped = 0
    let errors = 0

    for (const record of attendanceRecords) {
      const isLeaveDay = leaveDatesMap.get(record.user_id)?.has(record.date)

      if (isLeaveDay && record.status !== "ON_LEAVE") {
        // Update the record to ON_LEAVE status
        const { error: updateError } = await supabaseAdmin
          .from("attendance")
          .update({
            status: "ON_LEAVE",
            source: "RECONCILED",
            updated_at: new Date().toISOString()
          })
          .eq("id", record.id)

        if (updateError) {
          errors++
          console.error(`Error updating record ${record.id}:`, updateError)
        } else {
          updated++
        }
      } else {
        skipped++
      }
    }

    return NextResponse.json({
      message: `Reconciliation completed: ${updated} records updated to ON_LEAVE, ${skipped} records skipped (already ON_LEAVE or no leave), ${errors} errors`,
      results: {
        updated,
        skipped,
        errors
      }
    })
  } catch (error) {
    console.error("Error in POST /api/attendance/reconcile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
