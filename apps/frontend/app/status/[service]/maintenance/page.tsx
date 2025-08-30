import React from 'react'
import Navbar from '../../Navbar'
import Maintenance from './Maintenance'

const MaintenancePage = async ({params}:{params: Promise<{service: string}>}) => {
  const resolvedParams = await params;
  return (
    <div className="min-h-screen bg-background">
      <Navbar 
        currentPage="maintenance"
        serviceId={resolvedParams.service}
      />
      <Maintenance 
        statusPageId={resolvedParams.service}
      />
    </div>
  )
}

export default MaintenancePage
