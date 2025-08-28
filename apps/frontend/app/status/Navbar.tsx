import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ModeToggle } from '@/components/mode-toggle'

interface NavbarProps {
  logoUrl?: string;
  companyName?: string;
  logoLinkUrl?: string;
  currentPage?: string;
  serviceId?: string;
}

const Navbar = ({ logoUrl, companyName = "", logoLinkUrl, currentPage = "status", serviceId }: NavbarProps) => {
  return (
    <div className="w-full">
      {/* Dark header bar */}
      <div className="bg-primary h-2 w-full"></div>
      
      {/* Main navbar */}
      <div className="bg-background px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            {logoUrl ? (
              <div className="flex items-center">
                {logoLinkUrl ? (
                  <Link href={logoLinkUrl} target="_blank" rel="noopener noreferrer">
                    <img 
                      src={logoUrl} 
                      alt={companyName} 
                      className="h-8 w-auto object-contain"
                    />
                  </Link>
                ) : (
                  <img 
                    src={logoUrl} 
                    alt={companyName} 
                    className="h-8 w-auto object-contain"
                  />
                )}
              </div>
            ) : (
              <div className="flex items-center">
                <span className="text-xl font-bold text-foreground">Logo</span>
              </div>
            )}
          </div>
          
          {/* Navigation */}
          <nav className="flex items-center space-x-4">
            <Link 
              href={serviceId ? `/status/${serviceId}` : "/status"} 
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                currentPage === 'status' 
                  ? 'bg-primary/10 text-primary border border-primary/20' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Status
            </Link>
            <Link 
              href={serviceId ? `/status/${serviceId}/maintenance` : "/status/maintenance"} 
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                currentPage === 'maintenance' 
                  ? 'bg-primary/10 text-primary border border-primary/20' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Maintenance
            </Link>
            <Link 
              href={serviceId ? `/status/${serviceId}/previousincident` : "/status/previousincident"} 
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                currentPage === 'previousincident' 
                  ? 'bg-primary/10 text-primary border border-primary/20' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Previous incidents
            </Link>
            <Button variant="secondary" size="sm">
              Get in touch
            </Button>
            <ModeToggle />
          </nav>
        </div>
      </div>
      
      {/* Separator line */}
      <Separator />
    </div>
  )
}

export default Navbar
