import React from 'react'
import PublicPage from '../PublicPage'

const ServicePage = async ({params}: {params: Promise<{service: string}>}) => {
  const resolvedParams = await params;
  const service = resolvedParams.service;
  
  return (
    <div>
      <PublicPage params={params} />
    </div>
  )
}

export default ServicePage
