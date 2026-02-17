import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { differenceInBusinessDays, format, parseISO } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Calculate business days between two dates (excluding weekends)
export function calculateBusinessDays(startDate: Date | string, endDate: Date | string): number {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate
  
  // Add 1 because differenceInBusinessDays doesn't include the start date
  return differenceInBusinessDays(end, start) + 1
}

// Format date for display
export function formatDate(date: Date | string | null | undefined, formatStr: string = 'MMM dd, yyyy'): string {
  if (!date) return 'N/A'
  const d = typeof date === 'string' ? parseISO(date) : date
  if (isNaN(d.getTime())) return 'N/A'
  return format(d, formatStr)
}

// Generate a random password
export function generatePassword(length: number = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return password
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Get status badge color
export function getStatusColor(status: string): string {
  switch (status.toUpperCase()) {
    case 'APPROVED':
      return 'bg-green-100 text-green-800'
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800'
    case 'REJECTED':
      return 'bg-red-100 text-red-800'
    case 'CANCELLED':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

// Get role badge color
export function getRoleColor(role: string): string {
  switch (role.toUpperCase()) {
    case 'ADMIN':
      return 'bg-purple-100 text-purple-800'
    case 'HR_MANAGER':
      return 'bg-blue-100 text-blue-800'
    case 'MANAGER':
      return 'bg-indigo-100 text-indigo-800'
    case 'EMPLOYEE':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

// Truncate text
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.slice(0, length) + '...'
}

// Get initials from name
export function getInitials(firstName?: string, lastName?: string): string {
  if (!firstName && !lastName) return "?"
  const first = firstName?.charAt(0) || ""
  const last = lastName?.charAt(0) || ""
  return `${first}${last}`.toUpperCase() || "?"
}

// Format role for display
export function formatRole(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}
