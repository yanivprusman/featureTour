import { readAll } from "@/lib/store";
import Gallery from "./gallery";

export const dynamic = "force-dynamic";

export default async function Home() {
  const screenshots = await readAll();
  screenshots.sort((a, b) => a.createdAt - b.createdAt);
  return <Gallery initial={screenshots} />;
}
