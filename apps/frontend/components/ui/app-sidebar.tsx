"use client";
import { IconLogout, IconSatellite } from "@tabler/icons-react";
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
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  AlertTriangleIcon,
  ChartBar,
  Shield,
  Users,
  Globe,
  BarChart3,
  Lightbulb,
  Settings,
  Wallet,
} from "lucide-react";
import { ModeToggle } from "@/components/ModeToggle";
import { logout } from "@/lib/auth";
import { useSession } from "@/hooks/useSession";
import { WalletAddress } from "@/components/ui/WalletAddress";


const items = [
  {
    title: "Monitors",
    url: "/monitors",
    icon: ChartBar,
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: BarChart3,
  },
  {
    title: "Global Network",
    url: "/global-network",
    icon: Globe,
  },
  {
    title: "Incidents",
    url: "/incidents",
    icon: AlertTriangleIcon,
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
  {
    title: "Wallet",
    url: "/wallet",
    icon: Wallet,
  },
  {
    title: "Earnings & Withdrawals",
    url: "/withdrawal",
    icon: Wallet,
  },
  {
    title: "Community",
    url: "/community",
    icon: Lightbulb,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  const { data: session } = useSession();

  const handleLogout = async () => {
    try {
      await logout()
      router.push("/")
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }
  const pathname = usePathname();
  useEffect(() => {
    console.log(pathname);
  }, [pathname]);
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
        
        <SidebarGroup>
          <SidebarGroupContent className="flex flex-col gap-2">
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    tooltip={item.title}
                    className={cn(
                      pathname === item.url &&
                        "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
                    )}
                  >
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
        <div className="flex flex-col gap-2">
          {/* Wallet Address Display */}
          {session?.user?.walletAddress && (
            <div className="px-2 py-1.5 rounded-md bg-sidebar-accent/50">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-sidebar-foreground/70" />
                <WalletAddress
                  address={session.user.walletAddress}
                  startChars={6}
                  endChars={4}
                  showCopyButton={true}
                  className="text-xs"
                />
              </div>
            </div>
          )}

          {/* Theme Toggle */}
          <div className="flex items-center justify-between px-2">
            <span className="text-sm text-sidebar-foreground/70">Theme</span>
            <ModeToggle />
          </div>

          {/* Logout Button */}
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout} size="lg">
                <IconLogout className="mr-2 h-4 w-4 cursor-pointer" />
                Log out
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
