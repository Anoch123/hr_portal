import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"
import * as XLSX from "xlsx"

// POST /api/attendance/preview - Preview attendance data from Excel without saving
export async function POST(request: NextRequest) {
  try {
    const { user } = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    // Validate file type
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv"
    ]

    if (!validTypes.includes(file.type) && !file.name.endsWith(".csv")) {
      return NextResponse.json({ 
        error: "Invalid file type. Please upload an Excel (.xlsx, .xls) or CSV file" 
      }, { status: 400 })
    }

    // Read file content
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Parse Excel
    let rawData: any[] = []
    
    if (file.name.endsWith(".csv")) {
      rawData = parseCSV(buffer)
    } else {
      rawData = await parseExcel(buffer)
    }

    if (rawData.length === 0) {
      return NextResponse.json({ error: "No data found in the file" }, { status: 400 })
    }

    console.log("Parsed rows:", rawData.length)
    console.log("Sample row keys:", Object.keys(rawData[0] || {}))

    // Get all employees from database
    const { data: employees } = await supabaseAdmin
      .from("users")
      .select("id, employee_no, first_name, last_name, email, department")

    // Build lookup maps
    const employeeNoToUser = new Map<string, any>()
    const emailToUser = new Map<string, any>()
    
    for (const emp of employees || []) {
      if (emp.employee_no) {
        employeeNoToUser.set(emp.employee_no.toString().trim(), emp)
      }
      if (emp.email) {
        emailToUser.set(emp.email.toLowerCase().trim(), emp)
      }
    }

    // Process each row to find employee and attendance data
    const previewData: any[] = []
    const notFound: string[] = []

    for (const row of rawData) {
      // Extract employee ID from various possible column positions
      let employeeId: string | null = null
      let employeeName: string | null = null
      let dateRange: string | null = null
      let checkIn: string | null = null
      let checkOut: string | null = null

      // Handle various column name formats
      // For merged cells, values might be in __EMPTY_1, __EMPTY_2, etc.
      const keys = Object.keys(row)
      
      // Try to find ID from various column patterns
      for (const key of keys) {
        const value = row[key]?.toString().trim()
        if (!value) continue

        // Skip label cells like "ID :", "Name :", etc.
        if (value.includes(":")) continue

        // Check if this looks like an employee ID (numeric)
        if (/^\d+$/.test(value) && !employeeId) {
          // This could be an employee ID
          // Look at the next non-empty value for the name
          const keyIndex = keys.indexOf(key)
          for (let i = keyIndex + 1; i < keys.length; i++) {
            const nextValue = row[keys[i]]?.toString().trim()
            if (nextValue && !nextValue.includes(":") && nextValue.length > 1) {
              employeeName = nextValue
              break
            }
          }
          employeeId = value
        }
      }

      // Alternative: Find by position if the structure is known
      // For fingerprint logs format: ID in one column, Name in another
      if (!employeeId) {
        // Try column index-based approach
        const values = Object.values(row).map(v => v?.toString().trim()).filter(v => v) as string[]
        
        // Find numeric ID (likely the employee number)
        for (let i = 0; i < values.length; i++) {
          if (/^\d{2,5}$/.test(values[i])) {
            employeeId = values[i]
            // Name is likely the next string value
            for (let j = i + 1; j < values.length; j++) {
              if (values[j] && !values[j].includes(":") && !/^\d+$/.test(values[j])) {
                employeeName = values[j]
                break
              }
            }
            break
          }
        }
      }

      // Try to find employee in database by employee_no
      let matchedEmployee = employeeId ? employeeNoToUser.get(employeeId) : null

      // If not found, try to find by name
      if (!matchedEmployee && employeeName) {
        matchedEmployee = employees?.find(e => 
          e.first_name?.toLowerCase().includes(employeeName!.toLowerCase()) ||
          e.last_name?.toLowerCase().includes(employeeName!.toLowerCase())
        )
      }

      // Get date range and times from the row
      dateRange = findDateRange(row) || "Not found"
      checkIn = findCheckIn(row)
      checkOut = findCheckOut(row)

      if (employeeId) {
        previewData.push({
          employeeId: employeeId,
          employeeName: employeeName || (matchedEmployee ? `${matchedEmployee.first_name} ${matchedEmployee.last_name}` : "Not found"),
          databaseMatch: matchedEmployee ? "Found" : "Not Found",
          databaseEmployee: matchedEmployee ? {
            id: matchedEmployee.id,
            name: `${matchedEmployee.first_name} ${matchedEmployee.last_name}`,
            email: matchedEmployee.email,
            department: matchedEmployee.department
          } : null,
          dateRange: dateRange,
          checkIn: checkIn,
          checkOut: checkOut,
          dates: dateRange !== "Not found" ? parseDateRange(dateRange).length : 0
        })

        if (!matchedEmployee) {
          notFound.push(employeeId)
        }
      }
    }

    return NextResponse.json({
      message: `Preview of ${previewData.length} rows from file`,
      preview: previewData,
      summary: {
        totalRows: rawData.length,
        matchedEmployees: previewData.filter(p => p.databaseMatch === "Found").length,
        unmatchedEmployees: [...new Set(notFound)]
      }
    }, { status: 200 })
  } catch (error) {
    console.error("Error in POST /api/attendance/preview:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Parse CSV file
function parseCSV(buffer: Buffer): any[] {
  const content = buffer.toString("utf-8")
  const lines = content.trim().split("\n")
  
  if (lines.length < 2) return []

  const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""))
  const records = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length > 0) {
      const record: any = {}
      headers.forEach((header, index) => {
        record[header] = values[index]?.trim().replace(/"/g, "")
      })
      records.push(record)
    }
  }
  
  return records
}

