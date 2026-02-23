"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Edit, Trash2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface LeaveType {
  id: string
  name: string
  description: string | null
  default_days: number
  is_active: boolean
  is_paid: boolean
  requires_approval: boolean
  max_consecutive_days: number | null
}

interface FormDataType {
  name: string
  description: string
  default_days: number
  is_paid: boolean
  requires_approval: boolean
  max_consecutive_days: string
}

interface FormContentProps {
  formData: FormDataType
  setFormData: (data: FormDataType) => void
  error: string
}

const FormContent = ({ formData, setFormData, error }: FormContentProps) => (
  <div className="space-y-4 py-4">
    {error && (
      <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
        {error}
      </div>
    )}
    <div className="space-y-2">
      <Label>Name *</Label>
      <Input
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="Annual Leave"
        autoFocus
      />
    </div>
    <div className="space-y-2">
      <Label>Description</Label>
      <Textarea
        value={formData.description}
        onChange={(e) =>
          setFormData({ ...formData, description: e.target.value })
        }
        placeholder="Description of the leave type"
      />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Default Days</Label>
        <Input
          type="number"
          min="0"
          value={formData.default_days}
          onChange={(e) =>
            setFormData({ ...formData, default_days: parseInt(e.target.value) || 0 })
          }
        />
      </div>
      <div className="space-y-2">
        <Label>Max Consecutive Days</Label>
        <Input
          type="number"
          min="0"
          value={formData.max_consecutive_days}
          onChange={(e) =>
            setFormData({ ...formData, max_consecutive_days: e.target.value })
          }
          placeholder="No limit"
        />
      </div>
    </div>
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={formData.is_paid}
          onChange={(e) =>
            setFormData({ ...formData, is_paid: e.target.checked })
          }
          className="rounded border-gray-300"
        />
        <span className="text-sm">Paid Leave</span>
      </label>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={formData.requires_approval}
          onChange={(e) =>
            setFormData({ ...formData, requires_approval: e.target.checked })
          }
          className="rounded border-gray-300"
        />
        <span className="text-sm">Requires Approval</span>
      </label>
    </div>
  </div>
)

export default function LeaveTypesPage() {
  const { toast } = useToast()
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<LeaveType | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    default_days: 0,
    is_paid: true,
    requires_approval: true,
    max_consecutive_days: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchLeaveTypes()
  }, [])

  const fetchLeaveTypes = async () => {
    try {
      const res = await fetch("/api/leave-types")
      if (!res.ok) {
        console.error("Failed to fetch leave types")
        return
      }
      const data = await res.json()
      setLeaveTypes(data || [])
    } catch (err) {
      console.error("Error fetching leave types:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    setError("")
    if (!formData.name) {
      setError("Name is required")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/leave-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          max_consecutive_days: formData.max_consecutive_days
            ? parseInt(formData.max_consecutive_days)
            : null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to create leave type")
        toast({
          title: "Error",
          description: data.error || "Failed to create leave type",
          variant: "destructive",
        })
        return
      }

      setDialogOpen(false)
      resetForm()
      fetchLeaveTypes()
      toast({
        title: "Success",
        description: "Leave type created successfully",
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

  const handleUpdate = async () => {
    if (!selectedType) return

    setError("")
    setSubmitting(true)
    try {
      const res = await fetch(`/api/leave-types/${selectedType.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          max_consecutive_days: formData.max_consecutive_days
            ? parseInt(formData.max_consecutive_days)
            : null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to update leave type")
        toast({
          title: "Error",
          description: data.error || "Failed to update leave type",
          variant: "destructive",
        })
        return
      }

      setEditDialogOpen(false)
      resetForm()
      fetchLeaveTypes()
      toast({
        title: "Success",
        description: "Leave type updated successfully",
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

  const handleDelete = async (typeId: string) => {
    if (!confirm("Are you sure you want to delete this leave type?")) return

    try {
      const res = await fetch(`/api/leave-types/${typeId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json()
        toast({
          title: "Error",
          description: data.error || "Failed to delete leave type",
          variant: "destructive",
        })
        return
      }

      fetchLeaveTypes()
      toast({
        title: "Success",
        description: "Leave type deleted successfully",
        variant: "success",
      })
    } catch (err) {
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      default_days: 0,
      is_paid: true,
      requires_approval: true,
      max_consecutive_days: "",
    })
    setError("")
    setSelectedType(null)
  }

  const openEditDialog = (leaveType: LeaveType) => {
    setSelectedType(leaveType)
    setFormData({
      name: leaveType.name,
      description: leaveType.description || "",
      default_days: leaveType.default_days,
      is_paid: leaveType.is_paid,
      requires_approval: leaveType.requires_approval,
      max_consecutive_days: leaveType.max_consecutive_days?.toString() || "",
    })
    setEditDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Leave Types ({leaveTypes.length})</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage leave types and their configurations
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Leave Type
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-3xl">
            <DialogHeader>
              <DialogTitle>Add Leave Type</DialogTitle>
              <DialogDescription>
                Create a new leave type for employees
              </DialogDescription>
            </DialogHeader>
            <FormContent formData={formData} setFormData={setFormData} error={error} />
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={submitting} className="w-full sm:w-auto">
                {submitting ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent>
          {loading ? (
            <p className="text-center py-4">Loading...</p>
          ) : leaveTypes.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">
              No leave types found. Click &quot;Add Leave Type&quot; to create one.
            </p>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="sm:hidden space-y-3">
                {leaveTypes.map((type) => (
                  <Card key={type.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium">{type.name}</div>
                          {type.description && (
                            <div className="text-sm text-muted-foreground">{type.description}</div>
                          )}
                        </div>
                        <Badge
                          variant={type.is_active ? "success" : "secondary"}
                          className="text-xs"
                        >
                          {type.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Default Days: </span>
                          <span>{type.default_days}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Max Consecutive: </span>
                          <span>{type.max_consecutive_days || "No limit"}</span>
                        </div>
                        <div>
                          <Badge variant={type.is_paid ? "success" : "secondary"} className="text-xs">
                            {type.is_paid ? "Paid" : "Unpaid"}
                          </Badge>
                        </div>
                        <div>
                          <Badge variant={type.requires_approval ? "info" : "secondary"} className="text-xs">
                            {type.requires_approval ? "Approval Required" : "No Approval"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(type)}
                          className="flex-1"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 flex-1"
                          onClick={() => handleDelete(type.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Default Days</TableHead>
                      <TableHead>Max Consecutive</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Requires Approval</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaveTypes.map((type) => (
                      <TableRow key={type.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{type.name}</p>
                            {type.description && (
                              <p className="text-sm text-muted-foreground">
                                {type.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{type.default_days}</TableCell>
                        <TableCell>
                          {type.max_consecutive_days || "No limit"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={type.is_paid ? "success" : "secondary"}>
                            {type.is_paid ? "Yes" : "No"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={type.requires_approval ? "info" : "secondary"}
                          >
                            {type.requires_approval ? "Yes" : "No"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={type.is_active ? "success" : "secondary"}
                          >
                            {type.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(type)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDelete(type.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="w-[95vw] max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Leave Type</DialogTitle>
            <DialogDescription>
              Update leave type configuration
            </DialogDescription>
          </DialogHeader>
          <FormContent formData={formData} setFormData={setFormData} error={error} />
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={submitting} className="w-full sm:w-auto">
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
