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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Shield, Users, Settings, Trash2, Check, X } from "lucide-react"

interface Permission {
  id: string
  name: string
  description: string | null
  module: string
  action: string
  is_active: boolean
  created_at: string
}

interface RolePermission {
  id: string
  role: string
  permission: Permission
}

interface GroupedRolePermissions {
  [role: string]: RolePermission[]
}

export default function ACLPage() {
  const { data: session } = useSession()
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [rolePermissions, setRolePermissions] = useState<GroupedRolePermissions>({})
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<string>("")

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    module: "",
    action: "",
  })
  const [assignFormData, setAssignFormData] = useState({
    role: "",
    permissionId: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchPermissions()
    fetchRolePermissions()
  }, [])

  const fetchPermissions = async () => {
    try {
      const res = await fetch("/api/permissions")
      const data = await res.json()
      setPermissions(data.permissions || [])
    } catch (err) {
      console.error("Error fetching permissions:", err)
    }
  }

  const fetchRolePermissions = async () => {
    try {
      const res = await fetch("/api/role-permissions")
      const data = await res.json()
      setRolePermissions(data.rolePermissions || {})
    } catch (err) {
      console.error("Error fetching role permissions:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePermission = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError("")

    try {
      const res = await fetch("/api/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to create permission")
        return
      }

      setPermissions([...permissions, data])
      setFormData({ name: "", description: "", module: "", action: "" })
      setDialogOpen(false)
    } catch (err) {
      setError("Failed to create permission")
    } finally {
      setSubmitting(false)
    }
  }

  const handleAssignPermission = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError("")

    try {
      const res = await fetch("/api/role-permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assignFormData),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to assign permission")
        return
      }

      // Update local state
      const role = assignFormData.role
      if (!rolePermissions[role]) {
        rolePermissions[role] = []
      }
      rolePermissions[role].push(data)
      setRolePermissions({ ...rolePermissions })

      setAssignFormData({ role: "", permissionId: "" })
      setAssignDialogOpen(false)
    } catch (err) {
      setError("Failed to assign permission")
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemovePermission = async (role: string, permissionId: string) => {
    if (!confirm(`Remove this permission from ${role}?`)) {
      return
    }

    try {
      const res = await fetch(`/api/role-permissions?role=${role}&permissionId=${permissionId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || "Failed to remove permission")
        return
      }

      // Update local state
      if (rolePermissions[role]) {
        rolePermissions[role] = rolePermissions[role].filter(rp => rp.permission.id !== permissionId)
        setRolePermissions({ ...rolePermissions })
      }
    } catch (err) {
      alert("Failed to remove permission")
    }
  }

  const resetForm = () => {
    setFormData({ name: "", description: "", module: "", action: "" })
    setError("")
  }

  const resetAssignForm = () => {
    setAssignFormData({ role: "", permissionId: "" })
    setError("")
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'destructive'
      case 'HR_MANAGER': return 'default'
      case 'MANAGER': return 'secondary'
      case 'EMPLOYEE': return 'outline'
      default: return 'outline'
    }
  }

  const groupPermissionsByModule = (perms: Permission[]) => {
    return perms.reduce((acc, perm) => {
      if (!acc[perm.module]) {
        acc[perm.module] = []
      }
      acc[perm.module].push(perm)
      return acc
    }, {} as Record<string, Permission[]>)
  }

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  const roles = ['ADMIN', 'HR_MANAGER', 'MANAGER', 'EMPLOYEE']
  const groupedPermissions = groupPermissionsByModule(permissions)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Access Control
          </h1>
          <p className="text-muted-foreground">
            Manage permissions and role-based access control
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setAssignDialogOpen(true)}>
            <Users className="w-4 h-4 mr-2" />
            Assign Permission
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Permission
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Role Permissions */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Role Permissions</h2>
          <div className="grid gap-4">
            {roles.map((role) => (
              <Card key={role}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Badge variant={getRoleColor(role)}>{role}</Badge>
                    <span className="text-lg">
                      {rolePermissions[role]?.length || 0} permissions
                    </span>
                  </CardTitle>
                  <CardDescription>
                    Permissions assigned to the {role.toLowerCase()} role
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {rolePermissions[role]?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {rolePermissions[role].map((rp) => (
                        <div key={rp.id} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <div className="font-medium text-sm">{rp.permission.name}</div>
                            <div className="text-xs text-muted-foreground">{rp.permission.description}</div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemovePermission(role, rp.permission.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No permissions assigned</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* All Permissions */}
        <div>
          <h2 className="text-xl font-semibold mb-4">All Permissions</h2>
          <div className="grid gap-4">
            {Object.entries(groupedPermissions).map(([module, modulePermissions]) => (
              <Card key={module}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    {module.charAt(0).toUpperCase() + module.slice(1)} Module
                  </CardTitle>
                  <CardDescription>
                    Permissions for the {module} module
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Permission</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Assigned Roles</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {modulePermissions.map((permission) => {
                        const assignedRoles = Object.entries(rolePermissions)
                          .filter(([, rps]) =>
                            rps.some(rp => rp.permission.id === permission.id)
                          )
                          .map(([role]) => role)

                        return (
                          <TableRow key={permission.id}>
                            <TableCell className="font-medium">{permission.name}</TableCell>
                            <TableCell>{permission.description || "-"}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{permission.action}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {assignedRoles.map((role) => (
                                  <Badge key={role} variant={getRoleColor(role)} className="text-xs">
                                    {role}
                                  </Badge>
                                ))}
                                {assignedRoles.length === 0 && (
                                  <span className="text-muted-foreground text-sm">None</span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Add Permission Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Permission</DialogTitle>
            <DialogDescription>
              Create a new permission for the system
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreatePermission}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., employees:create"
                  required
                />
              </div>
              <div>
                <Label htmlFor="module">Module *</Label>
                <Input
                  id="module"
                  value={formData.module}
                  onChange={(e) => setFormData({ ...formData, module: e.target.value })}
                  placeholder="e.g., employees"
                  required
                />
              </div>
              <div>
                <Label htmlFor="action">Action *</Label>
                <Input
                  id="action"
                  value={formData.action}
                  onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                  placeholder="e.g., create"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogOpen(false)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create Permission"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Permission Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Permission</DialogTitle>
            <DialogDescription>
              Assign a permission to a role
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssignPermission}>
            <div className="space-y-4">
              <div>
                <Label>Role *</Label>
                <Select
                  value={assignFormData.role}
                  onValueChange={(value) => setAssignFormData({ ...assignFormData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Permission *</Label>
                <Select
                  value={assignFormData.permissionId}
                  onValueChange={(value) => setAssignFormData({ ...assignFormData, permissionId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select permission" />
                  </SelectTrigger>
                  <SelectContent>
                    {permissions.map((permission) => (
                      <SelectItem key={permission.id} value={permission.id}>
                        {permission.name} - {permission.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAssignDialogOpen(false)
                  resetAssignForm()
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Assigning..." : "Assign Permission"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}