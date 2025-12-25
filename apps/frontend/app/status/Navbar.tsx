'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ModeToggle } from '@/components/ModeToggle';
import Image from 'next/image';

interface NavbarProps {
  logoUrl?: string;
  companyName?: string;
  logoLinkUrl?: string;
  serviceId?: string;
}


function getCurrentPage(pathname: string): string {
  if (pathname.includes('/maintenance')) return 'maintenance';
  if (pathname.includes('/previousincident')) return 'previousincident';
  return 'status';
}

const Navbar = ({ logoUrl, companyName = "", logoLinkUrl, serviceId }: NavbarProps) => {
  const pathname = usePathname();
  const currentPage = getCurrentPage(pathname);
  return (
    <div className="w-full">
      
      <div className="bg-background px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          
          <div className="flex items-center">
            {logoUrl ? (
              <div className="flex items-center">
                {logoLinkUrl ? (
                  <Link href={logoLinkUrl} target="_blank" rel="noopener noreferrer">
                    <Image 
                      src={logoUrl} 
                      alt={companyName} 
                      className="h-8 w-auto object-contain"
                      width={32}
                      height={32}
                    />
                  </Link>
                ) : (
                  <Image
                    src={logoUrl} 
                    alt={companyName} 
                    className="h-8 w-auto object-contain"
                    width={32}
                    height={32}
                  />
                )}
              </div>
            ) : (
              <div className="flex items-center">
                <span className="text-xl font-bold text-foreground">Logo</span>
              </div>
            )}
          </div>
          
          
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
      
      
      <Separator />
    </div>
  )
}

export default Navbar
