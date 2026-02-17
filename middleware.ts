import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Cache the database status to avoid checking on every request
let dbStatusCache = { initialized: false, timestamp: 0 }
const CACHE_DURATION = 5000 // 5 seconds

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for setup, login and API routes
  if (pathname.startsWith('/setup') || pathname.startsWith('/login') || pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // Skip static assets
  if (pathname.startsWith('/_next') || pathname.startsWith('/public')) {
    return NextResponse.next()
  }

  // Check if database is initialized (with caching)
  const now = Date.now()
  let isInitialized = dbStatusCache.initialized

  if (now - dbStatusCache.timestamp > CACHE_DURATION) {
    try {
      const protocol = request.headers.get('x-forwarded-proto') || 'http'
      const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3001'
      const baseUrl = `${protocol}://${host}`

      const response = await fetch(`${baseUrl}/api/db-status`, {
        headers: request.headers,
      })

      const data = await response.json()
      isInitialized = data.initialized
      dbStatusCache = { initialized: isInitialized, timestamp: now }
    } catch (error) {
      // If we can't check, assume not initialized (safer)
      isInitialized = false
    }
  } else {
    isInitialized = dbStatusCache.initialized
  }

  // If database not initialized, redirect to setup (except for setup page itself)
  if (!isInitialized && !pathname.startsWith('/setup')) {
    return NextResponse.redirect(new URL('/setup', request.url))
  }

  return NextResponse.next()
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
