import React from 'react'
import Navbar from '../../Navbar'
import Maintenance from './Maintenance'

const MaintenancePage = async ({params}:{params: {service: string}}) => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar 
        currentPage="maintenance"
        serviceId={params.service}
      />
      <Maintenance 
        statusPageId={params.service}
      />
    </div>
  )
}

export default MaintenancePage
