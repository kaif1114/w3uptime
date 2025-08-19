import StatusPageEditor from "./status-page-editor";

export default async function StatusPageDetails({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="container mx-auto px-4 py-6">
      <StatusPageEditor mode="edit" id={id} />
    </div>
  );
}
