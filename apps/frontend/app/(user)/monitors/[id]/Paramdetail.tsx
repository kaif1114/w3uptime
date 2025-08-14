"use client";
import React from 'react'

import { useParams } from "next/navigation";
import { MonitorDetails } from "./MonitorDetails";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const Paramdetail = () => {
    const params = useParams();
    const monitorId = params.id as string;
   
return(
<div className="container mx-auto px-4 py-6">
    <div className="mb-6">
      <Link href="/monitors">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Monitors
        </Button>
      </Link>
    </div>
    
    <MonitorDetails monitorId={monitorId} />
  </div>
)
}

export default Paramdetail