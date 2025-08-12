import { useQuery } from "@tanstack/react-query";

export function useSession() {
    return useQuery({
        queryKey: ['session'],
        queryFn: () => fetch('/api/auth/session', {
            credentials: 'include'
        }).then(res => res.json()),
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        retry: false,
    })
}