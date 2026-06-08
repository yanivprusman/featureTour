import { notFound } from "next/navigation";
import { getOne } from "@/lib/store";
import Viewer from "./viewer";

export const dynamic = "force-dynamic";

export default async function ViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const screenshot = await getOne(id);
  if (!screenshot) notFound();
  return <Viewer screenshot={screenshot} />;
}
