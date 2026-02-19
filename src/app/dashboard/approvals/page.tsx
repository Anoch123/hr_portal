"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { formatDate, formatDateTime } from "@/lib/utils"
import { Check, X, Eye, Loader2, Search } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

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
  isNoPay: boolean
  rejectionReason: string | null
  createdAt: string
  leaveMode: 'FULL' | 'HALF' | 'SHORT'
  startTime: string | null
  endTime: string | null
  user: User
  leaveType: LeaveType
}

export default function ApprovalsPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([])
  const [approvedRequests, setApprovedRequests] = useState<LeaveRequest[]>([])
  const [rejectedRequests, setRejectedRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [cancelReason, setCancelReason] = useState("")
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelRequestId, setCancelRequestId] = useState<string | null>(null)
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set())
  const [error, setError] = useState("")
  const [searchPending, setSearchPending] = useState("")
  const [searchApproved, setSearchApproved] = useState("")
  const [searchRejected, setSearchRejected] = useState("")

  useEffect(() => {
    fetchAllApprovals()
  }, [])

  const fetchAllApprovals = async () => {
    try {
      const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
        fetch("/api/approvals?status=PENDING"),
        fetch("/api/approvals?status=APPROVED"),
        fetch("/api/approvals?status=REJECTED"),
      ])

      const [pendingData, approvedData, rejectedData] = await Promise.all([
        pendingRes.json(),
        approvedRes.json(),
        rejectedRes.json(),
      ])

      setPendingRequests(pendingData.requests || [])
      setApprovedRequests(approvedData.requests || [])
      setRejectedRequests(rejectedData.requests || [])
    } catch (err) {
      console.error("Error fetching approvals:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchRequestsByStatus = async (status: string, search: string = "") => {
    try {
      const res = await fetch(`/api/approvals?status=${status}&search=${encodeURIComponent(search)}`)
      const data = await res.json()
      
      switch (status) {
        case "PENDING":
          setPendingRequests(data.requests || [])
          break
        case "APPROVED":
          setApprovedRequests(data.requests || [])
          break
        case "REJECTED":
          setRejectedRequests(data.requests || [])
          break
      }
    } catch (err) {
      console.error(`Error fetching ${status} requests:`, err)
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
        toast({
          title: "Error",
          description: data.error || "Failed to approve request",
          variant: "destructive",
        })
        return
      }

      fetchAllApprovals()
      setViewDialogOpen(false)
      toast({
        title: "Success",
        description: "Leave request approved successfully",
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
        toast({
          title: "Error",
          description: data.error || "Failed to reject request",
          variant: "destructive",
        })
        return
      }

      setRejectDialogOpen(false)
      setRejectionReason("")
      fetchAllApprovals()
      toast({
        title: "Success",
        description: "Leave request rejected successfully",
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
      setProcessingRequests(prev => {
        const newSet = new Set(prev)
        newSet.delete(selectedRequest.id)
        return newSet
      })
    }
  }

  const handleCancelApproved = async () => {
    if (!cancelRequestId || !cancelReason) {
      setError("Please provide a cancellation reason")
      return
    }

    setProcessingRequests(prev => new Set(prev).add(cancelRequestId))
    setError("")
    try {
      const res = await fetch(`/api/leave-requests/${cancelRequestId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to cancel approved request")
        toast({
          title: "Error",
          description: data.error || "Failed to cancel approved request",
          variant: "destructive",
        })
        return
      }

      fetchAllApprovals()
      setViewDialogOpen(false)
      toast({
        title: "Success",
        description: "Approved leave cancelled successfully",
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
      setProcessingRequests(prev => {
        const newSet = new Set(prev)
        newSet.delete(cancelRequestId)
        return newSet
      })
    }
  }

  const openCancelDialog = (requestId: string) => {
    setCancelRequestId(requestId)
    setCancelReason("")
    setError("")
    setCancelDialogOpen(true)
  }

  const filterRequests = (requests: LeaveRequest[], search: string) => {
    if (!search.trim()) return requests
    const searchLower = search.toLowerCase()
    return requests.filter(
      (r) =>
        r.user.firstName.toLowerCase().includes(searchLower) ||
        r.user.lastName.toLowerCase().includes(searchLower) ||
        r.user.email.toLowerCase().includes(searchLower) ||
        r.leaveType.name.toLowerCase().includes(searchLower)
    )
  }

  const renderRequestsTable = (requests: LeaveRequest[], showActions: boolean = true) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Employee</TableHead>
          <TableHead>Department</TableHead>
          <TableHead>Leave Type</TableHead>
          <TableHead>Mode</TableHead>
          <TableHead>Dates</TableHead>
          <TableHead>Days</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>Submitted</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.length === 0 ? (
          <TableRow>
            <TableCell colSpan={9} className="text-center py-4 text-muted-foreground">
              No requests found
            </TableCell>
          </TableRow>
        ) : (
          requests.map((request) => (
            <TableRow key={request.id}>
              <TableCell className="font-medium">
                {request.user.firstName} {request.user.lastName}
              </TableCell>
              <TableCell>{request.user.department || "-"}</TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  {request.leaveType.name}
                  {request.isNoPay && (
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 w-fit text-xs">
                      No Pay
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {request.leaveMode === 'FULL' ? 'Full Day' :
                  request.leaveMode === 'HALF' ? `Half Day (${request.startTime || 'N/A'} - ${request.endTime || 'N/A'})` :
                    request.leaveMode === 'SHORT' ? `Short (${request.startTime || 'N/A'} - ${request.endTime || 'N/A'})` : request.leaveMode}
              </TableCell>
              <TableCell>
                {formatDate(request.startDate)} - {formatDate(request.endDate)}
              </TableCell>
              <TableCell>{request.totalDays}</TableCell>
              <TableCell className="max-w-[150px] truncate" title={request.reason || ''}>
                {request.reason || "-"}
              </TableCell>
              <TableCell>{formatDateTime(request.createdAt)}</TableCell>
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
                  {showActions && request.status === "PENDING" && (
                    <>
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
                    </>
                  )}
                  {!showActions && request.status === "REJECTED" && request.rejectionReason && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedRequest(request)
                        setViewDialogOpen(true)
                      }}
                    >
                      View Details
                    </Button>
                  )}
                  {/* Allow approvers to cancel approved requests */}
                  {!showActions && request.status === "APPROVED" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => openCancelDialog(request.id)}
                      disabled={processingRequests.has(request.id)}
                    >
                      {processingRequests.has(request.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Leave Approvals</h1>
        <p className="text-muted-foreground">
          Review and manage leave requests from your team
        </p>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({approvedRequests.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({rejectedRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                {/* <CardTitle>Pending Approvals</CardTitle> */}
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or leave type..."
                    value={searchPending}
                    onChange={(e) => {
                      setSearchPending(e.target.value)
                      fetchRequestsByStatus("PENDING", e.target.value)
                    }}
                    className="pl-8"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center py-4">Loading...</p>
              ) : (
                renderRequestsTable(filterRequests(pendingRequests, searchPending), true)
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                {/* <CardTitle>Approved Requests</CardTitle> */}
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or leave type..."
                    value={searchApproved}
                    onChange={(e) => {
                      setSearchApproved(e.target.value)
                      fetchRequestsByStatus("APPROVED", e.target.value)
                    }}
                    className="pl-8"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center py-4">Loading...</p>
              ) : (
                renderRequestsTable(filterRequests(approvedRequests, searchApproved), false)
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rejected">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                {/* <CardTitle>Rejected Requests</CardTitle> */}
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or leave type..."
                    value={searchRejected}
                    onChange={(e) => {
                      setSearchRejected(e.target.value)
                      fetchRequestsByStatus("REJECTED", e.target.value)
                    }}
                    className="pl-8"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center py-4">Loading...</p>
              ) : (
                renderRequestsTable(filterRequests(rejectedRequests, searchRejected), false)
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{selectedRequest.leaveType.name}</p>
                    {selectedRequest.isNoPay && (
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-xs">
                        No Pay
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge className={selectedRequest.status}>
                    {selectedRequest.status}
                  </Badge>
                </div>
                <div>
                   <Label className="text-muted-foreground">Total Days</Label>
                   <p className="font-medium">{selectedRequest.totalDays}</p>
                 </div>
                 <div>
                   <Label className="text-muted-foreground">Leave Mode</Label>
                   <p className="font-medium">
                     {selectedRequest.leaveMode === 'FULL' ? 'Full Day' :
                       selectedRequest.leaveMode === 'HALF' ? `Half Day (${selectedRequest.startTime || 'N/A'} - ${selectedRequest.endTime || 'N/A'})` :
                         selectedRequest.leaveMode === 'SHORT' ? `Short Leave (${selectedRequest.startTime || 'N/A'} - ${selectedRequest.endTime || 'N/A'})` : selectedRequest.leaveMode}
                   </p>
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
                <div>
                  <Label className="text-muted-foreground">Submitted</Label>
                  <p className="font-medium">
                    {formatDateTime(selectedRequest.createdAt)}
                  </p>
                </div>
              </div>
              {selectedRequest.reason && (
                <div>
                  <Label className="text-muted-foreground">Reason</Label>
                  <p className="font-medium">{selectedRequest.reason}</p>
                </div>
              )}
              {selectedRequest.status === "REJECTED" && selectedRequest.rejectionReason && (
                <div className="bg-red-50 p-3 rounded-md">
                  <Label className="text-red-600">Rejection Reason</Label>
                  <p className="font-medium text-red-700">{selectedRequest.rejectionReason}</p>
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
            {selectedRequest?.status === "PENDING" && (
              <>
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
              </>
            )}
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

      {/* Cancel Approved Leave Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Approved Leave</DialogTitle>
            <DialogDescription>
              Please provide a reason for cancelling this approved leave request.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
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
          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
              {error}
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCancelDialogOpen(false)
                setCancelReason("")
                setError("")
              }}
              className="w-full sm:w-auto"
            >
              Keep Request
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelApproved}
              disabled={processingRequests.has(cancelRequestId || "") || !cancelReason.trim()}
              className="w-full sm:w-auto"
            >
              {processingRequests.has(cancelRequestId || "") ? "Cancelling..." : "Cancel Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
