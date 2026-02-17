import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-config"
import { getUserProfile, hasPermission } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate, getStatusColor } from "@/lib/utils"
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { redirect } from "next/navigation"

async function getDashboardData(userId: string, role: string) {
  const currentYear = new Date().getFullYear()

  // Check permissions
  const { hasPermission: canReadBalances } = await hasPermission(userId, "leave_balances:read")
  const { hasPermission: canReadRequests } = await hasPermission(userId, "leave_requests:read")
  const { hasPermission: canApprove } = await hasPermission(userId, "leave_requests:approve")

  // Get leave balances
  let leaveBalances = null
  if (canReadBalances) {
    const { data } = await supabaseAdmin
      .from("leave_balances")
      .select(
        `
        *,
        leaveType:leave_types(*)
        `
      )
      .eq("user_id", userId)
      .eq("year", currentYear)
    leaveBalances = data
  }

  // Get recent leave requests
  let recentRequests = null
  if (canReadRequests) {
    const { data } = await supabaseAdmin
      .from("leave_requests")
      .select(
        `
        *,
        leaveType:leave_types(*)
        `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5)
    recentRequests = data
  }

  // Get pending approvals count (for managers)
  let pendingApprovalsCount = 0
  if (canApprove) {
    const { data: employees } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("manager_id", userId)

    const employeeIds = employees?.map((e) => e.id) || []

    if (role === "ADMIN" || role === "HR_MANAGER") {
      const { count } = await supabaseAdmin
        .from("leave_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "PENDING")

      pendingApprovalsCount = count || 0
    } else if (employeeIds.length > 0) {
      const { count } = await supabaseAdmin
        .from("leave_requests")
        .select("*", { count: "exact", head: true })
        .in("user_id", employeeIds)
        .eq("status", "PENDING")

      pendingApprovalsCount = count || 0
    }
  }

  // Get stats
  let totalLeaves = 0, approvedLeaves = 0, pendingLeaves = 0, rejectedLeaves = 0
  if (canReadRequests) {
    const { count: total } = await supabaseAdmin
      .from("leave_requests")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
    totalLeaves = total || 0

    const { count: approved } = await supabaseAdmin
      .from("leave_requests")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "APPROVED")
    approvedLeaves = approved || 0

    const { count: pending } = await supabaseAdmin
      .from("leave_requests")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "PENDING")
    pendingLeaves = pending || 0

    const { count: rejected } = await supabaseAdmin
      .from("leave_requests")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "REJECTED")
    rejectedLeaves = rejected || 0
  }

  const stats = {
    totalLeaves: totalLeaves || 0,
    approvedLeaves: approvedLeaves || 0,
    pendingLeaves: pendingLeaves || 0,
    rejectedLeaves: rejectedLeaves || 0,
  }

  return {
    leaveBalances: leaveBalances || [],
    recentRequests: recentRequests || [],
    pendingApprovalsCount,
    stats
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session || !session.user?.id) {
    redirect("/login")
  }

  const userId = session.user.id
  const userRole = session.user.role || "EMPLOYEE"


  // Get user profile for additional details
  const { user: userProfile } = await getUserProfile(userId)

  // Use profile data if available, otherwise use session data
  const firstName = userProfile?.first_name || session.user.firstName || session.user.name || "User"
  const lastName = userProfile?.last_name || ""
  const fullName = `${firstName} ${lastName}`.trim()
  const email = userProfile?.email || session.user.email || ""
  const role = userProfile?.role || userRole
  const department = userProfile?.department?.name || "Not assigned"
  const position = userProfile?.position || "Not specified"

  let leaveBalances: any[] = []
  let recentRequests: any[] = []
  let pendingApprovalsCount = 0
  let stats = {
    totalLeaves: 0,
    approvedLeaves: 0,
    pendingLeaves: 0,
    rejectedLeaves: 0,
  }

  try {
    const dashboardData = await getDashboardData(userId, userRole)
    leaveBalances = dashboardData.leaveBalances || []
    recentRequests = dashboardData.recentRequests || []
    pendingApprovalsCount = dashboardData.pendingApprovalsCount || 0
    stats = dashboardData.stats || stats
  } catch (error) {
    console.error("[Dashboard] Error fetching dashboard data:", error)
    // Continue with empty/default values
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Welcome back123, {firstName}!
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your leave status
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLeaves}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approvedLeaves}</div>
            <p className="text-xs text-muted-foreground">Leaves approved</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingLeaves}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rejectedLeaves}</div>
            <p className="text-xs text-muted-foreground">Leaves rejected</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals Alert for Managers */}
      {pendingApprovalsCount > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <div>
              <CardTitle className="text-yellow-800">
                Pending Approvals
              </CardTitle>
              <CardDescription className="text-yellow-700">
                You have {pendingApprovalsCount} leave request(s) waiting for
                your approval
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Leave Balances */}
        <Card>
          <CardHeader>
            <CardTitle>Leave Balances</CardTitle>
            <CardDescription>
              Your available leave days for {new Date().getFullYear()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!leaveBalances || leaveBalances.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No leave balances found. Contact HR to set up your leave
                entitlements.
              </p>
            ) : (
              <div className="space-y-4">
                {leaveBalances.map((balance: any) => (
                  <div
                    key={balance.id}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">{balance.leaveType.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {balance.used_days || 0} used of {balance.total_days} days
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        {balance.total_days - (balance.used_days || 0) - (balance.pending_days || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">Available</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Requests */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Requests</CardTitle>
            <CardDescription>Your latest leave requests</CardDescription>
          </CardHeader>
          <CardContent>
            {!recentRequests || recentRequests.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No leave requests yet. Apply for leave to get started.
              </p>
            ) : (
              <div className="space-y-4">
                {recentRequests.map((request: any) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between border-b pb-3 last:border-0"
                  >
                    <div>
                      <p className="font-medium">{request.leaveType.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(request.start_date)} -{" "}
                        {formatDate(request.end_date)}
                      </p>
                    </div>
                    <Badge className={request.status}>
                      {request.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}