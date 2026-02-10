"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Upload, FileSpreadsheet, Download, Clock, Calendar, Users, AlertCircle, CheckCircle, XCircle, Eye, Pencil, RefreshCw, Merge } from "lucide-react"

interface AttendanceRecord {
  id: string
  user_id: string
  date: string
  check_in: string | null
  check_out: string | null
  status: string
  working_hours: number | null
  overtime_hours: number | null
  source: string
  notes: string | null
  users?: {
    first_name: string
    last_name: string
    email: string
    department: string | null
  }
}

interface EditAttendanceData {
  id: string
  date: string
  check_in: string
  check_out: string
  status: string
  employee_name: string
}

interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string
}

interface EmployeeAttendanceData {
  user_id: string
  employee_no: string
  first_name: string
  last_name: string
  email: string
  department: string | null
  days: Record<string, {
    date: string
    check_in: string | null
    check_out: string | null
    working_hours: number | null
    status: string
  }>
}

interface PivotedAttendance {
  user_id: string
  employee_name: string
  employee_id: string
  department: string | null
  attendanceDays: {
    date: string
    dayName: string
    status: string
    check_in: string | null
    check_out: string | null
    fullDate?: string
  }[]
}

export default function AttendancePage() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<any>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)

  // Edit dialog state
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<EditAttendanceData | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Reconcile dialog state
  const [isReconcileOpen, setIsReconcileOpen] = useState(false)
  const [reconcileDate, setReconcileDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [reconcileLoading, setReconcileLoading] = useState(false)
  const [reconcileResult, setReconcileResult] = useState<any>(null)
  const [reconcileError, setReconcileError] = useState<string | null>(null)

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/employees?limit=1000")
      const data = await response.json()
    } catch (error) {
      console.error("Failed to fetch employees:", error)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError(null)
    setUploadResult(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/attendance/upload", {
        method: "POST",
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        setUploadError(data.error || "Failed to upload file")
      } else {
        setUploadResult(data)

        // Display the uploaded data in the main attendance table
        setAttendance(data.rawAttendance || [])
        setIsUploadOpen(false)
        // Keep stats at 0 by default until an employee is selected
      }
    } catch (error) {
      setUploadError("An error occurred while uploading the file")
      console.error("Upload error:", error)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handlePreview = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setPreviewLoading(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/attendance/preview", {
        method: "POST",
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        setUploadError(data.error || "Failed to preview file")
      }
    } catch (error) {
      setUploadError("An error occurred while previewing the file")
      console.error("Preview error:", error)
    } finally {
      setPreviewLoading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const pivotAttendanceData = (records: AttendanceRecord[]): PivotedAttendance[] => {
    const pivotMap = new Map<string, PivotedAttendance>()
    let minDate = new Date("2099-01-01")
    let maxDate = new Date("2000-01-01")

    // First pass: collect all dates and find min/max
    records.forEach((record) => {
      const dateObj = new Date(record.date)
      if (dateObj < minDate) minDate = dateObj
      if (dateObj > maxDate) maxDate = dateObj

      const userId = record.user_id

      if (!pivotMap.has(userId)) {
        pivotMap.set(userId, {
          user_id: userId,
          employee_name: `${record.users?.first_name || ""} ${record.users?.last_name || ""}`.trim(),
          employee_id: record.id.split("-")[0] || "",
          department: record.users?.department || null,
          attendanceDays: []
        })
      }

      const pivoted = pivotMap.get(userId)!
      const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" })
      const formattedDate = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      const fullDate = dateObj.toISOString().split("T")[0] // YYYY-MM-DD for sorting

      pivoted.attendanceDays.push({
        date: formattedDate,
        dayName: dayName,
        status: record.status,
        check_in: record.check_in,
        check_out: record.check_out,
        fullDate: fullDate
      })
    })

    // Generate all dates between min and max, extended to 31st of the month
    const allDates: { fullDate: string; date: string; dayName: string }[] = []
    let currentDate = new Date(minDate)
    // Extend maxDate to the 31st of the month
    const endDate = new Date(maxDate.getFullYear(), maxDate.getMonth(), 31) // Set to 31st of the month
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split("T")[0]
      const dayName = currentDate.toLocaleDateString("en-US", { weekday: "short" })
      const formattedDate = currentDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })

      allDates.push({
        fullDate: dateStr,
        date: formattedDate,
        dayName: dayName
      })

      currentDate.setDate(currentDate.getDate() + 1)
    }

    // For each employee, fill in missing dates
    pivotMap.forEach((emp) => {
      const attendanceMap = new Map(emp.attendanceDays.map(d => [d.fullDate, d]))

      emp.attendanceDays = allDates.map(dateInfo => {
        const existing = attendanceMap.get(dateInfo.fullDate)
        if (existing) {
          return existing
        } else {
          // Create empty day marker
          return {
            date: dateInfo.date,
            dayName: dateInfo.dayName,
            status: "EMPTY",
            check_in: null,
            check_out: null,
            fullDate: dateInfo.fullDate
          }
        }
      })
    })

    return Array.from(pivotMap.values())
  }

  const calculateEmployeeStats = (employeeId: string) => {
    const employeeRecords = attendance.filter(r => r.user_id === employeeId)

    // Count stats excluding weekends for empty days
    let present = 0
    let absent = 0
    let late = 0
    let halfDay = 0
    let total = 0

    employeeRecords.forEach((record) => {
      const dateObj = new Date(record.date)
      const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" })
      const isWeekend = dayName === "Sat" || dayName === "Sun"

      // Only count records that actually exist (not EMPTY status)
      if (record.status === "PRESENT") {
        present++
        total++
      } else if (record.status === "ABSENT" && !isWeekend) {
        absent++
        total++
      } else if (record.status === "LATE" && !isWeekend) {
        late++
        total++
      } else if (record.status === "HALF_DAY") {
        halfDay++
        total++
      }
    })

    setStats({
      total,
      present,
      absent,
      late,
      halfDay
    })
  }

  const handleEmployeeClick = (employeeId: string) => {
    setSelectedEmployeeId(employeeId)
    calculateEmployeeStats(employeeId)
  }

  const handleClearSelection = () => {
    setSelectedEmployeeId(null)
    // Reset stats to 0
    setStats({
      total: 0,
      present: 0,
      absent: 0,
      late: 0,
      halfDay: 0
    })
  }

  // Handle opening the edit dialog
  const handleEditClick = (day: any, userId: string, employeeName: string) => {
    // Find the actual attendance record in the attendance array
    const actualRecord = attendance.find(
      record => record.user_id === userId && record.date === (day.fullDate || day.date)
    )

    setEditingRecord({
      id: actualRecord?.id || day.id,
      date: day.fullDate || day.date,
      check_in: day.check_in || "",
      check_out: day.check_out || "",
      status: day.status,
      employee_name: employeeName
    })
    setIsEditOpen(true)
  }

  // Handle saving the edited record
  const handleSaveEdit = async () => {
    if (!editingRecord) return

    setIsSaving(true)
    try {
      // Update the local state only
      setAttendance(prev => prev.map(record => {
        if (record.id === editingRecord.id) {
          return {
            ...record,
            check_in: editingRecord.check_in || null,
            check_out: editingRecord.check_out || null,
            status: editingRecord.status
          }
        }
        return record
      }))

      setIsEditOpen(false)
      setEditingRecord(null)
    } catch (error) {
      console.error("Error updating attendance:", error)
      alert("An error occurred while updating attendance")
    } finally {
      setIsSaving(false)
    }
  }

  // Handle reconciliation submission
  const handleReconcile = async () => {
    if (!reconcileDate) {
      setReconcileError("Please select a date")
      return
    }

    setReconcileLoading(true)
    setReconcileError(null)
    setReconcileResult(null)

    try {
      // Extract month and year from the selected date
      const dateObj = new Date(reconcileDate)
      const month = dateObj.getMonth() + 1 // Convert to 1-indexed
      const year = dateObj.getFullYear()

      // Reconcile with leave data using existing attendance records from database
      const reconcileResponse = await fetch("/api/attendance/reconcile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          month: month,
          year: year
        })
      })

      const reconcileData = await reconcileResponse.json()

      if (!reconcileResponse.ok) {
        if (reconcileData.noRecordsFound) {
          setReconcileError("No attendance records found for this date. Please upload the attendance data first using the Upload tab, then reconcile.")
        } else {
          setReconcileError(reconcileData.error || "Failed to reconcile attendance")
        }
        return
      }

      setReconcileResult(reconcileData)

      // Refresh attendance data
      const refreshResponse = await fetch("/api/attendance")
      const refreshData = await refreshResponse.json()
      if (refreshResponse.ok) {
        setAttendance(refreshData.attendance || [])
      }
    } catch (error) {
      setReconcileError("An error occurred while reconciling attendance")
      console.error("Reconcile error:", error)
    } finally {
      setReconcileLoading(false)
    }
  }

  // Get current user role from session
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await fetch("/api/auth/profile")
        if (response.ok) {
          const data = await response.json()
          setUserRole(data.user?.role || null)
        }
      } catch (error) {
        console.error("Failed to fetch user role:", error)
      }
    }
    fetchUserRole()
  }, [])

  const canEdit = userRole === "ADMIN" || userRole === "HR_MANAGER"

  // Edit Dialog Component
  const EditDialog = () => {
    return (
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Attendance</DialogTitle>
            <DialogDescription>
              Update attendance record for {editingRecord?.employee_name}
            </DialogDescription>
          </DialogHeader>

          {editingRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-date">Date</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={editingRecord.date}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select
                    value={editingRecord.status}
                    onValueChange={(value) => setEditingRecord({ ...editingRecord, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PRESENT">Present</SelectItem>
                      <SelectItem value="ABSENT">Absent</SelectItem>
                      <SelectItem value="LATE">Late</SelectItem>
                      <SelectItem value="HALF_DAY">Half Day</SelectItem>
                      <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-check-in">Check In</Label>
                  <Input
                    id="edit-check-in"
                    type="time"
                    value={editingRecord.check_in}
                    onChange={(e) => setEditingRecord({ ...editingRecord, check_in: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-check-out">Check Out</Label>
                  <Input
                    id="edit-check-out"
                    type="time"
                    value={editingRecord.check_out}
                    onChange={(e) => setEditingRecord({ ...editingRecord, check_out: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsEditOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    )
  }

  // Reconcile Dialog Component
  const ReconcileDialog = () => {
    return (
      <Dialog open={isReconcileOpen} onOpenChange={setIsReconcileOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" disabled={!canEdit}>
            <Merge className="h-4 w-4 mr-2" />
            Reconcile with Leave
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reconcile Attendance with Leave</DialogTitle>
            <DialogDescription>
              This will reconcile existing attendance records with approved leave requests for the selected date.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reconcile-date">Date</Label>
              <Input
                id="reconcile-date"
                type="date"
                value={reconcileDate}
                onChange={(e) => setReconcileDate(e.target.value)}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> This will update attendance records for the selected month by marking days with approved leave as "ON_LEAVE".
              </p>
            </div>

            {reconcileLoading && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2">Reconciling...</span>
              </div>
            )}

            {reconcileResult && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Reconciliation Complete</span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  {reconcileResult.message}
                </p>
              </div>
            )}

            {reconcileError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">Reconciliation Failed</span>
                </div>
                <p className="text-sm text-red-700 mt-1">
                  {reconcileError}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsReconcileOpen(false)}
                disabled={reconcileLoading}
              >
                Close
              </Button>
              <Button
                onClick={handleReconcile}
                disabled={reconcileLoading}
              >
                {reconcileLoading ? "Processing..." : "Reconcile"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Attendance Management</h1>
          <p className="text-muted-foreground">
            Track and manage employee attendance records
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ReconcileDialog />
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Upload Attendance
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>Upload Fingerprint Attendance</DialogTitle>
                <DialogDescription>
                  Upload an Excel or CSV file to preview or import attendance data
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                  <FileSpreadsheet className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <span className="text-primary hover:underline">Click to upload</span>
                    <span className="text-muted-foreground"> or drag and drop</span>
                  </Label>
                  <Input
                    id="file-upload"
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading || previewLoading}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Excel (.xlsx, .xls) or CSV files only
                  </p>
                </div>

                <div className="flex gap-2">

                  <Input
                    id="preview-upload"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handlePreview}
                    disabled={uploading || previewLoading}
                  />
                </div>

                {uploading && (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                )}

                {previewLoading && (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span className="ml-2">Previewing...</span>
                  </div>
                )}

                {uploadResult && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Data Preview Generated</span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      {uploadResult.message}
                    </p>
                    <div className="text-xs text-green-600 mt-2 space-y-1">
                      <p>Total Records: {uploadResult.totalRecords}</p>
                      <p>Unique Employees: {uploadResult.uniqueEmployees}</p>
                    </div>
                    {uploadResult.notFoundEmployeeIds && uploadResult.notFoundEmployeeIds.length > 0 && (
                      <div className="mt-2 text-xs text-red-600">
                        <p className="font-medium">Employee IDs not found in system:</p>
                        <p className="mt-1">{uploadResult.notFoundEmployeeIds.join(", ")}</p>
                      </div>
                    )}
                  </div>
                )}

                {uploadError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-red-800">
                      <AlertCircle className="h-5 w-5" />
                      <span className="font-medium">Upload Failed</span>
                    </div>
                    <p className="text-sm text-red-700 mt-1">
                      {uploadError}
                    </p>
                  </div>
                )}

              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div>
        {selectedEmployeeId && (
          <div className="mb-4 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
            <span className="text-sm font-medium text-blue-900">
              Showing stats for <span className="font-semibold">{pivotAttendanceData(attendance).find(e => e.user_id === selectedEmployeeId)?.employee_name || "selected employee"}</span>
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleClearSelection}
            >
              Clear Selection
            </Button>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Working Days
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Present
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.present}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Absent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Late
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.late}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Half Day
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.halfDay}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Attendance Records For the Month of {attendance.length > 0 && (() => {
              const firstDate = new Date(attendance[0].date)
              return firstDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
            })()}
          </CardTitle>
          <CardDescription>
            Showing attendance records consolidated by employee
          </CardDescription>
        </CardHeader>
        <CardContent>
          {attendance.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No attendance records found for the selected filters
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground left-0 z-10">Emp Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground left-40 z-10">Dep</th>
                    {(() => {
                      const pivoted = pivotAttendanceData(attendance)
                      const maxDays = Math.max(...pivoted.map(emp => emp.attendanceDays.length), 0)
                      return Array.from({ length: maxDays }, (_, i) => {
                        // Get the first employee's day data to extract date info
                        const firstEmployeeDay = pivoted[0]?.attendanceDays[i]
                        const dayDate = firstEmployeeDay?.date || ""
                        const dayName = firstEmployeeDay?.dayName || ""
                        const isSunday = dayName === "Sun"

                        return (
                          <th
                            key={i}
                            className={`px-4 py-3 text-center font-semibold text-xs border-l min-w-32 ${isSunday ? "bg-blue-100" : ""}`}
                          >

                            <div className={`text-xs ${isSunday ? "font-semibold text-blue-700" : "text-muted-foreground"}`}>
                              {dayDate} {isSunday ? `(${dayName})` : `(${dayName})`}
                            </div>
                          </th>
                        )
                      })
                    })()}
                  </tr>
                </thead>
                <tbody>
                  {pivotAttendanceData(attendance).map((empData) => (
                    <tr key={empData.user_id} className="border-b hover:bg-muted/50">
                      <td
                        className="px-4 py-3 font-medium left-0 z-10 cursor-pointer hover:text-blue-600 hover:underline"
                        onClick={() => handleEmployeeClick(empData.user_id)}
                      >
                        {empData.employee_name}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground left-40 z-10">
                        {empData.department || "-"}
                      </td>
                      {empData.attendanceDays.map((day, idx) => {
                        const isEmpty = day.status === "EMPTY"
                        return (
                          <td
                            key={idx}
                            className={`px-4 py-3 text-center text-xs border-l min-w-32 ${isEmpty ? "" : ""}`}
                          >
                            <div className="space-y-1">
                              {isEmpty ? (
                                <div className="text-xs text-muted font-medium">
                                  No Data
                                </div>
                              ) : (
                                <>
                                  {day.check_in && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {day.check_in} - {day.check_out || "—"}
                                    </div>
                                  )}
                                  {canEdit && !isEmpty && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 mt-1"
                                      onClick={() => handleEditClick(day, empData.user_id, empData.employee_name)}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <EditDialog />
    </div>
  )
}
