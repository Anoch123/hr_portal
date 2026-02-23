"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/date-picker"
import { formatDate, formatDateTime, getStatusColor } from "@/lib/utils"
import { Plus, X, Eye } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"

interface LeaveType {
  id: string
  name: string
  description: string | null
}

interface LeaveBalance {
  id: string
  year: number
  total_days: number
  used_days: number
  carried_over: number
  leaveType: {
    id: string
    name: string
    description: string | null
  }
}

interface LeaveRequest {
  id: string
  user_id: string
  start_date: string
  end_date: string
  total_days: number
  reason: string | null
  status: string
  leave_mode: 'FULL' | 'HALF' | 'SHORT'
  is_no_pay: boolean
  created_at: string
  rejection_reason: string | null
  cancellation_reason: string | null
  cancelled_at: string | null
  start_time: string | null
  end_time: string | null
  half_day_period: string | null
  leaveType: LeaveType
}

export default function LeavesPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [availableLeaveTypeIds, setAvailableLeaveTypeIds] = useState<Set<string>>(new Set())
  const [balanceLeaveTypeIds, setBalanceLeaveTypeIds] = useState<Set<string>>(new Set()) // Leave types user has balance record for
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null)
  const [isOnProbation, setIsOnProbation] = useState(false)
  const [hasCarriedOverLeave, setHasCarriedOverLeave] = useState(false)
  const [activeTab, setActiveTab] = useState("pending")
  const [userRole, setUserRole] = useState<string>("")

  // Form state
  const [leaveTypeId, setLeaveTypeId] = useState("")
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()
  const [leaveMode, setLeaveMode] = useState<'FULL' | 'HALF' | 'SHORT'>('FULL')
  const [halfDayOption, setHalfDayOption] = useState<'MORNING' | 'EVENING'>('MORNING')
  const [reason, setReason] = useState<'Exam Leave'| 'Study Leave'| 'Religious Holiday'| 'Sick Leave'| 'Medical Appointment'| 'Hospitalization'| 'Funeral'| 'Personal Leave'>('Personal Leave')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('11:00')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const formatLocalDate = (date: Date) => {
    return date.toLocaleDateString("en-CA") // YYYY-MM-DD
  }

  const getMinSelectableDate = () => {
    const date = new Date()
    date.setHours(0, 0, 0, 0) // normalize to midnight
    date.setDate(date.getDate() - 2) // allow 2 days back
    return date
  }

  useEffect(() => {
    const init = async () => {
      await fetchRequests()
      await fetchLeaveTypes()
      await checkProbationStatus()
    }
    init()
  }, [])

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/leave-requests?myRequests=true")
      const data = await res.json()
      console.log(data);
      setRequests(data.requests || [])
      return data.requests || []
    } catch (err) {
      console.error("Error fetching requests:", err)
      return []
    } finally {
      setLoading(false)
    }
  }

  const fetchLeaveTypes = async () => {
    try {
      // Fetch all active leave types
      const res = await fetch("/api/leave-types?activeOnly=true")
      const data = await res.json()
      setLeaveTypes(data || [])

      // Fetch user's leave balances to determine available leave types
      const currentYear = new Date().getFullYear()
      const balancesRes = await fetch(`/api/leave-balances?year=${currentYear}`)
      const balances: LeaveBalance[] = await balancesRes.json()

      // Get leave type IDs that have balances (with available days > 0)
      const availableIds = new Set<string>()
      // Get all leave type IDs that user has a balance record for
      const balanceIds = new Set<string>()
      balances.forEach((balance) => {
        balanceIds.add(balance.leaveType.id)
        const availableDays = balance.total_days + balance.carried_over - balance.used_days
        if (availableDays > 0) {
          availableIds.add(balance.leaveType.id)
        }
      })
      setAvailableLeaveTypeIds(availableIds)
      setBalanceLeaveTypeIds(balanceIds)
    } catch (err) {
      console.error("Error fetching leave types:", err)
    }
  }

  const checkProbationStatus = async () => {
    try {
      const res = await fetch("/api/auth/profile")
      const profile = await res.json()
      const onProbation = profile.user.is_on_probation || false
      setIsOnProbation(onProbation)
      setUserRole(profile.user.role || "")

      if (onProbation) {
        // Check leave_balances for carried over leave from previous months
        const currentYear = new Date().getFullYear()
        const balancesRes = await fetch(`/api/leave-balances?year=${currentYear}`)
        const balances = await balancesRes.json()

        // Check if there's any carried over leave balance
        const hasCarriedOver = balances.some((balance: { carried_over: number }) => balance.carried_over > 0)
        setHasCarriedOverLeave(hasCarriedOver)

        // Set default leave mode based on probation and carried over status
        if (hasCarriedOver) {
          setLeaveMode('FULL') // Allow full day if they have carried over leave
        } else {
          setLeaveMode('HALF') // Only half day if no carried over leave
        }
      }
    } catch (err) {
      console.error("Error checking probation status:", err)
    }
  }

  // Check if user can cancel an approved leave request
  const canCancelApproved = (requestUserId: string) => {
    const currentUserId = session?.user?.id
    
    // Admin and HR can cancel any approved leave
    if (["ADMIN", "HR_MANAGER"].includes(userRole)) {
      return true
    }
    
    // Managers can cancel approved leave only if it's NOT their own request
    if (userRole === "MANAGER" && requestUserId !== currentUserId) {
      return true
    }
    
    return false
  }

  // Filter requests based on active tab
  const getFilteredRequests = () => {
    return requests.filter(r => r.status === activeTab.toUpperCase())
  }

  // Get count for each status
  const getStatusCount = (status: string) => {
    return requests.filter(r => r.status === status.toUpperCase()).length
  }

  const handleSubmit = async () => {
    setError("")
    if (!leaveTypeId || !startDate || !endDate) {
      setError("Please fill in all required fields")
      return
    }

    // Validate time selection for short leave (max 2 hours)
    if (leaveMode === 'SHORT') {
      if (!startTime || !endTime) {
        setError("Please select start and end time for short leave")
        return
      }
      if (startTime >= endTime) {
        setError("Start time must be before end time")
        return
      }
      // Calculate duration in hours
      const [startH, startM] = startTime.split(':').map(Number)
      const [endH, endM] = endTime.split(':').map(Number)
      const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM)
      if (durationMinutes > 120) {
        setError("Short leave cannot exceed 2 hours")
        return
      }
    }

    // Validate half day selection
    if (leaveMode === 'HALF' && !halfDayOption) {
      setError("Please select Morning or Evening.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/leave-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveTypeId,
          startDate: formatLocalDate(startDate),
          endDate: formatLocalDate(endDate),
          leaveMode,
          halfDayOption: leaveMode === 'HALF' ? halfDayOption : undefined,
          reason,
          startTime: leaveMode === 'SHORT' ? startTime : undefined,
          endTime: leaveMode === 'SHORT' ? endTime : undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to submit request")
        toast({
          title: "Error",
          description: data.error || "Failed to submit leave request",
          variant: "destructive",
        })
        return
      }

      setDialogOpen(false)
      resetForm()
      fetchRequests()
      toast({
        title: "Success",
        description: "Leave request submitted successfully",
        variant: "success",
      })
    } catch (err) {
      setError("An error occurred. Please try again.")
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async () => {
    if (!selectedRequest) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/leave-requests/${selectedRequest.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason || "Cancelled by user" }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to cancel request")
        toast({
          title: "Error",
          description: data.error || "Failed to cancel leave request",
          variant: "destructive",
        })
        return
      }

      setCancelDialogOpen(false)
      setSelectedRequest(null)
      setCancelReason("")
      fetchRequests()
      toast({
        title: "Success",
        description: "Leave request cancelled successfully",
        variant: "success",
      })
    } catch (err) {
      setError("An error occurred. Please try again.")
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setLeaveTypeId("")
    setStartDate(undefined)
    setEndDate(undefined)
    setLeaveMode('FULL')
    setHalfDayOption('MORNING')
    setReason('Personal Leave')
    setStartTime('09:00')
    setEndTime('11:00')
    setError("")
  }

  const renderTable = (filteredRequests: LeaveRequest[]) => (
    <>
      {loading ? (
        <p className="text-center py-4">Loading...</p>
      ) : filteredRequests.length === 0 ? (
        <p className="text-center py-4 text-muted-foreground">
          No leave requests found in this category.
        </p>
      ) : (
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[120px]">Leave Type</TableHead>
                <TableHead className="min-w-[100px]">Mode</TableHead>
                <TableHead className="min-w-[100px]">Start Date</TableHead>
                <TableHead className="min-w-[100px]">End Date</TableHead>
                <TableHead className="min-w-[60px]">Days</TableHead>
                <TableHead className="min-w-[120px]">Reason</TableHead>
                <TableHead className="min-w-[100px]">Status</TableHead>
                <TableHead className="min-w-[100px]">Submitted</TableHead>
                <TableHead className="min-w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">
                    {request.leaveType?.name || 'Unknown'}
                  </TableCell>
                  <TableCell>
                    {request.leave_mode === 'FULL' ? 'Full Day' :
                      request.leave_mode === 'HALF' ? (request.half_day_period === 'MORNING' ? 'Half Day (Morning Half)' : request.half_day_period === 'EVENING' ? 'Half Day (Evening Half)' : 'Morning Half / Evening Half') :
                        request.leave_mode === 'SHORT' ? `Short Leave (${request.start_time || 'N/A'} - ${request.end_time || 'N/A'})` : request.leave_mode}
                  </TableCell>
                  <TableCell>{formatDate(request.start_date)}</TableCell>
                  <TableCell>{formatDate(request.end_date)}</TableCell>
                  <TableCell>{request.total_days}</TableCell>
                  <TableCell className="max-w-[150px] truncate" title={request.reason || ''}>
                    {request.reason || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge className={request.status}>
                        {request.status}
                      </Badge>
                      {request.is_no_pay && (
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                          No Pay
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{formatDateTime(request.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request)
                          setDetailsDialogOpen(true)
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      {["PENDING", "APPROVED"].includes(request.status) && ((request.status === "PENDING") || canCancelApproved(request.user_id)) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request)
                            setCancelDialogOpen(true)
                          }}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  )

  // Mobile card view for leave requests
  const renderMobileCards = (filteredRequests: LeaveRequest[]) => (
    <>
      {loading ? (
        <p className="text-center py-4">Loading...</p>
      ) : filteredRequests.length === 0 ? (
        <p className="text-center py-4 text-muted-foreground">
          No leave requests found in this category.
        </p>
      ) : (
        <div className="space-y-4 md:hidden">
          {filteredRequests.map((request) => (
            <Card key={request.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-medium">{request.leaveType?.name || 'Unknown'}</h3>
                    <p className="text-sm text-muted-foreground">
                      {request.leave_mode === 'FULL' ? 'Full Day' :
                        request.leave_mode === 'HALF' ? (request.half_day_period === 'MORNING' ? 'Morning Half' : request.half_day_period === 'EVENING' ? 'Evening Half' : 'Morning Half / Evening Half') :
                          request.leave_mode === 'SHORT' ? `Short Leave (${request.start_time || 'N/A'} - ${request.end_time || 'N/A'})` : request.leave_mode}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <Badge className={request.status}>
                      {request.status}
                    </Badge>
                    {request.is_no_pay && (
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                        No Pay
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div>
                    <span className="text-muted-foreground">Start:</span>{" "}
                    {formatDate(request.start_date)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">End:</span>{" "}
                    {formatDate(request.end_date)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Days:</span>{" "}
                    {request.total_days}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Submitted:</span>{" "}
                    {formatDateTime(request.created_at)}
                  </div>
                </div>
                {request.reason && (
                  <div className="text-sm mb-3 p-2 bg-muted rounded-md">
                    <span className="text-muted-foreground">Reason:</span>{" "}
                    {request.reason}
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setSelectedRequest(request)
                      setDetailsDialogOpen(true)
                    }}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View Details
                  </Button>
                  {["PENDING", "APPROVED"].includes(request.status) && ((request.status === "PENDING") || canCancelApproved(request.user_id)) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setSelectedRequest(request)
                        setCancelDialogOpen(true)
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">My Leaves</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            View and manage your leave requests
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Request Leave
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Request Leave {isOnProbation}</DialogTitle>
              <DialogDescription>
                Submit a new leave request for approval
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 px-4">
              {error && (
                <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label>Leave Type *</Label>
                <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTypes
                      .filter((type) => {
                        // Filter by probation status
                        if (isOnProbation && !type.name.toLowerCase().includes("probation")) {
                          return false
                        }
                        // Only show leave types that user has a balance record for
                        return balanceLeaveTypeIds.has(type.id)
                      })
                      .map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              {/* No Pay Info - shown when balance is insufficient or all balances are zero */}
              {(availableLeaveTypeIds.size === 0) && balanceLeaveTypeIds.size > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-sm text-amber-800">
                    No leave balance available. Your leave request will be submitted as unpaid leave (No Pay).
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label>Leave Mode *</Label>
                {isOnProbation ? (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      You are currently on probation. Only half-day leave is allowed.
                    </p>
                    <Select value={leaveMode} onValueChange={(value: 'FULL' | 'HALF' | 'SHORT') => setLeaveMode(value)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HALF">Half Day</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <Select value={leaveMode} onValueChange={(value: 'FULL' | 'HALF' | 'SHORT') => setLeaveMode(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select leave mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FULL">Full Day</SelectItem>
                      <SelectItem value="HALF">Half Day</SelectItem>
                      <SelectItem value="SHORT">Short Leave</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              
              {/* Half Day Selection */}
              {leaveMode === 'HALF' && (
                <div className="space-y-4 p-4 border rounded-md bg-slate-50">
                  <div className="text-sm font-medium text-slate-700">Morning Half / Evening Half *</div>
                  <div className="flex gap-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="halfDayOption"
                        value="MORNING"
                        checked={halfDayOption === 'MORNING'}
                        onChange={() => setHalfDayOption('MORNING')}
                        className="w-4 h-4 text-primary"
                      />
                      <span className="text-sm text-black">Morning Half</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="halfDayOption"
                        value="EVENING"
                        checked={halfDayOption === 'EVENING'}
                        onChange={() => setHalfDayOption('EVENING')}
                        className="w-4 h-4 text-primary"
                      />
                      <span className="text-sm text-black">Evening Half</span>
                    </label>
                  </div>
                </div>
              )}
              
              {/* Short Leave Time Selection */}
              {leaveMode === 'SHORT' && (
                <div className="space-y-4 border rounded-md bg-slate-50">
                  <div className="p-4 text-sm font-medium text-slate-700">Short Leave Time Range * (Max 2 hours)</div>
                  <div className="grid sm:grid-cols-2 grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground p-4">
                    Short leave is limited to a maximum of 2 hours. Please select a time range within working hours (8:30 AM - 5:00 PM).
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date *</Label>
                  <DatePicker
                    date={startDate}
                    onDateChange={setStartDate}
                    placeholder="Select start date"
                    minDate={getMinSelectableDate()}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date *</Label>
                  <DatePicker
                    date={endDate}
                    onDateChange={setEndDate}
                    placeholder="Select end date"
                    minDate={getMinSelectableDate()}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reason *</Label>
                <Select value={reason} onValueChange={(value: 'Exam Leave'| 'Study Leave'| 'Religious Holiday'| 'Sick Leave'| 'Medical Appointment'| 'Hospitalization'| 'Funeral'| 'Personal Leave') => setReason(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Personal Leave">Personal Leave</SelectItem>
                    <SelectItem value="Exam Leave">Exam Leave</SelectItem>
                    <SelectItem value="Study Leave">Study Leave</SelectItem>
                    <SelectItem value="Religious Holiday">Religious Holiday</SelectItem>
                    <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                    <SelectItem value="Medical Appointment">Medical Appointment</SelectItem>
                    <SelectItem value="Hospitalization">Hospitalization</SelectItem>
                    <SelectItem value="Funeral">Funeral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting} className="w-full sm:w-auto">
                {submitting ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted p-1 rounded-md w-full sm:w-auto">
          <TabsTrigger value="pending" className="flex-1 sm:flex-none text-xs sm:text-sm">
            Pending ({getStatusCount("pending")})
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex-1 sm:flex-none text-xs sm:text-sm">
            Approved ({getStatusCount("approved")})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex-1 sm:flex-none text-xs sm:text-sm">
            Rejected ({getStatusCount("rejected")})
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="flex-1 sm:flex-none text-xs sm:text-sm">
            Cancelled ({getStatusCount("cancelled")})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardContent className="p-4">
              {renderMobileCards(getFilteredRequests())}
              <div className="hidden md:block">
                {renderTable(getFilteredRequests())}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved">
          <Card>
            <CardContent className="p-4">
              {renderMobileCards(getFilteredRequests())}
              <div className="hidden md:block">
                {renderTable(getFilteredRequests())}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rejected">
          <Card>
            <CardContent className="p-4">
              {renderMobileCards(getFilteredRequests())}
              <div className="hidden md:block">
                {renderTable(getFilteredRequests())}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cancelled">
          <Card>
            <CardContent className="p-4">
              {renderMobileCards(getFilteredRequests())}
              <div className="hidden md:block">
                {renderTable(getFilteredRequests())}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="w-[95vw] max-w-3xl">
          <DialogHeader>
            <DialogTitle>Cancel Leave Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for cancelling this leave request.
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <p>
                  <strong>Leave Type:</strong> {selectedRequest.leaveType.name}
                </p>
                <p>
                  <strong>Dates:</strong> {formatDate(selectedRequest.start_date)} -{" "}
                  {formatDate(selectedRequest.end_date)}
                </p>
                <p>
                  <strong>Days:</strong> {selectedRequest.total_days}
                </p>
                {selectedRequest.reason && (
                  <p>
                    <strong>Original Reason:</strong> {selectedRequest.reason}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cancelReason">Cancellation Reason *</Label>
                <Textarea
                  id="cancelReason"
                  placeholder="Please provide a reason for cancellation..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCancelDialogOpen(false)
                setCancelReason("")
              }}
              className="w-full sm:w-auto"
            >
              Keep Request
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={submitting || !cancelReason.trim()}
              className="w-full sm:w-auto"
            >
              {submitting ? "Cancelling..." : "Cancel Request"}
            </Button>
          </DialogFooter>
          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
              {error}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Leave Request Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="w-[95vw] max-w-3xl">
          <DialogHeader>
            <DialogTitle>Leave Request Details</DialogTitle>
            <DialogDescription>
              {selectedRequest?.status === "REJECTED" 
                ? "Your leave request was rejected" 
                : "View your leave request details"}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="py-4 space-y-3">
              <p>
                <strong>Leave Type:</strong> {selectedRequest.leaveType?.name || 'Unknown'}
              </p>
              <p>
                <strong>Dates:</strong> {formatDate(selectedRequest.start_date)} -{" "}
                {formatDate(selectedRequest.end_date)}
              </p>
              <p>
                <strong>Days:</strong> {selectedRequest.total_days}
              </p>
              <p>
                <strong>Mode:</strong>{" "}
                {selectedRequest.leave_mode === 'FULL' ? 'Full Day' :
                  selectedRequest.leave_mode === 'HALF' ? `Half Day (${selectedRequest.half_day_period || 'N/A'})` :
                    selectedRequest.leave_mode === 'SHORT' ? `Short Leave (${selectedRequest.start_time || 'N/A'} - ${selectedRequest.end_time || 'N/A'})` : selectedRequest.leave_mode}
              </p>
              <p>
                <strong>Status:</strong>{" "}
                <Badge className={selectedRequest.status}>
                  {selectedRequest.status}
                </Badge>
                {selectedRequest.is_no_pay && (
                  <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 ml-2">
                    No Pay
                  </Badge>
                )}
              </p>
              <p>
                <strong>Submitted:</strong> {formatDateTime(selectedRequest.created_at)}
              </p>
              {selectedRequest.reason && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium text-muted-foreground">Reason:</p>
                  <p className="text-sm mt-1">
                    {selectedRequest.reason}
                  </p>
                </div>
              )}
              {selectedRequest.status === "CANCELLED" && selectedRequest.cancellation_reason && (
                <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
                  <p className="text-sm font-medium text-orange-800">Cancellation Reason:</p>
                  <p className="text-sm text-orange-700 mt-1">
                    {selectedRequest.cancellation_reason}
                  </p>
                </div>
              )}
              {selectedRequest.status === "REJECTED" && selectedRequest.rejection_reason && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
                  <p className="text-sm text-red-700 mt-1">
                    {selectedRequest.rejection_reason || "No reason provided"}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setDetailsDialogOpen(false)} className="w-full sm:w-auto">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
