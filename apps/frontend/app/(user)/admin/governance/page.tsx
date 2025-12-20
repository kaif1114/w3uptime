import { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminDashboardClient } from './AdminDashboardClient';

export const metadata = {
  title: 'Governance Admin Dashboard | W3Uptime',
  description: 'Monitor and manage governance finalization',
};

async function fetchDashboardData() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const [statsRes, errorsRes] = await Promise.all([
      fetch(`${baseUrl}/api/admin/governance/stats`, { cache: 'no-store' }),
      fetch(`${baseUrl}/api/admin/governance/errors`, { cache: 'no-store' }),
    ]);

    const stats = statsRes.ok ? await statsRes.json() : null;
    const errors = errorsRes.ok ? await errorsRes.json() : null;

    return { stats: stats?.data, errors: errors?.data };
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    return { stats: null, errors: null };
  }
}

export default async function AdminGovernancePage() {
  const { stats, errors } = await fetchDashboardData();

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Governance Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Monitor finalization status and handle failures
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Finalizations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats?.pendingCount ?? '-'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Proposals ready to finalize
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Success Rate (30d)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats?.successRate ?? '-'}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.successfulFinalizations ?? 0} /{' '}
              {stats?.recentFinalizations ?? 0} finalizations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Gas Cost</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats?.avgGasCost ?? '-'} ETH
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Per finalization
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Error Alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
              {errors?.totalErrors ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Require attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Client-side interactive components */}
      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-[300px] w-full" />
          </div>
        }
      >
        <AdminDashboardClient initialStats={stats} initialErrors={errors} />
      </Suspense>
    </div>
  );
}
