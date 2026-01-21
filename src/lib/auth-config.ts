import { type NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { signIn as authSignIn, getUserProfile } from "@/lib/auth"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials): Promise<any> {
        if (!credentials?.email || !credentials?.password) {
          console.log("[NextAuth] Missing email or password")
          return null
        }

        try {
          console.log(`[NextAuth] Attempting to sign in user: ${credentials.email}`)
          const { session, user, error } = await authSignIn(credentials.email, credentials.password)
          
          if (error) {
            console.error(`[NextAuth] SignIn error for ${credentials.email}:`, error)
            return null
          }
          
          if (!user) {
            console.log(`[NextAuth] No user returned for ${credentials.email}`)
            return null
          }

          console.log(`[NextAuth] Successfully authenticated: ${user.email}`)
          
          // Fetch user profile from database
          try {
            const { user: profileData } = await getUserProfile(user.id)
            
            return {
              id: user.id,
              email: user.email || "",
              name: `${profileData?.first_name || ""} ${profileData?.last_name || ""}`.trim() || user.email,
              role: profileData?.role || "EMPLOYEE",
              firstName: profileData?.first_name || "",
              lastName: profileData?.last_name || "",
              department: profileData?.department || "",
              position: profileData?.position || "",
              managerId: profileData?.manager_id || null,
            }
          } catch (profileError) {
            console.error(`[NextAuth] Could not fetch profile for ${user.id}:`, profileError)
            // Still allow login with basic info
            return {
              id: user.id,
              email: user.email || "",
              name: user.email,
              role: "EMPLOYEE",
            }
          }
        } catch (error) {
          console.error(`[NextAuth] Exception during authorize for ${credentials.email}:`, error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        console.log("[NextAuth] JWT callback - user:", { id: user.id, email: user.email, role: user.role })
        token.id = user.id
        token.email = user.email
        token.firstName = user.firstName || ""
        token.lastName = user.lastName || ""
        token.role = user.role || "EMPLOYEE"
        token.department = user.department || ""
        token.position = user.position || ""
      }
      console.log("[NextAuth] JWT callback - token after update:", { id: token.id, email: token.email })
      return token
    },
    async session({ session, token }: any) {
      console.log("[NextAuth] Session callback - token:", { id: token.id, email: token.email })
      if (session?.user) {
        session.user.id = token.id as string  // Fix: use 'id' not 'userId'
        session.user.email = token.email as string
        session.user.firstName = (token.firstName as string) || ""
        session.user.lastName = (token.lastName as string) || ""
        session.user.role = (token.role as string) || "EMPLOYEE"
        session.user.department = (token.department as string) || ""
        session.user.position = (token.position as string) || ""
      }
      console.log("[NextAuth] Session callback - returning session:", {
        userId: session?.user?.id,
        email: session?.user?.email,
        role: session?.user?.role,
      })
      return session
    },
    async redirect({ url, baseUrl }: any) {
      // If callback URL contains a relative path, use it
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`
      }
      // If callback URL is on the same origin, use it
      try {
        const callbackUrl = new URL(url).origin === baseUrl ? url : null
        if (callbackUrl) return callbackUrl
      } catch {
        // Invalid URL, continue to default
      }
      // Default redirect to dashboard
      return `${baseUrl}/dashboard`
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true,
}
