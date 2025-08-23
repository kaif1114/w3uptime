'use client'
import { useStatusPages } from "@/hooks/useStatusPages";
    import StatusPageEditor from "./status-page-editor";
    import { CreateStatusPageLoading } from "./loading";
    
export default function StatusPageLoader() {
    
      const { isLoading } = useStatusPages();
    
      if (isLoading) {
        return <CreateStatusPageLoading />;
      }
    
      return (  
        <div className="container mx-auto px-4 py-6">
          <StatusPageEditor mode="create" />
        </div>
      );
    }
    