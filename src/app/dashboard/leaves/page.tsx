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
import { formatDate, getStatusColor } from "@/lib/utils"
import { Plus, X } from "lucide-react"

interface LeaveType {
  id: string
  name: string
  description: string | null
}

interface LeaveRequest {
  id: string
  start_date: string
  end_date: string
  total_days: number
  reason: string | null
  status: string
  leave_mode: 'FULL' | 'HALF' | 'SHORT'
  created_at: string
  leaveType: LeaveType
}

export default function LeavesPage() {
  const { data: session } = useSession()
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null)

  // Form state
  const [leaveTypeId, setLeaveTypeId] = useState("")
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()
  const [leaveMode, setLeaveMode] = useState<'FULL' | 'HALF' | 'SHORT'>('FULL')
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchRequests()
    fetchLeaveTypes()
  }, [])

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/leave-requests?myRequests=true")
      const data = await res.json()
      console.log(data);
      setRequests(data.requests || [])
    } catch (err) {
      console.error("Error fetching requests:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchLeaveTypes = async () => {
    try {
      const res = await fetch("/api/leave-types?activeOnly=true")
      const data = await res.json()
      setLeaveTypes(data || [])
    } catch (err) {
      console.error("Error fetching leave types:", err)
    }
  }

  const handleSubmit = async () => {
    setError("")
    if (!leaveTypeId || !startDate || !endDate) {
      setError("Please fill in all required fields")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/leave-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveTypeId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          leaveMode,
          reason,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to submit request")
        return
      }

      setDialogOpen(false)
      resetForm()
      fetchRequests()
    } catch (err) {
      setError("An error occurred. Please try again.")
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
        body: JSON.stringify({ reason: "Cancelled by employee" }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to cancel request")
        return
      }

      setCancelDialogOpen(false)
      setSelectedRequest(null)
      fetchRequests()
    } catch (err) {
      setError("An error occurred. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setLeaveTypeId("")
    setStartDate(undefined)
    setEndDate(undefined)
    setLeaveMode('FULL')
    setReason("")
    setError("")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Leaves</h1>
          <p className="text-muted-foreground">
            View and manage your leave requests
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Request Leave
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Leave</DialogTitle>
              <DialogDescription>
                Submit a new leave request for approval
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
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
                    {leaveTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Leave Mode *</Label>
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date *</Label>
                  <DatePicker
                    date={startDate}
                    onDateChange={setStartDate}
                    placeholder="Select start date"
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date *</Label>
                  <DatePicker
                    date={endDate}
                    onDateChange={setEndDate}
                    placeholder="Select end date"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reason (Optional)</Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for leave"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        {/* <CardHeader>
          <CardTitle>Leave Requests</CardTitle>
          <CardDescription>Your leave request history</CardDescription>
        </CardHeader> */}
        <CardContent>
          {loading ? (
            <p className="text-center py-4">Loading...</p>
          ) : requests.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">
              No leave requests found. Click &quot;Request Leave&quot; to submit your first request.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">
                      {request.leaveType?.name || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      {request.leave_mode === 'FULL' ? 'Full Day' :
                       request.leave_mode === 'HALF' ? 'Half Day' :
                       request.leave_mode === 'SHORT' ? 'Short Leave' : request.leave_mode}
                    </TableCell>
                    <TableCell>{formatDate(request.start_date)}</TableCell>
                    <TableCell>{formatDate(request.end_date)}</TableCell>
                    <TableCell>{request.total_days}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(request.created_at)}</TableCell>
                    <TableCell>
                      {["PENDING", "APPROVED"].includes(request.status) && (
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Leave Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this leave request?
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="py-4">
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
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
            >
              Keep Request
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={submitting}
            >
              {submitting ? "Cancelling..." : "Cancel Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
