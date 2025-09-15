'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Navbar from '../Navbar';

interface StatusPageNavInfo {
  id: string;
  name: string;
  logoUrl: string | null;
  logoLinkUrl: string | null;
}

interface StatusLayoutClientProps {
  statusPage: StatusPageNavInfo;
  serviceId: string;
  children: React.ReactNode;
}

// Helper function to determine current page from pathname
function getCurrentPage(pathname: string): string {
  if (pathname.includes('/maintenance')) return 'maintenance';
  if (pathname.includes('/previousincident')) return 'previousincident';
  return 'status';
}

export default function StatusLayoutClient({
  statusPage,
  serviceId,
  children,
}: StatusLayoutClientProps) {
  const pathname = usePathname();
  const currentPage = getCurrentPage(pathname);

  return (
    <div className="min-h-screen bg-background mx-auto container max-w-3xl">
      <Navbar
        logoUrl={statusPage.logoUrl || undefined}
        companyName={statusPage.name}
        logoLinkUrl={statusPage.logoLinkUrl || undefined}
        currentPage={currentPage}
        serviceId={serviceId}
      />
      {children}
    </div>
  );
}