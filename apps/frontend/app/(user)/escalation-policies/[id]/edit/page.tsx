import { EditEscalationPolicyPage } from "./EditEscalationPolicyPage";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return (
    <div className="">
      <EditEscalationPolicyPage policyId={id} />
    </div>
  );
}
