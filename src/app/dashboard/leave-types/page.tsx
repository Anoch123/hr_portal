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
    <div className="grid grid-cols-2 gap-4">
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
    <div className="flex items-center gap-6">
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
        return
      }

      setDialogOpen(false)
      resetForm()
      fetchLeaveTypes()
    } catch (err) {
      setError("An error occurred. Please try again.")
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
        return
      }

      setEditDialogOpen(false)
      resetForm()
      fetchLeaveTypes()
    } catch (err) {
      setError("An error occurred. Please try again.")
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
        alert(data.error || "Failed to delete leave type")
        return
      }

      fetchLeaveTypes()
    } catch (err) {
      alert("An error occurred. Please try again.")
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leave Types ({leaveTypes.length})</h1>
          <p className="text-muted-foreground">
            Manage leave types and their configurations
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Leave Type
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Leave Type</DialogTitle>
              <DialogDescription>
                Create a new leave type for employees
              </DialogDescription>
            </DialogHeader>
            <FormContent formData={formData} setFormData={setFormData} error={error} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        {/* <CardHeader>
          <CardTitle>Leave Types</CardTitle>
          <CardDescription>
            Configure different types of leave available to employees
          </CardDescription>
        </CardHeader> */}
        <CardContent>
          {loading ? (
            <p className="text-center py-4">Loading...</p>
          ) : leaveTypes.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">
              No leave types found. Click &quot;Add Leave Type&quot; to create one.
            </p>
          ) : (
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
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Leave Type</DialogTitle>
            <DialogDescription>
              Update leave type configuration
            </DialogDescription>
          </DialogHeader>
          <FormContent formData={formData} setFormData={setFormData} error={error} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={submitting}>
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
