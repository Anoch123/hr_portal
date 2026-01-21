import { getServerSession as getServerSessionCore } from "next-auth"
import { authOptions } from "./auth-config"

export async function getSession() {
  return getServerSessionCore(authOptions)
}
