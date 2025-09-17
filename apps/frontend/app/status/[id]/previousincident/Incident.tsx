import React from 'react';
import IncidentsList from './IncidentsList';

interface PreviousIncidentsProps {
  statusPageId: string;
}

const PreviousIncidents: React.FC<PreviousIncidentsProps> = ({ statusPageId }) => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-6">Previous incidents</h1>
      </div>
      <IncidentsList statusPageId={statusPageId} />
    </div>
  );
};

export default PreviousIncidents;