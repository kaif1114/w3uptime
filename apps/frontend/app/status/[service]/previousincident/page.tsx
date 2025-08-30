import React from 'react'
import Navbar from '../../Navbar'
import PreviousIncidents from './Incident'

const PreviousIncidentsPage = async ({params}: {params: Promise<{service: string}>}) => {
  const resolvedParams = await params;
  
  return (
    <div className="min-h-screen bg-background">
      <Navbar 
        currentPage="previousincident"
        serviceId={resolvedParams.service}
      />
      <PreviousIncidents statusPageId={resolvedParams.service} />
    </div>
  )
}

export default PreviousIncidentsPage
  