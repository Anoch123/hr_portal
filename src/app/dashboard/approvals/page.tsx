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
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatDate } from "@/lib/utils"
import { Check, X, Eye, Loader2 } from "lucide-react"

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  department: string | null
  position: string | null
}

interface LeaveType {
  id: string
  name: string
}

interface LeaveRequest {
  id: string
  startDate: string
  endDate: string
  totalDays: number
  reason: string | null
  status: string
  createdAt: string
  user: User
  leaveType: LeaveType
}

export default function ApprovalsPage() {
  const { data: session } = useSession()
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set())
  const [error, setError] = useState("")

  useEffect(() => {
    fetchApprovals()
  }, [])

  const fetchApprovals = async () => {
    try {
      const res = await fetch("/api/approvals")
      const data = await res.json()
      setRequests(data.requests || [])
    } catch (err) {
      console.error("Error fetching approvals:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (requestId: string) => {
    setProcessingRequests(prev => new Set(prev).add(requestId))
    setError("")
    try {
      const res = await fetch(`/api/leave-requests/${requestId}/approve`, {
        method: "POST",
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to approve request")
        return
      }

      fetchApprovals()
      setViewDialogOpen(false)
    } catch (err) {
      setError("An error occurred. Please try again.")
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev)
        newSet.delete(requestId)
        return newSet
      })
    }
  }

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason) {
      setError("Please provide a rejection reason")
      return
    }

    setProcessingRequests(prev => new Set(prev).add(selectedRequest.id))
    setError("")
    try {
      const res = await fetch(`/api/leave-requests/${selectedRequest.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectionReason }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to reject request")
        return
      }

      setRejectDialogOpen(false)
      setRejectionReason("")
      fetchApprovals()
    } catch (err) {
      setError("An error occurred. Please try again.")
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev)
        newSet.delete(selectedRequest.id)
        return newSet
      })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pending Approvals ({requests.length})</h1>
        <p className="text-muted-foreground">
          Review and approve leave requests from your team
        </p>
      </div>

      <Card>
        {/* <CardHeader>
          <CardTitle>Leave Requests Awaiting Approval</CardTitle>
          <CardDescription>
            {requests.length} request(s) pending your approval
          </CardDescription>
        </CardHeader> */}
        <CardContent>
          {loading ? (
            <p className="text-center py-4">Loading...</p>
          ) : requests.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">
              No pending approvals at this time.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">
                      {request.user.firstName} {request.user.lastName}
                    </TableCell>
                    <TableCell>{request.user.department || "-"}</TableCell>
                    <TableCell>{request.leaveType.name}</TableCell>
                    <TableCell>
                      {formatDate(request.startDate)} - {formatDate(request.endDate)}
                    </TableCell>
                    <TableCell>{request.totalDays}</TableCell>
                    <TableCell>{formatDate(request.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request)
                            setViewDialogOpen(true)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-green-600 hover:text-green-700"
                          onClick={() => handleApprove(request.id)}
                          disabled={processingRequests.has(request.id)}
                        >
                          {processingRequests.has(request.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => {
                            setSelectedRequest(request)
                            setRejectDialogOpen(true)
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-4">
              {error && (
                <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Employee</Label>
                  <p className="font-medium">
                    {selectedRequest.user.firstName} {selectedRequest.user.lastName}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedRequest.user.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Department</Label>
                  <p className="font-medium">
                    {selectedRequest.user.department || "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Position</Label>
                  <p className="font-medium">
                    {selectedRequest.user.position || "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Leave Type</Label>
                  <p className="font-medium">{selectedRequest.leaveType.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Total Days</Label>
                  <p className="font-medium">{selectedRequest.totalDays}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Start Date</Label>
                  <p className="font-medium">
                    {formatDate(selectedRequest.startDate)}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">End Date</Label>
                  <p className="font-medium">
                    {formatDate(selectedRequest.endDate)}
                  </p>
                </div>
              </div>
              {selectedRequest.reason && (
                <div>
                  <Label className="text-muted-foreground">Reason</Label>
                  <p className="font-medium">{selectedRequest.reason}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setViewDialogOpen(false)}
            >
              Close
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setViewDialogOpen(false)
                setRejectDialogOpen(true)
              }}
            >
              Reject
            </Button>
            <Button
              onClick={() => selectedRequest && handleApprove(selectedRequest.id)}
              disabled={!selectedRequest || processingRequests.has(selectedRequest.id)}
            >
              {selectedRequest && processingRequests.has(selectedRequest.id) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Approve"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this request
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {error && (
              <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm mb-4">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label>Rejection Reason *</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter reason for rejection"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false)
                setRejectionReason("")
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!selectedRequest || processingRequests.has(selectedRequest.id) || !rejectionReason}
            >
              {selectedRequest && processingRequests.has(selectedRequest.id) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                "Reject Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
