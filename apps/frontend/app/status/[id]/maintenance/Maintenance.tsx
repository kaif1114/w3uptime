
import React from 'react'
import MaintenanceList from './MaintenanceList'

interface MaintenanceProps {
  statusPageId: string;
  isPublic?: boolean;
}

const Maintenance = ({ statusPageId, isPublic = true }: MaintenanceProps) => {
  return (
    <div className="flex flex-col items-center justify-start py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-6">Maintenance</h1>
      </div>
      <MaintenanceList statusPageId={statusPageId} isPublic={isPublic} />
    </div>
  )
}

export default Maintenance
