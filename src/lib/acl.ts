// Role-based Access Control List

export type Role = 'ADMIN' | 'HR_MANAGER' | 'MANAGER' | 'EMPLOYEE'

export type Permission = 
  | 'employees:read'
  | 'employees:create'
  | 'employees:update'
  | 'employees:delete'
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

// Define permissions for each role
const rolePermissions: Record<Role, Permission[]> = {
  ADMIN: [
    'employees:read',
    'employees:create',
    'employees:update',
    'employees:delete',
    'leave_types:read',
    'leave_types:create',
    'leave_types:update',
    'leave_types:delete',
    'leave_requests:read',
    'leave_requests:create',
    'leave_requests:update',
    'leave_requests:delete',
    'leave_requests:approve',
    'leave_requests:reject',
    'leave_balances:read',
    'leave_balances:update',
    'leave_history:read',
    'reports:read',
    'settings:read',
    'settings:update',
  ],
  HR_MANAGER: [
    'employees:read',
    'employees:create',
    'employees:update',
    'leave_types:read',
    'leave_types:create',
    'leave_types:update',
    'leave_requests:read',
    'leave_requests:create',
    'leave_requests:update',
    'leave_requests:approve',
    'leave_requests:reject',
    'leave_balances:read',
    'leave_balances:update',
    'leave_history:read',
    'reports:read',
  ],
  MANAGER: [
    'employees:read',
    'leave_types:read',
    'leave_requests:read',
    'leave_requests:create',
    'leave_requests:approve',
    'leave_requests:reject',
    'leave_balances:read',
    'leave_history:read',
    'reports:read',
  ],
  EMPLOYEE: [
    'leave_types:read',
    'leave_requests:read',
    'leave_requests:create',
    'leave_balances:read',
    'leave_history:read',
  ],
}

// Check if a role has a specific permission
export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false
}

// Check if a role has any of the specified permissions
export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission))
}

// Check if a role has all of the specified permissions
export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission))
}

// Get all permissions for a role
export function getPermissions(role: Role): Permission[] {
  return rolePermissions[role] ?? []
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
  { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'My Leaves', href: '/dashboard/leaves', icon: 'Calendar', permission: 'leave_requests:read' },
  { label: 'Leave Balance', href: '/dashboard/balance', icon: 'Wallet', permission: 'leave_balances:read' },
  { label: 'Approvals', href: '/dashboard/approvals', icon: 'CheckCircle', permission: 'leave_requests:approve' },
  { label: 'Employees', href: '/dashboard/employees', icon: 'Users', permission: 'employees:read' },
  { label: 'Leave Types', href: '/dashboard/leave-types', icon: 'Tag', permission: 'leave_types:create' },
  { label: 'Reports', href: '/dashboard/reports', icon: 'BarChart', permission: 'reports:read' },
  { label: 'Settings', href: '/dashboard/settings', icon: 'Settings', permission: 'settings:read' },
]

export function getNavigationForRole(role: Role): NavItem[] {
  return navigationItems.filter(item => {
    if (!item.permission) return true
    return hasPermission(role, item.permission)
  })
}
