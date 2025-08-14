import { EditEscalationPolicyPage } from "./EditEscalationPolicyPage";

interface PageProps {
  params: {
    id: string;
  };
}

export default function Page({ params }: PageProps) {
  return <EditEscalationPolicyPage policyId={params.id} />;
}
