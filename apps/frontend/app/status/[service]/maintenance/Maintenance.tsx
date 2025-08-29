
import React from 'react'
import MaintenanceList from './MaintenanceList'

interface MaintenanceProps {
  statusPageId: string;
}

const Maintenance = ({ statusPageId }: MaintenanceProps) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-6">Maintenance</h1>
      </div>
      <MaintenanceList statusPageId={statusPageId} />
    </div>
  )
}

export default Maintenance
