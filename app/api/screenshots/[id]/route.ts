import { NextRequest, NextResponse } from "next/server";
import { getOne, updateScreenshot, deleteScreenshot } from "@/lib/store";
import type { Hotspot } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const item = await getOne(id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const patch: { name?: string; hotspots?: Hotspot[] } = {};
  if (typeof body.name === "string") patch.name = body.name;
  if (Array.isArray(body.hotspots)) patch.hotspots = body.hotspots as Hotspot[];
  const updated = await updateScreenshot(id, patch);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ok = await deleteScreenshot(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
