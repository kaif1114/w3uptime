
import React from 'react'
import MaintenanceList from './MaintenanceList'

interface MaintenanceProps {
  statusPageId: string;
}

const Maintenance = ({ statusPageId }: MaintenanceProps) => {
  return (
    <div className="max-w-7xl mx-auto py-8 items-center justify-center">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-6">Maintenance</h1>
      </div>
      <MaintenanceList statusPageId={statusPageId} />
    </div>
  )
}

export default Maintenance
