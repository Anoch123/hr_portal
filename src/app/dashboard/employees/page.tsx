"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
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
import { Switch } from "@/components/ui/switch"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { formatRole } from "@/lib/utils"
import { Plus, Search, Edit, UserX, Calendar, UserMinus } from "lucide-react"

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
    isPaid: boolean
  }
}

interface Employee {
   id: string
   email: string
   first_name: string
   last_name: string
   role: string
   department: {
     id: string
     name: string
   } | null
   position: string | null
   nic_no: string | null
   joining_date: string | null
   employee_no: string | null
   is_active: boolean
   resignation_date?: string | null
   termination_reason?: string | null
   createdAt: string
   manager: {
     id: string
     first_name: string
     last_name: string
   } | null
   is_on_probation?: boolean
   probation_start_date?: string | null
   probation_period_months?: number
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

interface Department {
  id: string
  name: string
  description: string | null
}

export default function EmployeesPage() {
  const { data: session } = useSession()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [managers, setManagers] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [employeeBalancesMap, setEmployeeBalancesMap] = useState<Record<string, LeaveBalance[]>>({})
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false)
  const [resignDialogOpen, setResignDialogOpen] = useState(false)
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
    departmentId: "",
    position: "",
    nic_no: "",
    joining_date: "",
    employee_no: "",
    managerId: "none",
    isOnProbation: false,
    probationStartDate: "",
    probationPeriodMonths: 6,
  })
  const [balanceFormData, setBalanceFormData] = useState({
    leaveTypeId: "",
    totalDays: "",
    carriedOver: "0",
    year: new Date().getFullYear().toString(),
  })
  const [resignFormData, setResignFormData] = useState({
    resignationDate: "",
    terminationReason: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("employees")

  // Individual search states for each tab
  const [employeesSearch, setEmployeesSearch] = useState("")
  const [probationSearch, setProbationSearch] = useState("")
  const [resignedSearch, setResignedSearch] = useState("")
  const [managersSearch, setManagersSearch] = useState("")
  const [adminsSearch, setAdminsSearch] = useState("")

  // Helper function to filter employees by search term
  const filterBySearch = (employeeList: Employee[], searchTerm: string) => {
    if (!searchTerm) return employeeList
    const lowerSearch = searchTerm.toLowerCase()
    return employeeList.filter(emp =>
      emp.first_name.toLowerCase().includes(lowerSearch) ||
      emp.last_name.toLowerCase().includes(lowerSearch) ||
      emp.email.toLowerCase().includes(lowerSearch) ||
      (emp.employee_no && emp.employee_no.toLowerCase().includes(lowerSearch)) ||
      (emp.department?.name && emp.department.name.toLowerCase().includes(lowerSearch))
    )
  }

  // Filter employees by category with search
  const baseConfirmedEmployees = employees.filter(emp => emp.is_active && !emp.is_on_probation && emp.role === "EMPLOYEE")
  const baseProbationEmployees = employees.filter(emp => emp.is_on_probation)
  const baseResignedEmployees = employees.filter(emp => !emp.is_active && emp.resignation_date)
  const baseManagers = employees.filter(emp => ["MANAGER", "HR_MANAGER"].includes(emp.role))
  const baseAdmins = employees.filter(emp => emp.role === "ADMIN")

  // Apply search filters
  const confirmedEmployees = filterBySearch(baseConfirmedEmployees, employeesSearch)
  const probationEmployees = filterBySearch(baseProbationEmployees, probationSearch)
  const resignedEmployees = filterBySearch(baseResignedEmployees, resignedSearch)
  const filteredManagers = filterBySearch(baseManagers, managersSearch)
  const filteredAdmins = filterBySearch(baseAdmins, adminsSearch)

  useEffect(() => {
    fetchEmployees()
    fetchLeaveTypes()
    fetchDepartments()
  }, [])

  const fetchEmployees = async () => {
    try {
      const params = new URLSearchParams()
      params.append("limit", "100")
      params.append("include_inactive", "true")

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

  const fetchDepartments = async () => {
    try {
      const res = await fetch("/api/departments?limit=100")
      const data = await res.json()
      setDepartments(data.departments || [])
    } catch (err) {
      console.error("Error fetching departments:", err)
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
        is_on_probation: formData.isOnProbation,
        probation_start_date: formData.isOnProbation ? formData.probationStartDate || formData.joining_date : null,
        probation_period_months: formData.probationPeriodMonths,
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
        department_id: formData.departmentId || null,
        managerId: formData.managerId === "none" ? null : formData.managerId,
        is_on_probation: formData.isOnProbation,
        probation_start_date: formData.isOnProbation ? formData.probationStartDate : null,
        probation_period_months: formData.probationPeriodMonths,
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
    if (!confirm("Are you sure you want to terminate this employee? This action cannot be undone.")) return

    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: false }),
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || "Failed to terminate employee")
        return
      }

      fetchEmployees()
    } catch (err) {
      alert("An error occurred. Please try again.")
    }
  }

  const handleResign = async () => {
    if (!selectedEmployee) return

    setError("")
    if (!resignFormData.resignationDate) {
      setError("Please select a resignation date")
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        is_active: false,
        resignation_date: resignFormData.resignationDate,
        termination_reason: resignFormData.terminationReason || "Resignation",
      }

      const res = await fetch(`/api/employees/${selectedEmployee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to process resignation")
        return
      }

      setResignDialogOpen(false)
      resetResignForm()
      fetchEmployees()
    } catch (err) {
      setError("An error occurred. Please try again.")
    } finally {
      setSubmitting(false)
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
      departmentId: "",
      position: "",
      nic_no: "",
      joining_date: "",
      employee_no: "",
      managerId: "none",
      isOnProbation: false,
      probationStartDate: "",
      probationPeriodMonths: 6,
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

  const resetResignForm = () => {
    setResignFormData({
      resignationDate: "",
      terminationReason: "",
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
      departmentId: employee.department?.id || "",
      position: employee.position || "",
      nic_no: employee.nic_no || "",
      joining_date: employee.joining_date || "",
      employee_no: employee.employee_no || "",
      managerId: employee.manager?.id || "none",
      isOnProbation: employee.is_on_probation || false,
      probationStartDate: employee.probation_start_date || "",
      probationPeriodMonths: employee.probation_period_months || 6,
    })
    setEditDialogOpen(true)
  }

  const openResignDialog = (employee: Employee) => {
    setSelectedEmployee(employee)
    setResignFormData({
      resignationDate: "",
      terminationReason: "",
    })
    setResignDialogOpen(true)
  }

  const renderEmployeeTable = (employeeList: Employee[]) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[150px]">Name</TableHead>
            <TableHead className="min-w-[100px]">Role</TableHead>
            <TableHead className="min-w-[120px]">Department</TableHead>
            <TableHead className="min-w-[100px]">Leave Balance</TableHead>
            <TableHead className="min-w-[80px]">Status</TableHead>
            <TableHead className="min-w-[100px]">Probation</TableHead>
            <TableHead className="min-w-[150px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employeeList.map((employee) => (
            <TableRow key={employee.id}>
              <TableCell className="font-medium">
                <div className="flex flex-col">
                  <span>{employee.first_name} {employee.last_name}</span>
                  <span className="text-xs text-muted-foreground">{employee.email}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {formatRole(employee.role)}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">{employee.department?.name || "-"}</TableCell>
              <TableCell className="text-sm">
                {(() => {
                  const balances = employeeBalancesMap[employee.id] || []
                  const totalAvailable = balances.reduce((sum, b) => sum + (b.total_days + b.carried_over - b.used_days), 0)
                  return totalAvailable > 0 ? totalAvailable.toFixed(1) : "-"
                })()}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    employee.is_active
                      ? "default"
                      : employee.resignation_date
                      ? "outline"
                      : "destructive"
                  }
                  className="text-xs"
                >
                  {employee.is_active
                    ? "Active"
                    : employee.resignation_date
                    ? "Resigned"
                    : "Terminated"}
                </Badge>
              </TableCell>
              <TableCell>
                {employee.is_on_probation ? (
                  <Badge variant="destructive" className="text-xs">On Probation</Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1 flex-wrap">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(employee)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openBalanceDialog(employee)}
                    className="h-8 w-8 p-0"
                  >
                    <Calendar className="h-4 w-4" />
                  </Button>
                  {employee.is_active && employee.role !== "ADMIN" && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-orange-600 hover:text-orange-700 h-8 w-8 p-0"
                        onClick={() => openResignDialog(employee)}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                        onClick={() => handleDeactivate(employee.id)}
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Employee Management</h1>
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
                  <Select
                    value={formData.departmentId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, departmentId: value === "none" ? "" : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>NIC No</Label>
                  <Input
                    value={formData.nic_no}
                    onChange={(e) =>
                      setFormData({ ...formData, nic_no: e.target.value })
                    }
                    placeholder="123456789V"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Joining Date</Label>
                  <Input
                    type="date"
                    value={formData.joining_date}
                    onChange={(e) =>
                      setFormData({ ...formData, joining_date: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Employee No</Label>
                  <Input
                    value={formData.employee_no}
                    onChange={(e) =>
                      setFormData({ ...formData, employee_no: e.target.value })
                    }
                    placeholder="EMP001"
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
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="probation"
                    checked={formData.isOnProbation}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isOnProbation: checked })
                    }
                  />
                  <Label htmlFor="probation">On Probation</Label>
                </div>
                {formData.isOnProbation && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Probation Start Date</Label>
                      <Input
                        type="date"
                        value={formData.probationStartDate}
                        onChange={(e) =>
                          setFormData({ ...formData, probationStartDate: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Probation Period (Months)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={formData.probationPeriodMonths}
                        onChange={(e) =>
                          setFormData({ ...formData, probationPeriodMonths: parseInt(e.target.value) || 6 })
                        }
                      />
                    </div>
                  </div>
                )}
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
        {/* <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Employee Management</h2>
              <p className="text-sm text-muted-foreground">
                Manage employees by category with individual search
              </p>
            </div>
          </div>
        </CardHeader> */}
        <CardContent>
          {loading ? (
            <p className="text-center py-4">Loading...</p>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
              <TabsList className="flex w-full flex-wrap h-auto p-1">
                <TabsTrigger value="employees" className="flex-1 min-w-0 text-xs sm:text-sm px-2 py-1.5">
                  <span className="truncate">Employees ({baseConfirmedEmployees.length})</span>
                </TabsTrigger>
                <TabsTrigger value="probation" className="flex-1 min-w-0 text-xs sm:text-sm px-2 py-1.5">
                  <span className="truncate">Probation ({baseProbationEmployees.length})</span>
                </TabsTrigger>
                <TabsTrigger value="resigned" className="flex-1 min-w-0 text-xs sm:text-sm px-2 py-1.5">
                  <span className="truncate">Resigned ({baseResignedEmployees.length})</span>
                </TabsTrigger>
                <TabsTrigger value="managers" className="flex-1 min-w-0 text-xs sm:text-sm px-2 py-1.5">
                  <span className="truncate">Managers ({baseManagers.length})</span>
                </TabsTrigger>
                <TabsTrigger value="admins" className="flex-1 min-w-0 text-xs sm:text-sm px-2 py-1.5">
                  <span className="truncate">Admins ({baseAdmins.length})</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="employees">
                <div className="mb-4">
                  <div className="relative max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search employees..."
                      value={employeesSearch}
                      onChange={(e) => setEmployeesSearch(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                {confirmedEmployees.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">
                    {employeesSearch ? "No employees match your search." : "No confirmed employees found."}
                  </p>
                ) : (
                  renderEmployeeTable(confirmedEmployees)
                )}
              </TabsContent>

              <TabsContent value="probation">
                <div className="mb-4">
                  <div className="relative max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search probation employees..."
                      value={probationSearch}
                      onChange={(e) => setProbationSearch(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                {probationEmployees.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">
                    {probationSearch ? "No employees match your search." : "No employees on probation."}
                  </p>
                ) : (
                  renderEmployeeTable(probationEmployees)
                )}
              </TabsContent>

              <TabsContent value="resigned">
                <div className="mb-4">
                  <div className="relative max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search resigned employees..."
                      value={resignedSearch}
                      onChange={(e) => setResignedSearch(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                {resignedEmployees.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">
                    {resignedSearch ? "No employees match your search." : "No resigned employees."}
                  </p>
                ) : (
                  renderEmployeeTable(resignedEmployees)
                )}
              </TabsContent>

              <TabsContent value="managers">
                <div className="mb-4">
                  <div className="relative max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search managers..."
                      value={managersSearch}
                      onChange={(e) => setManagersSearch(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                {filteredManagers.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">
                    {managersSearch ? "No managers match your search." : "No managers found."}
                  </p>
                ) : (
                  renderEmployeeTable(filteredManagers)
                )}
              </TabsContent>

              <TabsContent value="admins">
                <div className="mb-4">
                  <div className="relative max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search admins..."
                      value={adminsSearch}
                      onChange={(e) => setAdminsSearch(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                {filteredAdmins.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">
                    {adminsSearch ? "No admins match your search." : "No admins found."}
                  </p>
                ) : (
                  renderEmployeeTable(filteredAdmins)
                )}
              </TabsContent>
            </Tabs>
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
                <Select
                  value={formData.departmentId || "none"}
                  disabled={formData.role === "ADMIN"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, departmentId: value === "none" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>NIC No</Label>
                <Input
                  value={formData.nic_no}
                  disabled={formData.role === "ADMIN"}
                  onChange={(e) =>
                    setFormData({ ...formData, nic_no: e.target.value })
                  }
                  placeholder="123456789V"
                />
              </div>
              <div className="space-y-2">
                <Label>Joining Date</Label>
                <Input
                  type="date"
                  value={formData.joining_date}
                  disabled={formData.role === "ADMIN"}
                  onChange={(e) =>
                    setFormData({ ...formData, joining_date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Employee No</Label>
                <Input
                  value={formData.employee_no}
                  disabled={formData.role === "ADMIN"}
                  onChange={(e) =>
                    setFormData({ ...formData, employee_no: e.target.value })
                  }
                  placeholder="EMP001"
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
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="probation-edit"
                  checked={formData.isOnProbation}
                  disabled={formData.role === "ADMIN"}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isOnProbation: checked })
                  }
                />
                <Label htmlFor="probation-edit">On Probation</Label>
              </div>
              {formData.isOnProbation && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Probation Start Date</Label>
                    <Input
                      type="date"
                      value={formData.probationStartDate}
                      disabled={formData.role === "ADMIN"}
                      onChange={(e) =>
                        setFormData({ ...formData, probationStartDate: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Probation Period (Months)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.probationPeriodMonths}
                      disabled={formData.role === "ADMIN"}
                      onChange={(e) =>
                        setFormData({ ...formData, probationPeriodMonths: parseInt(e.target.value) || 6 })
                      }
                    />
                  </div>
                </div>
              )}
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
                            Total: {balance.total_days} days | Carried Over: {balance.carried_over} days | Used: {balance.used_days} days | Available: {(balance.total_days + balance.carried_over - balance.used_days).toFixed(1)} days
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

      {/* Resign Dialog */}
      <Dialog open={resignDialogOpen} onOpenChange={setResignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Process Employee Resignation</DialogTitle>
            <DialogDescription>
              Record resignation details for {selectedEmployee?.first_name} {selectedEmployee?.last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && (
              <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label>Resignation Date *</Label>
              <Input
                type="date"
                value={resignFormData.resignationDate}
                onChange={(e) =>
                  setResignFormData({ ...resignFormData, resignationDate: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Reason (Optional)</Label>
              <Input
                value={resignFormData.terminationReason}
                onChange={(e) =>
                  setResignFormData({ ...resignFormData, terminationReason: e.target.value })
                }
                placeholder="e.g., Personal reasons, Better opportunity"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResign} disabled={submitting}>
              {submitting ? "Processing..." : "Process Resignation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
