import React from 'react'
import PublicPage from '../PublicPage'

const ServicePage = async ({params}: {params: Promise<{service: string}>}) => {
  return (
    <div>
      <PublicPage params={await params} />
    </div>
  )
}

export default ServicePage
