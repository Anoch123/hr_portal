import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { updatePassword, verifyCurrentPassword } from '@/lib/auth'
import { hasPermission } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { hasPermission: canUpdate } = await hasPermission(session.user.id, "settings:update")
    if (!canUpdate) {
      return NextResponse.json({ error: "Your don't have permission to update settings" }, { status: 403 })
    }

    const { currentPassword, newPassword } = await request.json()

    // Verify current password is provided
    if (!currentPassword) {
      return NextResponse.json(
        { error: 'Current password is required' },
        { status: 400 }
      )
    }

    // Verify the current password
    const { isValid, error: verifyError } = await verifyCurrentPassword(
      session.user.email as string,
      currentPassword
    )

    if (!isValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      )
    }

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters long' },
        { status: 400 }
      )
    }

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