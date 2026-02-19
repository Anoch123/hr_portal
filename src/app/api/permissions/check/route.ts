import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser, hasPermission } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const { user } = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { permissions } = body

    if (!Array.isArray(permissions)) {
      return NextResponse.json({ error: "permissions must be an array" }, { status: 400 })
    }

    const results: Record<string, boolean> = {}

    for (const permission of permissions) {
      const { hasPermission: result } = await hasPermission(user.id, permission)
      results[permission] = result
    }

    return NextResponse.json({ permissions: results })
  } catch (error) {
    console.error("Error checking permissions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
