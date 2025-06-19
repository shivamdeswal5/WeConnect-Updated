import { cookies } from "next/headers";

export default async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  const user = cookieStore.get("userSession"); 
  console.log("cookies: ",user)

  if (user) {
    return true
  } else {
    return false
  }
}
