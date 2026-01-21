import { supabase, supabaseAdmin } from './supabase'
import { getSession } from './get-session'
import type { Database } from './supabase'

type User = Database['public']['Tables']['users']['Row']
type UserInsert = Database['public']['Tables']['users']['Insert']

// Represents the auth user (from NextAuth session)
interface AuthUser {
  id: string
  email: string
}

export async function signUp(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  role: 'ADMIN' | 'HR_MANAGER' | 'MANAGER' | 'EMPLOYEE' = 'EMPLOYEE'
) {
  try {
    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) throw authError

    // Create user profile
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        first_name: firstName,
        last_name: lastName,
        role,
      })
      .select()
      .single()

    if (userError) throw userError

    return { user: userData, error: null }
  } catch (error) {
    return { user: null, error }
  }
}

export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error

    return { session: data.session, user: data.user, error: null }
  } catch (error) {
    return { session: null, user: null, error }
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return { error: null }
  } catch (error) {
    return { error }
  }
}

export async function getCurrentUser() {
  try {
    const session = await getSession()
    if (!session?.user) {
      return { user: null, error: null }
    }

    // Return user from NextAuth session
    const user: AuthUser = {
      id: session.user.id || '',
      email: session.user.email || '',
    }

    return { user, error: null }
  } catch (error) {
    return { user: null, error }
  }
}

export async function getUserProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw error

    return { user: data as User, error: null }
  } catch (error) {
    return { user: null, error }
  }
}

export async function ensureUserProfile(userId: string, email: string, firstName?: string, lastName?: string) {
  try {
    // Try to get existing profile
    const { user: existingUser } = await getUserProfile(userId)
    if (existingUser) {
      return { user: existingUser, created: false, error: null }
    }

    // Create default profile if it doesn't exist
    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        email,
        first_name: firstName || email.split('@')[0],
        last_name: lastName || '',
        role: 'EMPLOYEE',
      })
      .select()
      .single()

    if (error) throw error

    return { user: newUser as User, created: true, error: null }
  } catch (error) {
    return { user: null, created: false, error }
  }
}

export async function updateUserProfile(userId: string, updates: Partial<UserInsert>) {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error

    return { user: data as User, error: null }
  } catch (error) {
    return { user: null, error }
  }
}



export async function getTeamMembers(managerId: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('manager_id', managerId)
      .eq('is_active', true)

    if (error) throw error

    return { users: data as User[], error: null }
  } catch (error) {
    return { users: [], error }
  }
}

export async function updatePassword(userId: string, newPassword: string) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    })

    if (error) throw error

    return { user: data.user, error: null }
  } catch (error) {
    return { user: null, error }
  }
}

export async function hasPermission(userId: string, requiredRole: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw error

    if (!data) throw new Error('User not found')

    const roleHierarchy: Record<string, number> = {
      ADMIN: 4,
      HR_MANAGER: 3,
      MANAGER: 2,
      EMPLOYEE: 1,
    }

    const userRoleLevel = roleHierarchy[data.role] || 0
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0

    return { hasPermission: userRoleLevel >= requiredRoleLevel, error: null }
  } catch (error) {
    console.error('Permission check failed:', error)
    return { hasPermission: false, error }
  }
}

