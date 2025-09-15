import React from 'react'
import PublicPage from '../PublicPage'

const ServicePage = async ({params}: {params: Promise<{id: string}>}) => {

  const { id } = await params;
  return (
    <div>
      <PublicPage id={id} />
    </div>
  )
}

export default ServicePage