function parseCSVLine(line: string): string[] {
  const result = []
  let current = ""
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === "," && !inQuotes) {
      result.push(current)
      current = ""
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

async function parseExcel(buffer: Buffer): Promise<any[]> {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) return []
    
    const worksheet = workbook.Sheets[sheetName]
    return XLSX.utils.sheet_to_json(worksheet, { blankrows: false })
  } catch (error) {
    console.error("Error parsing Excel:", error)
    return []
  }
}

function findDateRange(row: any): string | null {
  // Look for date range in any column
  for (const value of Object.values(row)) {
    const str = value?.toString() || ""
    if (str.includes("~") || str.match(/\d{1,2}\/\d{1,2}\/\d{4}/)) {
      return str
    }
  }
  return null
}

function findCheckIn(row: any): string | null {
  for (const [key, value] of Object.entries(row)) {
    const str = value?.toString() || ""
    const keyLower = key.toLowerCase()
    // Look for "in" related columns or time format
    if (keyLower.includes("in") || keyLower === "intime" || keyLower === "in time") {
      if (/^\d{2}:\d{2}/.test(str)) {
        return str
      }
    }
  }
  // Also check values
  for (const value of Object.values(row)) {
    const str = value?.toString() || ""
    if (/^\d{2}:\d{2}$/.test(str)) {
      return str
    }
  }
  return null
}

function findCheckOut(row: any): string | null {
  for (const [key, value] of Object.entries(row)) {
    const str = value?.toString() || ""
    const keyLower = key.toLowerCase()
    if (keyLower.includes("out") || keyLower === "outtime" || keyLower === "out time") {
      if (/^\d{2}:\d{2}/.test(str)) {
        return str
      }
    }
  }
  for (const value of Object.values(row)) {
    const str = value?.toString() || ""
    if (/^\d{2}:\d{2}$/.test(str)) {
      return str
    }
  }
  return null
}

function parseDateRange(dateRange: string): string[] {
  const dates: string[] = []
  if (!dateRange) return dates
  
  const trimmed = dateRange.toString().trim()
  
  if (trimmed.includes("~")) {
    const parts = trimmed.split("~").map(s => s.trim())
    if (parts.length === 2) {
      const start = parseDate(parts[0])
      const end = parseDate(parts[1])
      if (start && end) {
        const startDate = new Date(start)
        const endDate = new Date(end)
        const current = new Date(startDate)
        while (current <= endDate) {
          dates.push(current.toISOString().split("T")[0])
          current.setDate(current.getDate() + 1)
        }
      }
    }
  }
  
  return dates
}

function parseDate(dateStr: string): string | null {
  if (!dateStr) return null
  const trimmed = dateStr.trim()
  
  let match = trimmed.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (match) {
    const [, day, month, year] = match
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
  }
  
  match = trimmed.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (match) {
    const [, year, month, day] = match
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
  }
  
  const date = new Date(trimmed)
  return !isNaN(date.getTime()) ? date.toISOString().split("T")[0] : null
}
