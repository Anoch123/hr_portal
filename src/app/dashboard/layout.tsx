import { redirect } from "next/navigation"
import { getSession } from "@/lib/get-session"
import { Sidebar } from "@/components/layout/sidebar"
import { cookies } from "next/headers"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = cookies()
  const allCookies = cookieStore.getAll()
  
  console.log("[Dashboard] All cookies:", allCookies.map(c => c.name))
  
  const session = await getSession()

  console.log("[Dashboard] Full session object:", JSON.stringify(session, null, 2))
  console.log("[Dashboard] Session received:", {
    hasSession: !!session,
    hasUser: !!session?.user,
    userId: session?.user?.id,
    email: session?.user?.email,
  })

  if (!session?.user?.id) {
    console.log("[Dashboard] No valid session, redirecting to login", {
      session: !!session,
      user: !!session?.user,
      id: session?.user?.id,
    })
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="lg:pl-64">
        <div className="p-4 pt-20 lg:p-8 lg:pt-8">{children}</div>
      </main>
    </div>
  )
}
