"use client"

import { useState, useEffect, useRef } from "react"
import { signIn, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("")
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false)
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false)
  const [forgotPasswordError, setForgotPasswordError] = useState("")

  const hasRedirected = useRef(false)

  // Redirect if already logged in
  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      if (!hasRedirected.current) {
        hasRedirected.current = true
        window.location.href = "/dashboard"
      }
    }
  }, [status, session?.user?.id])

  // Loading screen while redirecting
  if (status === "authenticated" && session?.user?.id) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#ffffff', color: '#111827' }}
      >
        <p style={{ color: '#6b7280' }}>Redirecting to dashboard...</p>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid email or password")
      } else if (result?.ok) {
        router.push("/dashboard")
      }
    } catch {
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotPasswordError("")
    setForgotPasswordLoading(true)

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotPasswordEmail }),
      })

      const data = await response.json()

      if (!response.ok) {
        setForgotPasswordError(data.error || "Failed to send reset email")
        return
      }

      setForgotPasswordSuccess(true)
    } catch {
      setForgotPasswordError("An error occurred. Please try again.")
    } finally {
      setForgotPasswordLoading(false)
    }
  }

  const openForgotPassword = () => {
    setForgotPasswordEmail(email)
    setShowForgotPassword(true)
    setForgotPasswordSuccess(false)
    setForgotPasswordError("")
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center"
      style={{
        backgroundColor: '#ffffff',
        color: '#111827'
      }}
    >
      <Card className="w-full max-w-4xl mx-4">
        <div className="flex">
          {/* Left Side - Company Logo */}
          <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 items-center justify-center p-8">
            <div className="text-center text-white">
              <img 
                src="/company_logo.jpg" 
                alt="Company Logo" 
                className="h-30 w-30 mx-auto mb-6 rounded bg-white/10 p-2"
              />
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="flex-1 p-0 sm:p-8">
            <div className="h-full flex flex-col justify-center">
              {/* Mobile Logo */}
              <div className="md:hidden text-center mt-4">
                <img 
                  src="/company_logo.jpg" 
                  alt="Company Logo" 
                  className="h-16 w-16 mx-auto rounded-lg"
                />
              </div>

              <CardHeader>
                <CardTitle className="text-2xl font-bold text-center">
                  Leave Management System
                </CardTitle>
                <CardDescription className="text-center">
                  Enter your credentials to access your account
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
                      {error}
                    </div>
                  )}

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>

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

                  {/* Submit */}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Signing in..." : "Sign in"}
                  </Button>

                  {/* Forgot Password Link */}
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={openForgotPassword}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Forgot your password?
                    </button>
                  </div>
                </form>
              </CardContent>
            </div>
          </div>
        </div>
      </Card>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="text-xl">Reset Password</CardTitle>
              <CardDescription>
                Enter your email address and we'll send you a link to reset your password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {forgotPasswordSuccess ? (
                <div className="text-center py-4">
                  <div className="text-green-500 mb-4">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-gray-600 mb-4">
                    Password reset email has been sent to your inbox. Please check your email and follow the instructions.
                  </p>
                  <Button
                    onClick={() => setShowForgotPassword(false)}
                    className="w-full"
                  >
                    Back to Login
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  {forgotPasswordError && (
                    <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
                      {forgotPasswordError}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="forgotEmail">Email</Label>
                    <Input
                      id="forgotEmail"
                      type="email"
                      placeholder="name@company.com"
                      value={forgotPasswordEmail}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      onClick={() => setShowForgotPassword(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={forgotPasswordLoading}
                      className="flex-1"
                    >
                      {forgotPasswordLoading ? "Sending..." : "Send Reset Link"}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
