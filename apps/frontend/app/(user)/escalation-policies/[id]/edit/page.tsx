import { EditEscalationPolicyPage } from "./EditEscalationPolicyPage";

interface PageProps {
  params: {
    id: string;
  };
}

export default function Page({ params }: PageProps) {
  return (
    <div className="">
      <EditEscalationPolicyPage policyId={params.id} />
    </div>
  );
}
