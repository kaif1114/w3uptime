import { EditEscalationPolicyPage } from "./EditEscalationPolicyPage";

interface PageProps {
  params: {
    id: string;
  };
}

export default function Page({ params }: PageProps) {
  return (
    <div className="container mx-auto max-w-6xl">
      <EditEscalationPolicyPage policyId={params.id} />
    </div>
  );
}
