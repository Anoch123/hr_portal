import { supabase } from './supabase'
import { supabaseAdmin } from './supabase-admin'
import type { Database } from './supabase'

type LeaveRequest = Database['public']['Tables']['leave_requests']['Row']
type LeaveBalance = Database['public']['Tables']['leave_balances']['Row']
type LeaveType = Database['public']['Tables']['leave_types']['Row']
type LeaveHistory = Database['public']['Tables']['leave_history']['Insert']

export async function getLeaveTypes() {
  try {
    const { data, error } = await supabase
      .from('leave_types')
      .select('*')
      .eq('is_active', "True")

    if (error) throw error

    return { leaveTypes: data as LeaveType[], error: null }
  } catch (error) {
    return { leaveTypes: [], error }
  }
}

export async function getLeaveBalance(userId: string, year: number, leaveTypeId?: string) {
  try {
    let query = supabase
      .from('leave_balances')
      .select('*')
      .eq('user_id', userId)
      .eq('year', year)

    if (leaveTypeId) {
      query = query.eq('leave_type_id', leaveTypeId)
    }

    const { data, error } = await query

    if (error) throw error

    return { balances: data as LeaveBalance[], error: null }
  } catch (error) {
    return { balances: [], error }
  }
}

export async function createLeaveRequest(
  userId: string,
  leaveTypeId: string,
  startDate: string,
  endDate: string,
  totalDays: number,
  reason?: string,
  leaveMode: 'FULL' | 'HALF' | 'SHORT' = 'FULL',
  isNoPay: boolean = false
) {
  try {
    const { data, error } = await supabaseAdmin
      .from('leave_requests')
      .insert({
        user_id: userId,
        leave_type_id: leaveTypeId,
        start_date: startDate,
        end_date: endDate,
        total_days: totalDays,
        reason: reason || null,
        status: 'PENDING',
        leave_mode: leaveMode,
        is_no_pay: isNoPay,
      })
      .select()
      .single()

    if (error) throw error

    // Log to history
    const historyDetails = isNoPay 
      ? 'Leave request created (No Pay)' 
      : 'Leave request created'
    await addLeaveHistory(userId, leaveTypeId, 'CREATED', null, 'PENDING', userId, historyDetails)

    return { leaveRequest: data as LeaveRequest, error: null }
  } catch (error) {
    return { leaveRequest: null, error }
  }
}

export async function approveLeaveRequest(
  requestId: string,
  approvedById: string,
  updateBalance: boolean = true
) {
  try {
    const { data: request, error: fetchError } = await supabaseAdmin
      .from('leave_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (fetchError) throw fetchError

    const { data, error } = await supabaseAdmin
      .from('leave_requests')
      .update({
        status: 'APPROVED',
        approved_by_id: approvedById,
        approved_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single()

    if (error) throw error

    // Log to history
    await addLeaveHistory(
      request.user_id,
      request.leave_type_id,
      'APPROVED',
      'PENDING',
      'APPROVED',
      approvedById,
      'Leave request approved'
    )

    // Update balance if needed
    if (updateBalance) {
      await updateLeaveBalance(request.user_id, request.leave_type_id, request.total_days)
    }

    return { leaveRequest: data as LeaveRequest, error: null }
  } catch (error) {
    return { leaveRequest: null, error }
  }
}

export async function rejectLeaveRequest(
  requestId: string,
  rejectedById: string,
  rejectionReason: string
) {
  try {
    const { data: request, error: fetchError } = await supabaseAdmin
      .from('leave_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (fetchError) throw fetchError

    const { data, error } = await supabaseAdmin
      .from('leave_requests')
      .update({
        status: 'REJECTED',
        rejection_reason: rejectionReason,
        approved_by_id: rejectedById,
      })
      .eq('id', requestId)
      .select()
      .single()

    if (error) throw error

    // Log to history
    await addLeaveHistory(
      request.user_id,
      request.leave_type_id,
      'REJECTED',
      'PENDING',
      'REJECTED',
      rejectedById,
      `Rejected: ${rejectionReason}`
    )

    return { leaveRequest: data as LeaveRequest, error: null }
  } catch (error) {
    return { leaveRequest: null, error }
  }
}

export async function updateLeaveBalance(
  userId: string,
  leaveTypeId: string,
  usedDays: number
) {
  try {
    const year = new Date().getFullYear()

    const { data: balance, error: fetchError } = await supabaseAdmin
      .from('leave_balances')
      .select('*')
      .eq('user_id', userId)
      .eq('leave_type_id', leaveTypeId)
      .eq('year', year)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError

    const newUsedDays = (balance?.used_days || 0) + usedDays

    const { data, error } = await supabaseAdmin
      .from('leave_balances')
      .update({
        used_days: newUsedDays,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('leave_type_id', leaveTypeId)
      .eq('year', year)
      .select()
      .single()

    if (error) throw error

    return { balance: data as LeaveBalance, error: null }
  } catch (error) {
    return { balance: null, error }
  }
}

export async function addLeaveHistory(
  userId: string,
  leaveTypeId: string,
  action: 'CREATED' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'MODIFIED',
  previousStatus: string | null,
  newStatus: string | null,
  changedBy: string,
  details?: string
) {
  try {
    const { data, error } = await supabaseAdmin.from('leave_history').insert({
      user_id: userId,
      leave_type_id: leaveTypeId,
      action,
      previous_status: previousStatus,
      new_status: newStatus,
      changed_by: changedBy,
      details: details || null,
    })

    if (error) throw error

    return { error: null }
  } catch (error) {
    return { error }
  }
}

export async function getLeaveRequests(
  userId: string,
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
) {
  try {
    let query = supabaseAdmin
      .from('leave_requests')
      .select('*, leaveType:leave_types(*)')
      .eq('user_id', userId)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    return { requests: data as LeaveRequest[], error: null }
  } catch (error) {
    return { requests: [], error }
  }
}

export async function getPendingApprovals(managerId: string) {
  try {
    // Get team member IDs first
    const { data: teamMembers, error: teamError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('manager_id', managerId)

    if (teamError) throw teamError

    const teamIds = teamMembers?.map(m => m.id) || []

    const { data, error } = await supabaseAdmin
      .from('leave_requests')
      .select('*')
      .in('user_id', teamIds.length > 0 ? teamIds : [''])
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false })

    if (error) throw error

    return { requests: data as LeaveRequest[], error: null }
  } catch (error) {
    return { requests: [], error }
  }
}

export async function isUserOnProbation(userId: string) {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('is_on_probation, probation_start_date, probation_period_months')
      .eq('id', userId)
      .single()

    if (error || !user) {
      return { isOnProbation: false, error }
    }

    if (!user.is_on_probation || !user.probation_start_date) {
      return { isOnProbation: false, error: null }
    }

    // Calculate probation end date
    const startDate = new Date(user.probation_start_date)
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + user.probation_period_months)

    const now = new Date()
    const isOnProbation = now >= startDate && now <= endDate

    return { isOnProbation, error: null }
  } catch (error) {
    return { isOnProbation: false, error }
  }
}
