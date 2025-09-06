"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Home,
  Activity,
  MapPin,
  Network,
  BarChart3,
  Settings,
  CheckSquare,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  {
    name: "Overview",
    href: "/validator",
    icon: Home,
  },
  {
    name: "Performance",
    href: "/validator/performance",
    icon: BarChart3,
  },
  {
    name: "Location",
    href: "/validator/location",
    icon: MapPin,
  },
  {
    name: "Network",
    href: "/validator/network",
    icon: Network,
  },
  {
    name: "Tasks",
    href: "/validator/tasks",
    icon: CheckSquare,
  },
  {
    name: "Settings",
    href: "/validator/settings",
    icon: Settings,
  },
];

export default function FloatingTopbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg shadow-lg">
        {/* Mobile menu button */}
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

        {/* Desktop navigation */}
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
        </div>

        {/* Mobile navigation */}
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
