import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { getCurrentUser } from "@/lib/auth"

export default async function Home() {
  const session = await getCurrentUser()

  if (session) {
    redirect("/dashboard")
  } else {
    redirect("/login")
  }
}
