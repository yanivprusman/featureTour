import { NextRequest, NextResponse } from "next/server";
import { readAll, addScreenshot } from "@/lib/store";

export const dynamic = "force-dynamic";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

export async function GET() {
  const items = await readAll();
  items.sort((a, b) => a.createdAt - b.createdAt);
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  const name = (form.get("name") as string | null) ?? undefined;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image too large (max 25 MB)" }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const record = await addScreenshot(bytes, file.type, file.name, name);
  return NextResponse.json(record, { status: 201 });
}
