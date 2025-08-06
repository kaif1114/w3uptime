"use client";
import {
  IconSatellite,
  Icon as TablerIcon
} from "@tabler/icons-react";


import { IconInnerShadowTop } from "@tabler/icons-react";
import * as React from "react";


import { NavUser } from "@/components/ui/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { AlertTriangleIcon, ChartBar, Shield, Users } from "lucide-react";

// Menu items.
const items = [
  {
    title: "Monitors",
    url: "/monitors",
    icon: ChartBar,
  },
  {
    title: "Incidents",
    url: "/incidents",
    icon: AlertTriangleIcon
  },
  {
    title: "Status Pages",
    url: "/status-pages",
    icon: Shield,
  },
  {
    title: "Escalation Policies",
    url: "/escalation-policies",
    icon: Users,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname =usePathname()
  useEffect(() => {
    console.log(pathname)
  }, [pathname])
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5 mb-4"
            >
              <a href="#">
                <IconSatellite className="!size-8" />
                <span className="text-2xl font-bold">W3Uptime</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {/* main */}
        <SidebarGroup>
          <SidebarGroupContent className="flex flex-col gap-2">
           
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton tooltip={item.title} className={cn(pathname === item.url && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground")}>
                    {item.icon && <item.icon />}
                    <Link href={item.url}>{item.title}</Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
       
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: "Muhammad Kaif",
            email: "kaif@w3uptime.com",
            avatar: "https://github.com/shadcn.png",
          }}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
