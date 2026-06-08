"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Screenshot } from "@/lib/types";

export default function Gallery({ initial }: { initial: Screenshot[] }) {
  const router = useRouter();
  const [items, setItems] = useState<Screenshot[]>(initial);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      let lastId: string | null = null;
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/screenshots", { method: "POST", body: fd });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || `Upload failed (${res.status})`);
        }
        const created: Screenshot = await res.json();
        setItems((prev) => [...prev, created]);
        lastId = created.id;
      }
      // If a single file was uploaded, jump straight into annotating it.
      if (files.length === 1 && lastId) {
        router.push(`/view/${lastId}?edit=1`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function remove(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this screenshot and its annotations?")) return;
    const res = await fetch(`/api/screenshots/${id}`, { method: "DELETE" });
    if (res.ok) setItems((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <span>🖱️</span> featureTour
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            Annotated app screenshots. Open one, then hover any region to read what
            that feature does.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            ref={fileInput}
            data-id="upload-input"
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />
          <button
            data-id="add-screenshot"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: "var(--accent)", cursor: uploading ? "not-allowed" : "pointer" }}
          >
            {uploading ? "Uploading…" : "+ Add screenshot"}
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border px-4 py-2 text-sm" style={{ borderColor: "#7f1d1d", background: "#2a1313", color: "#fca5a5" }}>
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div
          data-id="empty-state"
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-24 text-center"
          style={{ borderColor: "var(--border)", color: "var(--muted)" }}
        >
          <p className="text-lg">No screenshots yet.</p>
          <p className="mt-1 text-sm">
            Click <span style={{ color: "var(--accent)" }}>“+ Add screenshot”</span> to
            upload your first app screenshot and start annotating it.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((s) => (
            <Link
              key={s.id}
              data-id={`screenshot-card-${s.id}`}
              href={`/view/${s.id}`}
              className="group relative flex flex-col overflow-hidden rounded-xl border transition-colors"
              style={{ borderColor: "var(--border)", background: "var(--panel)" }}
            >
              <div className="relative flex h-48 items-center justify-center overflow-hidden" style={{ background: "var(--bg)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/image/${s.file}`}
                  alt={s.name}
                  className="max-h-full max-w-full object-contain"
                />
                <button
                  data-id={`delete-${s.id}`}
                  onClick={(e) => remove(s.id, e)}
                  title="Delete"
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-sm opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ background: "rgba(0,0,0,0.6)", color: "#fca5a5", cursor: "pointer" }}
                >
                  ✕
                </button>
              </div>
              <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                <span className="truncate text-sm font-medium">{s.name}</span>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-xs"
                  style={{ background: "var(--panel-2)", color: "var(--muted)" }}
                >
                  {s.hotspots.length} {s.hotspots.length === 1 ? "note" : "notes"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
