"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { formatDate, getRoleColor, formatRole } from "@/lib/utils"
import { Plus, Search, Edit, UserX, Calendar } from "lucide-react"
import { read } from "fs"

interface LeaveBalance {
  id: string
  year: number
  total_days: number
  used_days: number
  pending_days: number
  carried_over: number
  leaveType: {
    id: string
    name: string
    description: string | null
    isPaid: boolean
  }
}

interface Employee {
  id: string
  email: string
  first_name: string
  last_name: string
  role: string
  department: string | null
  position: string | null
  is_active: boolean
  createdAt: string
  manager: {
    id: string
    first_name: string
    last_name: string
  } | null
}

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

export default function EmployeesPage() {
  const { data: session } = useSession()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [managers, setManagers] = useState<Employee[]>([])
  const [employeeBalancesMap, setEmployeeBalancesMap] = useState<Record<string, LeaveBalance[]>>({})
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [employeeBalances, setEmployeeBalances] = useState<LeaveBalance[]>([])
  const [editingBalance, setEditingBalance] = useState<LeaveBalance | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    role: "EMPLOYEE",
    department: "",
    position: "",
    managerId: "none",
  })
  const [balanceFormData, setBalanceFormData] = useState({
    leaveTypeId: "",
    totalDays: "",
    carriedOver: "0",
    year: new Date().getFullYear().toString(),
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchEmployees()
    fetchLeaveTypes()
  }, [search])

  const fetchEmployees = async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      params.append("limit", "100")

      const res = await fetch(`/api/employees?${params}`)
      const data = await res.json()
      const empList = data.employees || []
      setEmployees(empList)

      // Filter managers for the dropdown
      const managerList = empList.filter((e: any) => {
        return ["ADMIN", "HR_MANAGER", "MANAGER"].includes(e.role) && e.is_active
      })

      console.log("Filtered managers:", managerList)
      setManagers(managerList)

      // Fetch balances for all employees
      await fetchEmployeeBalances(empList)
    } catch (err) {
      console.error("Error fetching employees:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchEmployeeBalances = async (empList: Employee[]) => {
    const currentYear = new Date().getFullYear()
    const balancePromises = empList.map(async (employee) => {
      try {
        const res = await fetch(`/api/leave-balances?year=${currentYear}&employee_id=${employee.id}`)
        const balances = await res.json()
        return { employeeId: employee.id, balances: balances || [] }
      } catch (err) {
        console.error(`Error fetching balances for ${employee.id}:`, err)
        return { employeeId: employee.id, balances: [] }
      }
    })

    const results = await Promise.all(balancePromises)
    const balancesMap: Record<string, LeaveBalance[]> = {}
    results.forEach(({ employeeId, balances }) => {
      balancesMap[employeeId] = balances
    })
    setEmployeeBalancesMap(balancesMap)
  }

  const fetchLeaveTypes = async () => {
    try {
      const res = await fetch("/api/leave-types")
      const data = await res.json()
      setLeaveTypes(data || [])
    } catch (err) {
      console.error("Error fetching leave types:", err)
    }
  }

  const handleCreate = async () => {
    setError("")
    if (!formData.email || !formData.first_name || !formData.last_name) {
      setError("Please fill in all required fields")
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        ...formData,
        managerId: formData.managerId === "none" ? null : formData.managerId,
      }

      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to create employee")
        return
      }

      setDialogOpen(false)
      resetForm()
      fetchEmployees()
    } catch (err) {
      setError("An error occurred. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async () => {
    if (!selectedEmployee) return

    setError("")
    setSubmitting(true)
    try {
      const payload = {
        ...formData,
        managerId: formData.managerId === "none" ? null : formData.managerId,
      }

      const res = await fetch(`/api/employees/${selectedEmployee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to update employee")
        return
      }

      setEditDialogOpen(false)
      resetForm()
      fetchEmployees()
    } catch (err) {
      setError("An error occurred. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeactivate = async (employeeId: string) => {
    if (!confirm("Are you sure you want to deactivate this employee?")) return

    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || "Failed to deactivate employee")
        return
      }

      fetchEmployees()
    } catch (err) {
      alert("An error occurred. Please try again.")
    }
  }

  const handleCreateBalance = async () => {
    if (!selectedEmployee) return

    setError("")
    if (!balanceFormData.leaveTypeId) {
      setError("Please select a leave type")
      return
    }

    // Check if leave type already exists
    const existingBalance = employeeBalances.find(b => b.leaveType.id === balanceFormData.leaveTypeId)
    if (existingBalance && !editingBalance) {
      setError("A balance for this leave type already exists")
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        userId: selectedEmployee.id,
        leaveTypeId: balanceFormData.leaveTypeId,
        year: parseInt(balanceFormData.year),
        totalDays: balanceFormData.totalDays ? parseFloat(balanceFormData.totalDays) : undefined,
        carriedOver: parseFloat(balanceFormData.carriedOver) || 0,
      }

      const res = await fetch("/api/leave-balances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to save leave balance")
        return
      }

      // Refresh balances
      const currentYear = new Date().getFullYear()
      const refreshRes = await fetch(`/api/leave-balances?year=${currentYear}&employee_id=${selectedEmployee.id}`)
      const updatedBalances = await refreshRes.json()
      setEmployeeBalances(updatedBalances || [])

      setShowAddForm(false)
      setEditingBalance(null)
      resetBalanceForm()
      fetchEmployees() // Refresh the table
    } catch (err) {
      setError("An error occurred. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const openBalanceDialog = async (employee: Employee) => {
    setSelectedEmployee(employee)

    // Fetch employee's balances for current year
    const currentYear = new Date().getFullYear()
    try {
      const res = await fetch(`/api/leave-balances?year=${currentYear}&employee_id=${employee.id}`)
      const balances = await res.json()
      setEmployeeBalances(balances || [])
    } catch (err) {
      console.error("Error fetching employee balances:", err)
      setEmployeeBalances([])
    }

    setEditingBalance(null)
    setShowAddForm(false)
    setBalanceDialogOpen(true)
  }

  const startEditingBalance = (balance: LeaveBalance) => {
    setEditingBalance(balance)
    setBalanceFormData({
      leaveTypeId: balance.leaveType.id,
      totalDays: balance.total_days.toString(),
      carriedOver: balance.carried_over.toString(),
      year: balance.year.toString(),
    })
    setShowAddForm(false)
  }

  const cancelEditing = () => {
    setEditingBalance(null)
    setShowAddForm(false)
    resetBalanceForm()
  }

  const startAddingBalance = () => {
    setEditingBalance(null)
    setBalanceFormData({
      leaveTypeId: "",
      totalDays: "",
      carriedOver: "0",
      year: new Date().getFullYear().toString(),
    })
    setShowAddForm(true)
  }

  const resetForm = () => {
    setFormData({
      email: "",
      first_name: "",
      last_name: "",
      role: "EMPLOYEE",
      department: "",
      position: "",
      managerId: "none",
    })
    setError("")
    setSelectedEmployee(null)
  }

  const resetBalanceForm = () => {
    setBalanceFormData({
      leaveTypeId: "",
      totalDays: "",
      carriedOver: "0",
      year: new Date().getFullYear().toString(),
    })
    setError("")
  }

  const openEditDialog = (employee: Employee) => {
    setSelectedEmployee(employee)
    setFormData({
      email: employee.email,
      first_name: employee.first_name,
      last_name: employee.last_name,
      role: employee.role,
      department: employee.department || "",
      position: employee.position || "",
      managerId: employee.manager?.id || "none",
    })
    setEditDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Employees ({employees.length})</h1>
          <p className="text-muted-foreground">
            Manage employee accounts and information
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
              <DialogDescription>
                Create a new employee account. They will receive an email with login credentials.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {error && (
                <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name *</Label>
                  <Input
                    value={formData.first_name}
                    onChange={(e) =>
                      setFormData({ ...formData, first_name: e.target.value })
                    }
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name *</Label>
                  <Input
                    value={formData.last_name}
                    onChange={(e) =>
                      setFormData({ ...formData, last_name: e.target.value })
                    }
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="john.doe@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="HR_MANAGER">HR Manager</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({ ...formData, department: e.target.value })
                    }
                    placeholder="Engineering"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Position</Label>
                  <Input
                    value={formData.position}
                    onChange={(e) =>
                      setFormData({ ...formData, position: e.target.value })
                    }
                    placeholder="Software Engineer"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Manager</Label>
                <Select
                  value={formData.managerId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, managerId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Manager</SelectItem>
                    {managers.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.first_name} {manager.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting ? "Creating..." : "Create Employee"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            {/* <div>
              <CardTitle>Employee List</CardTitle>
              <CardDescription>
                {employees.length} employee(s) found
              </CardDescription>
            </div> */}
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-4">Loading...</p>
          ) : employees.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">
              No employees found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Leave Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">
                      {employee.first_name} {employee.last_name}
                    </TableCell>
                    <TableCell>{employee.email}</TableCell>
                    <TableCell>
                      <Badge className={employee.role}>
                        {formatRole(employee.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>{employee.department || "-"}</TableCell>
                    <TableCell>
                      {employee.manager
                        ? `${employee.manager.first_name} ${employee.manager.last_name}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const balances = employeeBalancesMap[employee.id] || []
                        const totalAvailable = balances.reduce((sum, b) => sum + (b.total_days + b.carried_over - b.used_days - b.pending_days), 0)
                        return totalAvailable > 0 ? totalAvailable.toFixed(1) : "-"
                      })()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={employee.is_active ? "success" : "secondary"}
                      >
                        {employee.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(employee)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openBalanceDialog(employee)}
                        >
                          <Calendar className="h-4 w-4" />
                        </Button>
                        {employee.is_active && employee.role !== "ADMIN" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeactivate(employee.id)}
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        )}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update employee information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && (
              <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
                {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input
                  value={formData.first_name}
                  onChange={(e) =>
                    setFormData({ ...formData, first_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input
                  value={formData.last_name}
                  onChange={(e) =>
                    setFormData({ ...formData, last_name: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email}
                disabled={formData.role === "ADMIN"}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={formData.role}
                disabled={formData.role === "ADMIN"}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPLOYEE">Employee</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="HR_MANAGER">HR Manager</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Department</Label>
                <Input
                  value={formData.department}
                  disabled={formData.role === "ADMIN"}
                  onChange={(e) =>
                    setFormData({ ...formData, department: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Position</Label>
                <Input
                  value={formData.position}
                  disabled={formData.role === "ADMIN"}
                  onChange={(e) =>
                    setFormData({ ...formData, position: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Manager</Label>
              <Select
                value={formData.managerId}
                disabled={formData.role === "ADMIN"}
                onValueChange={(value) =>
                  setFormData({ ...formData, managerId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Manager</SelectItem>
                  {managers
                    .filter((m) => m.id !== selectedEmployee?.id)
                    .map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.first_name} {manager.last_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
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

      {/* Balance Dialog */}
      <Dialog open={balanceDialogOpen} onOpenChange={setBalanceDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Leave Balances</DialogTitle>
            <DialogDescription>
              View and manage leave balances for {selectedEmployee?.first_name} {selectedEmployee?.last_name} ({new Date().getFullYear()})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* Existing Balances */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Current Balances</Label>
                <Button onClick={startAddingBalance} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Balance
                </Button>
              </div>

              {employeeBalances.length === 0 ? (
                <p className="text-sm text-muted-foreground">No leave balances found for this year.</p>
              ) : (
                <div className="space-y-2">
                  {employeeBalances.map((balance) => (
                    <Card key={balance.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{balance.leaveType.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Total: {balance.total_days} days | Carried Over: {balance.carried_over} days | Used: {balance.used_days} days | Available: {(balance.total_days + balance.carried_over - balance.used_days - balance.pending_days).toFixed(1)} days
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEditingBalance(balance)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Add/Edit Form */}
            {(showAddForm || editingBalance) && (
              <Card className="p-4 border-dashed">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">
                      {editingBalance ? "Edit Balance" : "Add New Balance"}
                    </Label>
                    <Button variant="ghost" size="sm" onClick={cancelEditing}>
                      Cancel
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Leave Type *</Label>
                      <Select
                        value={balanceFormData.leaveTypeId}
                        onValueChange={(value) =>
                          setBalanceFormData({ ...balanceFormData, leaveTypeId: value })
                        }
                        disabled={!!editingBalance}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select leave type" />
                        </SelectTrigger>
                        <SelectContent>
                          {leaveTypes
                            .filter(type => !employeeBalances.some(b => b.leaveType.id === type.id) || editingBalance?.leaveType.id === type.id)
                            .map((type) => (
                              <SelectItem key={type.id} value={type.id}>
                                {type.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Year</Label>
                      <Input
                        type="number"
                        value={balanceFormData.year}
                        onChange={(e) =>
                          setBalanceFormData({ ...balanceFormData, year: e.target.value })
                        }
                        disabled={!!editingBalance}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Total Days</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={balanceFormData.totalDays}
                        onChange={(e) =>
                          setBalanceFormData({ ...balanceFormData, totalDays: e.target.value })
                        }
                        placeholder="Leave blank for default"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Carried Over</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={balanceFormData.carriedOver}
                        onChange={(e) =>
                          setBalanceFormData({ ...balanceFormData, carriedOver: e.target.value })
                        }
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={cancelEditing}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateBalance} disabled={submitting}>
                      {submitting ? "Saving..." : editingBalance ? "Update Balance" : "Add Balance"}
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBalanceDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
