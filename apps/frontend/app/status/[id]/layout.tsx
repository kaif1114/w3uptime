
import React from 'react';
import Navbar from '../Navbar';
import { getStatusPageNavInfo } from '@/lib/actions/status-page';

export default async function StatusLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;

  // Fetch status page data using server action
  const statusPage = await getStatusPageNavInfo(id);

  if (!statusPage) {
    // Server action handles notFound() internally, but double check
    return null;
  }

  return (
    <div className="min-h-screen bg-background mx-auto container max-w-3xl">
      <Navbar
        logoUrl={statusPage.logoUrl || undefined}
        companyName={statusPage.name}
        logoLinkUrl={statusPage.logoLinkUrl || undefined}
        serviceId={id}
      />
      {children}
    </div>
  );
}
