import { useQuery } from "@tanstack/react-query";

async function fetchSession(): Promise<any> {
  const res = await fetch("/api/auth/session", {
    credentials: "include",
  });
  if (!res.ok) {
    const error: any = new Error("Failed to fetch session");
    (error as any).status = res.status;
    throw error;
  }
  return res.json();
}

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: fetchSession,
    staleTime: 1000 * 60 * 15, 
    gcTime: 1000 * 60 * 60, 
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: (failureCount, error: any) => {
      if (error?.status === 401 || error?.status === 403) return false;
      return failureCount < 2;
    },
  });
}