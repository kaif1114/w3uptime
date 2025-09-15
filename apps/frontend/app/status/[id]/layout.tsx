
import React from 'react';
import StatusLayoutClient from './StatusLayoutClient';
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
    <StatusLayoutClient
      statusPage={statusPage}
      serviceId={id}
    >
      {children}
    </StatusLayoutClient>
  );
}
