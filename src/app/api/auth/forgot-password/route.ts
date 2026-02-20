import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Get the app URL for redirect - use the environment variable
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const redirectTo = `${appUrl}/reset-password`

    console.log('Sending password reset to:', email, 'with redirect to:', redirectTo)

    // Use Supabase's resetPasswordForEmail method with the redirect URL
    const { error: resetError, data } = await supabase.auth.resetPasswordForEmail(email.toLowerCase(), {
      redirectTo: redirectTo,
    })

    if (resetError) {
      console.error('Password reset error:', resetError)
      console.error('Error details:', JSON.stringify(resetError))
      
      // Return generic success to prevent email enumeration
      return NextResponse.json(
        { message: 'If an account exists, a password reset email has been sent' },
        { status: 200 }
      )
    }

    console.log('Password reset email sent successfully to:', email)
    console.log('Password reset data:', JSON.stringify(data))

    return NextResponse.json(
      { message: 'Password reset email has been sent' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
