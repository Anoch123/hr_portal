"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { cn, formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getInitials, formatRole } from "@/lib/utils"
import {
  LayoutDashboard,
  Calendar,
  Wallet,
  CheckCircle,
  Users,
  Building2,
  Tag,
  BarChart,
  Settings,
  Shield,
  LogOut,
  Menu,
  X,
} from "lucide-react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Calendar,
  Wallet,
  CheckCircle,
  Users,
  Building2,
  Tag,
  BarChart,
  Shield,
  Settings,
}

interface NavItem {
  label: string
  href: string
  icon: string
  permission?: string
}

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [navItems, setNavItems] = useState<NavItem[]>([])
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  useEffect(() => {
    if (session?.user) {
      fetchNavigation()
      fetchUserProfile()
    }
  }, [session])

  const fetchNavigation = async () => {
    try {
      const response = await fetch('/api/navigation')
      const data = await response.json()
      setNavItems(data.navigation || [])
    } catch (error) {
      console.error('Failed to fetch navigation:', error)
      // Fallback to empty navigation
      setNavItems([])
    } finally {
      setLoading(false)
    }
  }

  const fetchUserProfile = async () => {
    if (!session?.user?.id) return
    setProfileLoading(true)
    try {
      const response = await fetch('/api/auth/profile')
      if (response.ok) {
        const data = await response.json()
        setUserProfile(data.user)
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error)
    } finally {
      setProfileLoading(false)
    }
  }

  if (!session?.user) return null
  if (loading) return null // Or show a loading state

  const NavContent = () => (
    <>
      <div className="flex items-center gap-2 px-4 py-6 border-b">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">LMS</span>
        </div>
        <span className="font-semibold text-lg">SLM Leave Portal</span>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = iconMap[item.icon] || LayoutDashboard
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t p-4">
        <button
          className="flex items-center gap-3 mb-4 w-full text-left hover:bg-muted/50 rounded-lg p-2 transition-colors"
          onClick={() => setProfileOpen(true)}
        >
          <Avatar>
            <AvatarFallback>
              {getInitials(session.user.firstName, session.user.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {session.user.firstName} {session.user.lastName}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {formatRole(session.user.role)}
            </p>
          </div>
        </button>

        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </div>
    </>
  )

  const handleProfileOpenChange = (open: boolean) => {
    setProfileOpen(open)
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-40 w-64 bg-background border-r transform transition-transform duration-200 ease-in-out flex flex-col",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <NavContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-background border-r">
        <NavContent />
      </aside>

      {/* Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={handleProfileOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Profile Information{userProfile.email_verified ? (
              <Badge variant="default" className="text-xs bg-green-500 ml-2">Verified User</Badge>
            ) : (
              <Badge variant="destructive" className="text-xs">Unverified User</Badge>
            )}</DialogTitle>
            <DialogDescription>Your account details</DialogDescription>
          </DialogHeader>
          {profileLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : userProfile ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                  <p className="text-sm">{userProfile.first_name} {userProfile.last_name}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm">{userProfile.email}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Department</p>
                  <p className="text-sm">{userProfile.department?.name || "Not assigned"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Position</p>
                  <p className="text-sm">{userProfile.position || "Not specified"}</p>
                </div>
                {userProfile.employee_no && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Employee No</p>
                    <p className="text-sm">{userProfile.employee_no}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Created At</p>
                  <p className="text-sm">{formatDate(userProfile.created_at) || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Updated At</p>
                  <p className="text-sm">{formatDate(userProfile.updated_at) || "Not specified"}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Failed to load profile information
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
