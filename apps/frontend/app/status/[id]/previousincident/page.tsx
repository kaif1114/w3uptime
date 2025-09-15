import React from 'react'
import PreviousIncidents from './Incident'

const PreviousIncidentsPage = async ({params}: {params: Promise<{id: string}>}) => {
  const resolvedParams = await params;
  
  return (
    <PreviousIncidents statusPageId={resolvedParams.id} />
  )
}

export default PreviousIncidentsPage
  