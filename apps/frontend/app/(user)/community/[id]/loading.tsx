import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function ProposalDetailLoading() {
  return (
    <div className="space-y-6">
      
      <div className="flex items-center space-x-2">
        <Skeleton className="h-9 w-32" />
      </div>

      
      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-20" />
              </div>
              <div className="flex space-x-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
            <div>
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full mt-2" />
            </div>

            
            <div className="flex items-center space-x-2">
              <Skeleton className="h-4 w-4" />
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-14" />
              </div>
            </div>

            
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex space-x-4">
              <Skeleton className="h-12 w-32" />
              <Skeleton className="h-12 w-32" />
            </div>
            <Skeleton className="h-4 w-24" />
          </div>
        </CardContent>
      </Card>

      
    </div>
  );
}
