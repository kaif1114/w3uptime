
"use client"
import { AlertTriangle, BarChart3, Shield, Users, Icon as LucideIcon } from "lucide-react"
import { Icon as TablerIcon } from "@tabler/icons-react"




import {
  IconInnerShadowTop
} from "@tabler/icons-react"
import * as React from "react"

import { NavMain } from "@/components/ui/nav-main"
import { NavSecondary } from "@/components/ui/nav-secondary"
import { NavUser } from "@/components/ui/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"




// Menu items.
const items = [
  {
    title: "Monitors",
    url: "/monitors",
    icon: IconInnerShadowTop as TablerIcon,
 
  },
  {
    title: "Incidents",
    url: "/incidents",
    icon: IconInnerShadowTop as TablerIcon,
   
  },
  {
    title: "Status Pages",
    url: "/status-pages",
    icon: IconInnerShadowTop as TablerIcon,
  
  },
  {
    title: "Escalation Policies",
    url: "/escalation-policies",
   
    icon: IconInnerShadowTop as TablerIcon,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">Acme Inc.</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={items} />
        <NavSecondary items={items} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{
          name: "John Doe",
          email: "john.doe@example.com",
          avatar: "https://github.com/shadcn.png",
        }} />
      </SidebarFooter>
    </Sidebar>
  )
}
