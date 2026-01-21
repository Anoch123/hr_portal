import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { updatePassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { newPassword } = await request.json()

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    // Note: Supabase updateUser doesn't require current password verification
    // In a production app, you might want to verify the current password first
    const { user, error } = await updatePassword(session.user.id, newPassword)

    if (error) {
      console.error('Password update error:', error)
      return NextResponse.json({ error: 'Failed to update password' }, { status: 400 })
    }

    return NextResponse.json({ message: 'Password updated successfully' })
  } catch (error) {
    console.error('Password update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}