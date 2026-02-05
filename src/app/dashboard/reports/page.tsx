"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, FileText, Users, Calendar, BarChart3, Clock } from "lucide-react"

type ReportType = 'leave-usage' | 'employee-summary' | 'department-summary' | 'pending-approvals' | 'monthly-trends'

interface ReportFilters {
  type: ReportType
  year: string
  department?: string
  employeeId?: string
}

const is_coming_soon = true;

export default function ReportsPage() {
  const [filters, setFilters] = useState<ReportFilters>({
    type: 'leave-usage',
    year: new Date().getFullYear().toString()
  })
  const [reportData, setReportData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [departments, setDepartments] = useState<string[]>([])
  const [employees, setEmployees] = useState<any[]>([])

  useEffect(() => {
    fetchDepartments()
    fetchEmployees()
  }, [])

  useEffect(() => {
    if (filters.type) {
      fetchReport()
    }
  }, [filters])

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments?limit=1000')
      const data = await response.json()
      const deptNames = data.departments.map((dept: any) => dept.name)
      setDepartments(deptNames)
    } catch (error) {
      console.error('Failed to fetch departments:', error)
    }
  }

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees?limit=1000')
      const data = await response.json()
      setEmployees(data.employees || [])
    } catch (error) {
      console.error('Failed to fetch employees:', error)
    }
  }

  const fetchReport = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        type: filters.type,
        year: filters.year,
        ...(filters.department && { department: filters.department }),
        ...(filters.employeeId && { employeeId: filters.employeeId })
      })

      const response = await fetch(`/api/reports?${params}`)
      const data = await response.json()
      setReportData(data)
    } catch (error) {
      console.error('Failed to fetch report:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return

    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header]
          return typeof value === 'string' && value.includes(',') ? `"${value}"` : value
        }).join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const renderLeaveUsageReport = () => {
    if (!reportData) return null

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Leave Usage Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Total Days</TableHead>
                  <TableHead>Total Requests</TableHead>
                  <TableHead>Unique Employees</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.summary?.map((item: any) => (
                  <TableRow key={item.type}>
                    <TableCell className="font-medium">{item.type}</TableCell>
                    <TableCell>{item.totalDays}</TableCell>
                    <TableCell>{item.totalRequests}</TableCell>
                    <TableCell>{item.uniqueEmployees}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detailed Requests
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToCSV(reportData.detailed, `leave-usage-${filters.year}.csv`)}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Approved By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.detailed?.map((request: any) => (
                  <TableRow key={request.id}>
                    <TableCell>{request.employee}</TableCell>
                    <TableCell>{request.department}</TableCell>
                    <TableCell>{request.leaveType}</TableCell>
                    <TableCell>{request.startDate}</TableCell>
                    <TableCell>{request.endDate}</TableCell>
                    <TableCell>{request.totalDays}</TableCell>
                    <TableCell>{request.approvedBy || 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderEmployeeSummaryReport = () => {
    if (!reportData) return null

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Employee Leave Summary
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCSV(reportData, `employee-summary-${filters.year}.csv`)}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Leave Balances</TableHead>
                <TableHead>Approved Days</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.isArray(reportData) && reportData.map((employee: any) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>{employee.department}</TableCell>
                  <TableCell>{employee.position}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {employee.leaveBalances?.map((balance: any) => (
                        <div key={balance.type} className="text-sm">
                          <Badge variant="outline" className="mr-2">
                            {balance.type}
                          </Badge>
                          {balance.used}/{balance.total} days
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{employee.totalApprovedDays}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    )
  }

  const renderDepartmentSummaryReport = () => {
    if (!reportData) return null

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Department Summary
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCSV(reportData, `department-summary-${filters.year}.csv`)}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead>Total Employees</TableHead>
                <TableHead>Approved Requests</TableHead>
                <TableHead>Total Leave Days</TableHead>
                <TableHead>Leave Types</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.isArray(reportData) && reportData.map((dept: any) => (
                <TableRow key={dept.department}>
                  <TableCell className="font-medium">{dept.department}</TableCell>
                  <TableCell>{dept.totalEmployees}</TableCell>
                  <TableCell>{dept.approvedRequests}</TableCell>
                  <TableCell>{dept.totalDays}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {Object.entries(dept.leaveTypes || {}).map(([type, days]: [string, any]) => (
                        <div key={type} className="text-sm">
                          <Badge variant="secondary" className="mr-2">
                            {type}
                          </Badge>
                          {days} days
                        </div>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    )
  }

  const renderPendingApprovalsReport = () => {
    if (!reportData) return null

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Approvals
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCSV(reportData, 'pending-approvals.csv')}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Leave Type</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Requested</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.isArray(reportData) && reportData.map((request: any) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">{request.employee}</TableCell>
                  <TableCell>{request.department}</TableCell>
                  <TableCell>{request.leaveType}</TableCell>
                  <TableCell>{request.startDate}</TableCell>
                  <TableCell>{request.endDate}</TableCell>
                  <TableCell>{request.totalDays}</TableCell>
                  <TableCell>{new Date(request.requestedAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    )
  }

  const renderMonthlyTrendsReport = () => {
    if (!reportData) return null

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Monthly Leave Trends
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCSV(reportData, `monthly-trends-${filters.year}.csv`)}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Total Requests</TableHead>
                <TableHead>Total Days</TableHead>
                <TableHead>Leave Types</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.isArray(reportData) && reportData.map((month: any) => (
                <TableRow key={month.month}>
                  <TableCell className="font-medium">{month.month}</TableCell>
                  <TableCell>{month.requests}</TableCell>
                  <TableCell>{month.totalDays}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {Object.entries(month.leaveTypes || {}).map(([type, days]: [string, any]) => (
                        <div key={type} className="text-sm">
                          <Badge variant="outline" className="mr-2">
                            {type}
                          </Badge>
                          {days} days
                        </div>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {is_coming_soon ? (
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground mb-4">
            View and generate comprehensive leave management reports
          </p>
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Reports feature is under development!</div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          <div>
            <h1 className="text-3xl font-bold">Reports</h1>
            <p className="text-muted-foreground">
              View and generate comprehensive leave management reports
            </p>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Report Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Report Type</label>
                  <Select
                    value={filters.type}
                    onValueChange={(value: ReportType) => setFilters({ ...filters, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="leave-usage">Leave Usage</SelectItem>
                      <SelectItem value="employee-summary">Employee Summary</SelectItem>
                      <SelectItem value="department-summary">Department Summary</SelectItem>
                      <SelectItem value="pending-approvals">Pending Approvals</SelectItem>
                      <SelectItem value="monthly-trends">Monthly Trends</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Year</label>
                  <Select
                    value={filters.year}
                    onValueChange={(value) => setFilters({ ...filters, year: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 5 }, (_, i) => {
                        const year = new Date().getFullYear() - i
                        return (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {(filters.type === 'leave-usage' || filters.type === 'employee-summary') && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Department</label>
                    <Select
                      value={filters.department || "all"}
                      onValueChange={(value) => setFilters({ ...filters, department: value === "all" ? undefined : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Departments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {filters.type === 'leave-usage' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Employee</label>
                    <Select
                      value={filters.employeeId || "all"}
                      onValueChange={(value) => setFilters({ ...filters, employeeId: value === "all" ? undefined : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Employees" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Employees</SelectItem>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.first_name} {emp.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Report Content */}
          {loading ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-muted-foreground">Loading report...</div>
              </CardContent>
            </Card>
          ) : (
            <>
              {filters.type === 'leave-usage' && renderLeaveUsageReport()}
              {filters.type === 'employee-summary' && renderEmployeeSummaryReport()}
              {filters.type === 'department-summary' && renderDepartmentSummaryReport()}
              {filters.type === 'pending-approvals' && renderPendingApprovalsReport()}
              {filters.type === 'monthly-trends' && renderMonthlyTrendsReport()}
            </>
          )}
        </>
      )}
    </div>
  )
}