"use client"

import {
  IconLogout,
} from "@tabler/icons-react"

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { logout } from "@/lib/auth"
import { useRouter } from "next/navigation"

export function NavUser() {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await logout()
      router.push("/login")
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton onClick={handleLogout} size="lg">
          <IconLogout className="mr-2 h-4 w-4" />
          Log out
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
