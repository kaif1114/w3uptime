import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>

          <CardContent className="space-y-6">
            
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>

            
            <div className="border-t" />

            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-8 w-24" />
              </div>

              
              {[1, 2].map((i) => (
                <Card key={i} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-5" />
                        <Skeleton className="h-6 w-6 rounded-full" />
                        <Skeleton className="h-5 w-32" />
                      </div>
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-9 w-full" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-9 w-full" />
                      </div>
                    </div>
                    {i !== 2 && (
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-9 w-32" />
                          <Skeleton className="h-4 w-48" />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            
            <div className="border-t" />

            
            <div className="flex items-center justify-between pt-4">
              <Skeleton className="h-9 w-16" />
              <Skeleton className="h-9 w-32" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
