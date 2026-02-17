import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hasPermission } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { hasPermission: canRead } = await hasPermission(session.user.id, "reports:read")
    if (!canRead) {
      return NextResponse.json({ error: "You do not have permission to read reports." }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type')
    const year = searchParams.get('year') || new Date().getFullYear().toString()
    const department = searchParams.get('department')
    const employeeId = searchParams.get('employeeId')

    let data: any = null

    switch (reportType) {
      case 'leave-usage':
        data = await getLeaveUsageReport(year, department, employeeId)
        break
      case 'employee-summary':
        data = await getEmployeeLeaveSummary(year, department)
        break
      case 'department-summary':
        data = await getDepartmentSummary(year)
        break
      case 'pending-approvals':
        data = await getPendingApprovalsReport()
        break
      case 'monthly-trends':
        data = await getMonthlyTrendsReport(year)
        break
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Reports error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function getLeaveUsageReport(year: string, department?: string | null, employeeId?: string | null) {
  let query = supabaseAdmin
    .from('leave_requests')
    .select(`
      *,
      employee:users!leave_requests_user_id_fkey(
        id,
        first_name,
        last_name,
        email,
        department:department_id(id, name),
        position,
        role
      ),
      leaveType:leave_types(*),
      approver:users!leave_requests_approved_by_id_fkey(
        first_name,
        last_name
      )
    `)
    .eq('status', 'APPROVED')
    .gte('start_date', `${year}-01-01`)
    .lte('end_date', `${year}-12-31`)

  if (department) {
    query = query.eq('employee.department.name', department)
  }

  if (employeeId) {
    query = query.eq('user_id', employeeId)
  }

  const { data, error } = await query.order('start_date', { ascending: false })

  if (error) throw error

  // Group by leave type and calculate totals
  const leaveTypeSummary = data.reduce((acc: any, request: any) => {
    const typeName = request.leaveType.name
    if (!acc[typeName]) {
      acc[typeName] = {
        type: typeName,
        totalDays: 0,
        totalRequests: 0,
        employees: new Set()
      }
    }
    acc[typeName].totalDays += request.total_days
    acc[typeName].totalRequests += 1
    acc[typeName].employees.add(request.employee.first_name + ' ' + request.employee.last_name)
    return acc
  }, {})

  return {
    summary: Object.values(leaveTypeSummary).map((item: any) => ({
      ...item,
      uniqueEmployees: item.employees.size
    })),
    detailed: data.map((request: any) => ({
      id: request.id,
      employee: `${request.employee.first_name} ${request.employee.last_name}`,
      department: request.employee.department?.name || null,
      leaveType: request.leaveType.name,
      startDate: request.start_date,
      endDate: request.end_date,
      totalDays: request.total_days,
      reason: request.reason,
      approvedBy: request.approver ? `${request.approver.first_name} ${request.approver.last_name}` : null,
      approvedAt: request.approved_at
    }))
  }
}

async function getEmployeeLeaveSummary(year: string, department?: string | null) {
  let query = supabaseAdmin
    .from('users')
    .select(`
      id,
      first_name,
      last_name,
      email,
      department:department_id(id, name),
      position,
      role,
      leave_balances!inner(
        year,
        total_days,
        used_days,
        leave_type:leave_types(name)
      ),
      leave_requests(
        total_days,
        status,
        leaveType:leave_types(name)
      )
    `)
    .eq('leave_balances.year', parseInt(year))

  if (department) {
    query = query.eq('department.name', department)
  }

  const { data, error } = await query

  if (error) throw error

  return data.map((employee: any) => {
    const leaveBalances = employee.leave_balances || []
    const leaveRequests = employee.leave_requests || []

    // Calculate approved leave days by type
    const approvedLeaves = leaveRequests
      .filter((req: any) => req.status === 'APPROVED')
      .reduce((acc: any, req: any) => {
        const type = req.leaveType?.name || 'Unknown'
        acc[type] = (acc[type] || 0) + req.total_days
        return acc
      }, {})

    return {
      id: employee.id,
      name: `${employee.first_name} ${employee.last_name}`,
      email: employee.email,
      department: employee.department?.name || null,
      position: employee.position,
      role: employee.role,
      leaveBalances: leaveBalances.map((balance: any) => ({
        type: balance.leave_type?.name || 'Unknown',
        total: balance.total_days,
        used: balance.used_days,
        remaining: balance.total_days - balance.used_days
      })),
      approvedLeaves,
      totalApprovedDays: Object.values(approvedLeaves).reduce((sum: number, days: any) => sum + days, 0) as number
    }
  })
}

async function getDepartmentSummary(year: string) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select(`
      department:department_id(id, name),
      leave_requests!inner(
        total_days,
        status,
        start_date,
        leaveType:leave_types(name)
      )
    `)
    .gte('leave_requests.start_date', `${year}-01-01`)
    .lte('leave_requests.end_date', `${year}-12-31`)

  if (error) throw error

  const departmentStats = data.reduce((acc: any, user: any) => {
    const dept = user.department?.name || 'Unassigned'
    if (!acc[dept]) {
      acc[dept] = {
        department: dept,
        totalEmployees: 0,
        approvedRequests: 0,
        totalDays: 0,
        leaveTypes: {}
      }
    }

    acc[dept].totalEmployees += 1

    user.leave_requests.forEach((request: any) => {
      if (request.status === 'APPROVED') {
        acc[dept].approvedRequests += 1
        acc[dept].totalDays += request.total_days

        const typeName = request.leaveType?.name || 'Unknown'
        acc[dept].leaveTypes[typeName] = (acc[dept].leaveTypes[typeName] || 0) + request.total_days
      }
    })

    return acc
  }, {})

  return Object.values(departmentStats)
}

async function getPendingApprovalsReport() {
  const { data, error } = await supabaseAdmin
    .from('leave_requests')
    .select(`
      *,
      employee:users!leave_requests_user_id_fkey(
        first_name,
        last_name,
        email,
        department:department_id(id, name)
      ),
      leaveType:leave_types(*)
    `)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false })

  if (error) throw error

  return data.map((request: any) => ({
    id: request.id,
    employee: `${request.employee.first_name} ${request.employee.last_name}`,
    department: request.employee.department?.name || null,
    leaveType: request.leaveType.name,
    startDate: request.start_date,
    endDate: request.end_date,
    totalDays: request.total_days,
    reason: request.reason,
    requestedAt: request.created_at
  }))
}

async function getMonthlyTrendsReport(year: string) {
  const { data, error } = await supabaseAdmin
    .from('leave_requests')
    .select(`
      start_date,
      total_days,
      leaveType:leave_types(name)
    `)
    .eq('status', 'APPROVED')
    .gte('start_date', `${year}-01-01`)
    .lte('end_date', `${year}-12-31`)

  if (error) throw error

  const monthlyData = data.reduce((acc: any, request: any) => {
    const month = new Date(request.start_date).getMonth()
    const monthName = new Date(2024, month).toLocaleString('default', { month: 'long' })

    if (!acc[monthName]) {
      acc[monthName] = {
        month: monthName,
        totalDays: 0,
        requests: 0,
        leaveTypes: {}
      }
    }

    acc[monthName].totalDays += request.total_days
    acc[monthName].requests += 1

    const typeName = request.leaveType?.name || 'Unknown'
    acc[monthName].leaveTypes[typeName] = (acc[monthName].leaveTypes[typeName] || 0) + request.total_days

    return acc
  }, {})

  return Object.values(monthlyData)
}