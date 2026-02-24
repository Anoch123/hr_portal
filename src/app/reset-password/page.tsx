"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null)

  useEffect(() => {
    // Check if we have the token in the URL
    // Supabase sends the token in hash fragment (#access_token=xxx)
    // and also in query parameters (?token=xxx&type=recovery) for backwards compatibility
    const checkToken = () => {
      // First check hash (has actual access_token in newer Supabase)
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const tokenFromHash = hashParams.get("access_token")
      
      // Also check query parameters
      const searchParams = new URLSearchParams(window.location.search)
      const tokenFromQuery = searchParams.get("token")
      const typeFromQuery = searchParams.get("type")
      
      if (tokenFromHash) {
        setIsValidToken(true)
      } else if (tokenFromQuery && typeFromQuery === "recovery") {
        setIsValidToken(true)
      } else {
        // Give it a bit more time in case of client-side navigation
        setTimeout(() => {
          const recheckHashParams = new URLSearchParams(window.location.hash.substring(1))
          const recheckHashToken = recheckHashParams.get("access_token")
          
          const recheckSearchParams = new URLSearchParams(window.location.search)
          const recheckToken = recheckSearchParams.get("token")
          const recheckType = recheckSearchParams.get("type")
          
          if (recheckHashToken || (recheckToken && recheckType === "recovery")) {
            setIsValidToken(true)
          } else {
            setIsValidToken(false)
          }
        }, 500)
      }
    }
    
    // Small delay to ensure DOM is ready
    const timer = setTimeout(checkToken, 100)
    return () => clearTimeout(timer)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password.length < 6) {
      setError("Password must be at least 6 characters long")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)

    try {
      // Get the token from URL - check hash first (has actual access_token)
      // then fall back to query params
      // Supabase sends token in hash (#access_token=xxx) AND query params (?token=xxx&type=recovery)
      // The hash has the actual access token, query params have a one-time recovery token
      
      // First try hash (this has the actual access_token in newer Supabase)
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      let accessToken = hashParams.get("access_token")
      let refreshToken = hashParams.get("refresh_token")
      
      // If not in hash, try query parameters (for older Supabase or different configurations)
      if (!accessToken) {
        const queryParams = new URLSearchParams(window.location.search)
        accessToken = queryParams.get("token")
        // Query params typically don't have refresh_token
      }

      if (!accessToken) {
        setError("Invalid or expired reset link. Please request a new password reset.")
        return
      }

      // Set the session with the access token from either query params or hash
      // Supabase tokens from query params (?token=xxx) are access tokens
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || "",
      })

      if (sessionError) {
        setError("Invalid or expired reset link. Please request a new password reset.")
        return
      }

      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      })

      if (updateError) {
        setError(updateError.message || "Failed to update password. Please try again.")
        return
      }

      setSuccess(true)
      
      // Redirect to login after a short delay
      setTimeout(() => {
        router.push("/login")
      }, 3000)
    } catch {
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Loading state while checking token
  if (isValidToken === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Verifying reset link...</p>
      </div>
    )
  }

  // Invalid token state
  if (isValidToken === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-red-600">
              Invalid Reset Link
            </CardTitle>
            <CardDescription className="text-center">
              This password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push("/login")}
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-green-600">
              Password Reset Successful
            </CardTitle>
            <CardDescription className="text-center">
              Your password has been successfully updated. You will be redirected to the login page shortly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push("/login")}
              className="w-full"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Password reset form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Reset Your Password
          </CardTitle>
          <CardDescription className="text-center">
            Enter your new password below
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {/* Submit */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/login")}
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Resetting..." : "Reset Password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
