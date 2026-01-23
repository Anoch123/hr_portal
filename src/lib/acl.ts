// Role-based Access Control List

export type Role = 'ADMIN' | 'HR_MANAGER' | 'MANAGER' | 'EMPLOYEE'

export type Permission =
  | 'dashboard:read'
  | 'employees:read'
  | 'employees:create'
  | 'employees:update'
  | 'employees:delete'
  | 'departments:read'
  | 'departments:create'
  | 'departments:update'
  | 'departments:delete'
  | 'leave_types:read'
  | 'leave_types:create'
  | 'leave_types:update'
  | 'leave_types:delete'
  | 'leave_requests:read'
  | 'leave_requests:create'
  | 'leave_requests:update'
  | 'leave_requests:delete'
  | 'leave_requests:approve'
  | 'leave_requests:reject'
  | 'leave_balances:read'
  | 'leave_balances:update'
  | 'leave_history:read'
  | 'reports:read'
  | 'settings:read'
  | 'settings:update'
  | 'permissions:read'
  | 'permissions:create'
  | 'permissions:update'
  | 'permissions:delete'
  | 'role_permissions:read'
  | 'role_permissions:update'

// Permissions are now fetched from database

// Check if a role has a specific permission
export async function hasPermission(role: Role, permission: Permission): Promise<boolean> {
  try {
    // Import supabase here to avoid circular imports
    const { supabaseAdmin } = await import('@/lib/supabase-admin')

    // Get permission id
    const { data: permData, error: permError } = await supabaseAdmin
      .from('permissions')
      .select('id')
      .eq('name', permission)
      .single()

    if (permError || !permData) {
      console.error('Permission not found:', permission)
      return false
    }

    // Check if role has this permission
    const { data: rolePermData, error: rolePermError } = await supabaseAdmin
      .from('role_permissions')
      .select('id')
      .eq('role', role)
      .eq('permission_id', permData.id)
      .single()

    if (rolePermError || !rolePermData) {
      return false
    }

    return true
  } catch (error) {
    console.error('Error checking permission:', error)
    return false
  }
}

// Check if a role has any of the specified permissions
export async function hasAnyPermission(role: Role, permissions: Permission[]): Promise<boolean> {
  for (const permission of permissions) {
    if (await hasPermission(role, permission)) {
      return true
    }
  }
  return false
}

// Check if a role has all of the specified permissions
export async function hasAllPermissions(role: Role, permissions: Permission[]): Promise<boolean> {
  for (const permission of permissions) {
    if (!(await hasPermission(role, permission))) {
      return false
    }
  }
  return true
}

// Role hierarchy for comparison
const roleHierarchy: Record<Role, number> = {
  ADMIN: 4,
  HR_MANAGER: 3,
  MANAGER: 2,
  EMPLOYEE: 1,
}

// Check if role1 is higher or equal to role2
export function isRoleHigherOrEqual(role1: Role, role2: Role): boolean {
  return roleHierarchy[role1] >= roleHierarchy[role2]
}

// Check if user can manage another user based on role
export function canManageUser(managerRole: Role, targetRole: Role): boolean {
  if (managerRole === 'ADMIN') return true
  if (managerRole === 'HR_MANAGER') return targetRole !== 'ADMIN'
  return false
}

// Navigation items based on role
export interface NavItem {
  label: string
  href: string
  icon: string
  permission?: Permission
}

export const navigationItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard', permission: 'dashboard:read' },
  { label: 'My Leaves', href: '/dashboard/leaves', icon: 'Calendar', permission: 'leave_requests:read' },
  { label: 'Leave Balance', href: '/dashboard/balance', icon: 'Wallet', permission: 'leave_balances:read' },
  { label: 'Approvals', href: '/dashboard/approvals', icon: 'CheckCircle', permission: 'leave_requests:approve' },
  { label: 'Employees', href: '/dashboard/employees', icon: 'Users', permission: 'employees:read' },
  { label: 'Departments', href: '/dashboard/departments', icon: 'Building2', permission: 'departments:read' },
  { label: 'Leave Types', href: '/dashboard/leave-types', icon: 'Tag', permission: 'leave_types:read' },
  { label: 'ACL Management', href: '/dashboard/acl', icon: 'Shield', permission: 'permissions:read' }, // ACL management
  { label: 'Reports', href: '/dashboard/reports', icon: 'BarChart', permission: 'reports:read' },
  { label: 'Settings', href: '/dashboard/settings', icon: 'Settings', permission: 'settings:read' },
]

export async function getNavigationForRole(role: Role): Promise<NavItem[]> {
  const filteredItems = []
  for (const item of navigationItems) {
    if (!item.permission) {
      filteredItems.push(item)
    } else {
      let hasAccess = await hasPermission(role, item.permission)
      // Special case: Show Leave Types if user can create leave requests (needed for creating requests)
      // But hide from sidebar for EMPLOYEE and MANAGER
      if (!hasAccess && item.permission === 'leave_types:read' && role !== 'EMPLOYEE' && role !== 'MANAGER') {
        hasAccess = await hasPermission(role, 'leave_requests:create')
      }
      if (hasAccess) {
        filteredItems.push(item)
      }
    }
  }
  return filteredItems
}
