"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface LeaveBalance {
  id: string
  year: number
  total_days: number
  used_days: number
  pending_days: number
  carried_over: number
  leaveType: {
    id: string
    name: string
    description: string | null
    is_paid: boolean
  }
}

// Simple Progress component since we don't have it
function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={`h-2 w-full bg-gray-200 rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full bg-primary transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

export default function BalancePage() {
  const { data: session } = useSession()
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const currentYear = new Date().getFullYear()

  useEffect(() => {
    fetchBalances()
  }, [])

  const fetchBalances = async () => {
    try {
      const res = await fetch(`/api/leave-balances?year=${currentYear}`)
      if (!res.ok) {
        throw new Error(`Failed to fetch balances: ${res.status}`)
      }
      const data = await res.json()
      setBalances(data || [])
      setError(null)
    } catch (err) {
      console.error("Error fetching balances:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch balances")
      setBalances([])
    } finally {
      setLoading(false)
    }
  }

  const calculatePercentage = (used: number, total: number) => {
    if (total === 0) return 0
    return (used / total) * 100
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Leave Balance</h1>
        <p className="text-muted-foreground">
          Your leave balance for {currentYear}
        </p>
      </div>

      {loading ? (
        <p className="text-center py-4">Loading...</p>
      ) : error ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-red-600">
              Error: {error}
            </p>
          </CardContent>
        </Card>
      ) : balances.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No leave balances found. Contact HR to set up your leave entitlements.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {balances.map((balance) => {
            // Ensure all values are numbers to avoid NaN
            const totalDays = Number(balance.total_days) || 0
            const usedDays = Number(balance.used_days) || 0
            const pendingDays = Number(balance.pending_days) || 0
            const carriedOver = Number(balance.carried_over) || 0

            const available = totalDays - usedDays - pendingDays
            const usedPercentage = calculatePercentage(usedDays, totalDays)
            const pendingPercentage = calculatePercentage(pendingDays, totalDays)

            return (
              <Card key={balance.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{balance.leaveType.name}</span>
                    {!balance.leaveType.is_paid ? (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        Unpaid
                      </span>
                    ) : <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">
                        Paid
                      </span>}
                  </CardTitle>
                  {balance.leaveType.description && (
                    <CardDescription>{balance.leaveType.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-primary">{String(available)}</p>
                    <p className="text-sm text-muted-foreground">Days Available</p>
                  </div>

                  <ProgressBar value={usedPercentage + pendingPercentage} />

                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div>
                      <p className="font-semibold">{String(totalDays)}</p>
                      <p className="text-muted-foreground">Total</p>
                    </div>
                    <div>
                      <p className="font-semibold text-orange-600">{String(usedDays)}</p>
                      <p className="text-muted-foreground">Used</p>
                    </div>
                    <div>
                      <p className="font-semibold text-yellow-600">{String(pendingDays)}</p>
                      <p className="text-muted-foreground">Pending</p>
                    </div>
                  </div>

                  {carriedOver > 0 && (
                    <p className="text-xs text-muted-foreground text-center">
                      Includes {String(carriedOver)} days carried over from previous year
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Summary Card */}
      {balances.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>Overview of all your leave balances</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">
                  {String(balances.reduce((sum, b) => sum + (Number(b.total_days) || 0), 0))}
                </p>
                <p className="text-sm text-blue-700">Total Entitlement</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {String(balances.reduce(
                    (sum, b) => sum + (Number(b.total_days) || 0 - Number(b.used_days) || 0 - Number(b.pending_days) || 0),
                    0
                  ))}
                </p>
                <p className="text-sm text-green-700">Available</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">
                  {String(balances.reduce((sum, b) => sum + (Number(b.used_days) || 0), 0))}
                </p>
                <p className="text-sm text-orange-700">Used</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">
                  {String(balances.reduce((sum, b) => sum + (Number(b.pending_days) || 0), 0))}
                </p>
                <p className="text-sm text-yellow-700">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
