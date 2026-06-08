import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { Hotspot, Screenshot } from "./types";

export type { Hotspot, Screenshot };

// Shared data dir (same for dev + prod so screenshots persist across redeploys and
// are visible from either mode). Override with FEATURETOUR_DATA_DIR.
const DATA_DIR =
  process.env.FEATURETOUR_DATA_DIR || "/opt/automateLinux/data/featureTour";
const IMAGES_DIR = path.join(DATA_DIR, "images");
const DB_FILE = path.join(DATA_DIR, "screenshots.json");

const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

export const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
};

async function ensureDirs() {
  await fs.mkdir(IMAGES_DIR, { recursive: true });
}

export async function readAll(): Promise<Screenshot[]> {
  await ensureDirs();
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}

async function writeAll(items: Screenshot[]) {
  await ensureDirs();
  const tmp = `${DB_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(items, null, 2));
  await fs.rename(tmp, DB_FILE);
}

export async function getOne(id: string): Promise<Screenshot | null> {
  const all = await readAll();
  return all.find((s) => s.id === id) ?? null;
}

export async function addScreenshot(
  bytes: Buffer,
  contentType: string,
  originalName: string,
  name?: string,
): Promise<Screenshot> {
  await ensureDirs();
  const ext =
    EXT_BY_TYPE[contentType] ||
    path.extname(originalName).replace(".", "").toLowerCase() ||
    "png";
  const id = randomUUID();
  const file = `${id}.${ext}`;
  await fs.writeFile(path.join(IMAGES_DIR, file), bytes);

  const baseName = name?.trim() || originalName.replace(/\.[^.]+$/, "") || "Untitled";
  const record: Screenshot = {
    id,
    name: baseName,
    file,
    createdAt: Date.now(),
    hotspots: [],
  };
  const all = await readAll();
  all.push(record);
  await writeAll(all);
  return record;
}

/** Insert a screenshot record from an image already copied into the images dir (used for seeding). */
export async function addExistingImage(
  file: string,
  name: string,
  hotspots: Hotspot[] = [],
): Promise<Screenshot> {
  const id = randomUUID();
  const record: Screenshot = { id, name, file, createdAt: Date.now(), hotspots };
  const all = await readAll();
  all.push(record);
  await writeAll(all);
  return record;
}

export async function updateScreenshot(
  id: string,
  patch: { name?: string; hotspots?: Hotspot[] },
): Promise<Screenshot | null> {
  const all = await readAll();
  const idx = all.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  if (typeof patch.name === "string") all[idx].name = patch.name;
  if (Array.isArray(patch.hotspots)) all[idx].hotspots = patch.hotspots;
  await writeAll(all);
  return all[idx];
}

export async function deleteScreenshot(id: string): Promise<boolean> {
  const all = await readAll();
  const target = all.find((s) => s.id === id);
  if (!target) return false;
  await writeAll(all.filter((s) => s.id !== id));
  // Best-effort image removal.
  try {
    await fs.unlink(path.join(IMAGES_DIR, target.file));
  } catch {
    /* image may already be gone */
  }
  return true;
}

export async function readImage(
  file: string,
): Promise<{ bytes: Buffer; contentType: string } | null> {
  // Guard against path traversal.
  const safe = path.basename(file);
  try {
    const bytes = await fs.readFile(path.join(IMAGES_DIR, safe));
    const ext = path.extname(safe).replace(".", "").toLowerCase();
    return { bytes, contentType: CONTENT_TYPE_BY_EXT[ext] || "application/octet-stream" };
  } catch {
    return null;
  }
}
