"use client";

import { HydrationBoundary, QueryClient, QueryClientProvider, type DehydratedState } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export function QueryProvider({ children, dehydratedState }: { children: React.ReactNode; dehydratedState?: DehydratedState }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 15, 
            gcTime: 1000 * 60 * 60, 
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              if (error && typeof error === "object" && "status" in (error as any)) {
                const status = (error as any).status as number | undefined;
                if (status === 401 || status === 403) return false;
              }
              return failureCount < 2;
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>
        {children}
      </HydrationBoundary>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
