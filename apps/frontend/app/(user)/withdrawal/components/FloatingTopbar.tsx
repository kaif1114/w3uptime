"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Home, Wallet, Menu, X, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ModeToggle } from "@/components/ModeToggle";
import { logout } from "@/lib/auth";

const navigationItems = [
  {
    name: "Overview",
    href: "/validator",
    icon: Home,
  },
  {
    name: "Withdrawal",
    href: "/validator/withdrawal",
    icon: Wallet,
  },
];

export default function FloatingTopbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg shadow-lg">
        
        <div className="md:hidden p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full justify-start"
          >
            {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            <span className="ml-2">Navigation</span>
          </Button>
        </div>

        
        <div className="hidden md:flex items-center space-x-1 p-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Button>
              </Link>
            );
          })}

          
          <div className="flex items-center space-x-1 ml-4 pl-4 border-l">
            <ModeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="flex items-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          </div>
        </div>

        
        {isOpen && (
          <div className="md:hidden border-t">
            <div className="p-2 space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                  >
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      size="sm"
                      className="w-full justify-start"
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      <span>{item.name}</span>
                    </Button>
                  </Link>
                );
              })}

              
              <div className="flex items-center justify-between pt-2 border-t">
                <ModeToggle />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center space-x-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
