import { Skeleton } from "@/components/ui/skeleton";

export function StatusPagesLoading() {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


export default StatusPagesLoading;