
import React from 'react';
import { notFound } from 'next/navigation';
import Navbar from '../Navbar';
import { prisma } from 'db/client';

export default async function StatusLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;

  // Fetch status page data server-side for the navbar
  const statusPage = await prisma.statusPage.findFirst({
    where: {
      id,
      isPublished: true, // Only published status pages are accessible
    },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      logo: true, // logoLinkUrl
      supportUrl: true,
    },
  });

  if (!statusPage) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background mx-auto container max-w-3xl">
      <Navbar
        logoUrl={statusPage.logoUrl || undefined}
        companyName={statusPage.name}
        logoLinkUrl={statusPage.logo || undefined}
        currentPage="status"
        serviceId={id}
      />
      {children}
    </div>
  );
}
