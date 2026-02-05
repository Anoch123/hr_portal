import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"
import * as XLSX from "xlsx"

// ---------------- HELPERS ----------------

function normalize(text: string) {
  return text
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function parseMonthYear(rows: any[][]) {
  for (const row of rows) {
    for (const cell of row) {
      if (!cell) continue
      const match = cell
        .toString()
        .match(/(\d{2})\/(\d{2})\/(\d{4})/)
      if (match) {
        return { month: match[2], year: match[3] }
      }
    }
  }
  throw new Error("Date range not found in Excel")
}

function buildDate(day: number, month: string, year: string) {
  return `${year}-${month}-${String(day).padStart(2, "0")}`
}

function calculateWorkingHours(inT: string, outT: string) {
  const [ih, im] = inT.split(":").map(Number)
  const [oh, om] = outT.split(":").map(Number)
  return Number((((oh * 60 + om) - (ih * 60 + im)) / 60).toFixed(2))
}

function determineStatus(inTime: string | null, outTime: string | null, workingHours: number | null) {
  // If no check-in time, it's ABSENT
  if (!inTime) {
    return "ABSENT"
  }

  // If check-in exists but no check-out, can't determine half day
  if (!outTime || !workingHours) {
    return "PRESENT"
  }

  // If working hours are less than 4 hours (half of 8), it's HALF_DAY
  if (workingHours < 4) {
    return "HALF_DAY"
  }

  // Check for late arrival
  if (inTime <= "08:45") {
    return "PRESENT"
  } else if (inTime > "09:00") {
    return "SHORT_LEAVE"
  } else {
    return "LATE"
  }
}

function isTimeRow(text: string) {
  return /^\d{2}:\d{2}/.test(text)
}

function isValidEmployeeNo(value: string) {
  if (!value || value.trim().length === 0) return false // empty string
  if (!/^\d+$/.test(value)) return false // not all digits
  const num = Number(value)
  if (num >= 1 && num <= 31) return false // prevent day numbers
  return true
}

// ---------------- API ----------------

export async function POST(request: NextRequest) {
  try {
    const { user } = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      blankrows: false
    }) as any[][]

    // -------- MONTH / YEAR --------
    const { month, year } = parseMonthYear(rows)

    // -------- LOAD EMPLOYEES --------
    const { data: employees } = await supabaseAdmin
      .from("users")
      .select("id, employee_no, first_name, last_name, email, department:department_id(name)")

    const empMap = new Map<string, any>()
    for (const e of employees || []) {
      if (e.employee_no) {
        empMap.set(e.employee_no.toString(), e)
      }
    }

    const attendance: any[] = []
    const notFoundEmployeeIds: string[] = []

    // -------- BUILD DAY COLUMN MAP --------
    // First row contains day numbers, we need to map columns to days
    let dayColumnMap: { [key: number]: number } = {} // { column_index: day_number }
    if (rows.length > 0) {
      const headerRow = rows[2]
      for (let col = 0; col < headerRow.length; col++) {
        const cellValue = headerRow[col]?.toString().trim()
        const dayNum = parseInt(cellValue)
        if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
          dayColumnMap[col] = dayNum
        }
      }
    }

    // -------- PARSING --------
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] || []
      const firstCell = normalize(row[0]?.toString() || "")

      // ---- EMPLOYEE BLOCK START ----
      if (firstCell === "ID :") {
        const employeeNo = normalize(row[2]?.toString() || "")
        
        if (!isValidEmployeeNo(employeeNo)) continue

        const employee = empMap.get(employeeNo)
        // console.log(employee);
        if (!employee) {
          notFoundEmployeeIds.push(employeeNo)
          continue
        }

        // Next row contains the time/attendance data across columns
        const attendanceRow = rows[i + 1] || []

        // Parse attendance data using the day column map
        for (const colStr in dayColumnMap) {
          const col = parseInt(colStr)
          const day = dayColumnMap[col]
          
          if (col >= attendanceRow.length) continue
          
          const timeData = normalize(attendanceRow[col]?.toString() || "")
          // If no time data, employee is ABSENT
          if (!timeData) {
            const date = buildDate(day, month, year)
            attendance.push({
              id: `preview-${employee.id}-${date}`,
              user_id: employee.id,
              employee_no: employeeNo,
              day,
              date,
              check_in: null,
              check_out: null,
              working_hours: null,
              status: "ABSENT",
              source: "EXCEL",
              users: {
                first_name: employee.first_name,
                last_name: employee.last_name,
                email: employee.email,
                department: employee.department?.name ?? null
              }
            })
            continue
          }

          // Times are space-separated or newline-separated in the same cell: "08:46\r\n16:59\r\n"
          const timeParts = timeData.split(/[\s\r\n]+/).filter(Boolean)
          if (timeParts.length === 0) continue
          
          const checkIn = timeParts[0]?.trim()
          const checkOut = timeParts[1]?.trim() || null

          
          if (!checkIn || !isTimeRow(checkIn)) continue
          
          const date = buildDate(day, month, year)
          const workingHours = checkOut ? calculateWorkingHours(checkIn, checkOut) : null
          const status = determineStatus(checkIn, checkOut, workingHours)

          attendance.push({
            id: `preview-${employee.id}-${date}`,
            user_id: employee.id,
            employee_no: employeeNo,
            day,
            date,
            check_in: checkIn,
            check_out: checkOut,
            working_hours: workingHours,
            status: status,
            source: "EXCEL",
            users: {
              first_name: employee.first_name,
              last_name: employee.last_name,
              email: employee.email,
              department: employee.department?.name ?? null
            }
          })
        }
      }
    }

    // -------- RESPONSE --------
    // Group attendance by employee for display
    const attendanceByEmployee: { [key: string]: any } = {}
    for (const record of attendance) {
      if (!attendanceByEmployee[record.user_id]) {
        attendanceByEmployee[record.user_id] = {
          user_id: record.user_id,
          employee_no: record.employee_no,
          first_name: record.users.first_name,
          last_name: record.users.last_name,
          email: record.users.email,
          department: record.users.department,
          days: {}
        }
      }
      attendanceByEmployee[record.user_id].days[record.day] = {
        date: record.date,
        check_in: record.check_in,
        check_out: record.check_out,
        working_hours: record.working_hours,
        status: record.status
      }
    }

    
    const employeeAttendance = Object.values(attendanceByEmployee)
    // console.log(employeeAttendance);

    return NextResponse.json({
      message: "Attendance preview generated successfully",
      totalRecords: attendance.length,
      uniqueEmployees: employeeAttendance.length,
      employeeAttendance,
      rawAttendance: attendance,
      notFoundEmployeeIds: notFoundEmployeeIds.length
        ? [...new Set(notFoundEmployeeIds)]
        : undefined
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
