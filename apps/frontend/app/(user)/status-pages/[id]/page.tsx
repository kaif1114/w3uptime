import StatusPageEditor from "./status-page-editor";

export default async function StatusPageDetails({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="">
      <StatusPageEditor key={id} mode="edit" id={id} />
    </div>
  );
}
