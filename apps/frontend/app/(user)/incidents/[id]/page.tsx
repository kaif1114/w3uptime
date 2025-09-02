import IncidentDetailPage from "./IncidentDetailPage";

interface IncidentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function IncidentDetailPageServer({
  params,
}: IncidentDetailPageProps) {
  const { id } = await params;

  return (
    <div className="">
      <IncidentDetailPage incidentId={id} />
    </div>
  );
}
