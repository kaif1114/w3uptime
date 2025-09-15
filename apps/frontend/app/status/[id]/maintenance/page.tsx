import React from 'react'
import Maintenance from './Maintenance'

const MaintenancePage = async ({params}:{params: Promise<{id: string}>}) => {
  const resolvedParams = await params;
  return (
    <Maintenance 
      statusPageId={resolvedParams.id}
    />
  )
}

export default MaintenancePage
