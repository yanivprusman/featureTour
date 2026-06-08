"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Hotspot, Screenshot } from "@/lib/types";

function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "h_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const clamp = (v: number) => Math.max(0, Math.min(100, v));

type Rect = { x: number; y: number; w: number; h: number };
type EditDraft = Rect & { id: string | null; title: string; description: string };

export default function Viewer({ screenshot }: { screenshot: Screenshot }) {
  const [name, setName] = useState(screenshot.name);
  const [hotspots, setHotspots] = useState<Hotspot[]>(screenshot.hotspots);
  const [editMode, setEditMode] = useState(false);

  const [hovered, setHovered] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditDraft | null>(null);

  const [drawing, setDrawing] = useState(false);
  const [draft, setDraft] = useState<Rect | null>(null);
  const drawStart = useRef<{ x: number; y: number } | null>(null);

  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(0);

  const overlayRef = useRef<HTMLDivElement>(null);

  // Start in edit mode when arriving with ?edit=1 (e.g. right after upload).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("edit") === "1") setEditMode(true);
  }, []);

  function evtPct(e: { clientX: number; clientY: number }) {
    const r = overlayRef.current!.getBoundingClientRect();
    return {
      x: clamp(((e.clientX - r.left) / r.width) * 100),
      y: clamp(((e.clientY - r.top) / r.height) * 100),
    };
  }

  function onOverlayMouseDown(e: React.MouseEvent) {
    if (!editMode) return;
    if (e.target !== overlayRef.current) return; // clicked a hotspot, not the background
    e.preventDefault();
    const p = evtPct(e);
    drawStart.current = p;
    setDraft({ x: p.x, y: p.y, w: 0, h: 0 });
    setDrawing(true);
  }

  useEffect(() => {
    if (!drawing) return;
    function move(e: MouseEvent) {
      const s = drawStart.current!;
      const p = evtPct(e);
      setDraft({
        x: Math.min(s.x, p.x),
        y: Math.min(s.y, p.y),
        w: Math.abs(p.x - s.x),
        h: Math.abs(p.y - s.y),
      });
    }
    function up(e: MouseEvent) {
      const s = drawStart.current!;
      const p = evtPct(e);
      const rect: Rect = {
        x: Math.min(s.x, p.x),
        y: Math.min(s.y, p.y),
        w: Math.abs(p.x - s.x),
        h: Math.abs(p.y - s.y),
      };
      setDrawing(false);
      setDraft(null);
      if (rect.w >= 1.2 && rect.h >= 0.6) {
        setEditing({ ...rect, id: null, title: "", description: "" });
      }
    }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawing]);

  async function persist(nextHotspots: Hotspot[], nextName = name) {
    setSaving(true);
    try {
      await fetch(`/api/screenshots/${screenshot.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextName, hotspots: nextHotspots }),
      });
      setSavedTick((t) => t + 1);
    } finally {
      setSaving(false);
    }
  }

  function saveEditing() {
    if (!editing) return;
    let next: Hotspot[];
    if (editing.id) {
      next = hotspots.map((h) =>
        h.id === editing.id
          ? { ...h, title: editing.title, description: editing.description }
          : h,
      );
    } else {
      const nh: Hotspot = {
        id: uid(),
        x: editing.x,
        y: editing.y,
        w: editing.w,
        h: editing.h,
        title: editing.title.trim() || "Untitled",
        description: editing.description,
      };
      next = [...hotspots, nh];
    }
    setHotspots(next);
    setEditing(null);
    persist(next);
  }

  function deleteEditing() {
    if (!editing) return;
    if (editing.id) {
      const next = hotspots.filter((h) => h.id !== editing.id);
      setHotspots(next);
      persist(next);
    }
    setEditing(null);
  }

  function openExisting(h: Hotspot) {
    setEditing({
      id: h.id,
      x: h.x,
      y: h.y,
      w: h.w,
      h: h.h,
      title: h.title,
      description: h.description,
    });
  }

  function tooltipPlacement(h: Hotspot): React.CSSProperties {
    const rightRoom = 100 - (h.x + h.w);
    const leftRoom = h.x;
    const horiz: React.CSSProperties =
      rightRoom >= leftRoom
        ? { left: `calc(${h.x + h.w}% + 12px)` }
        : { right: `calc(${100 - h.x}% + 12px)` };
    const vert: React.CSSProperties =
      h.y > 55 ? { bottom: `${clamp(100 - (h.y + h.h))}%` } : { top: `${h.y}%` };
    return { ...horiz, ...vert };
  }

  return (
    <main className="min-h-screen">
      {/* Top bar */}
      <div
        className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b px-5 py-3 backdrop-blur"
        style={{ borderColor: "var(--border)", background: "rgba(11,15,20,0.85)" }}
      >
        <Link
          data-id="back-to-gallery"
          href="/"
          className="rounded-md px-2 py-1 text-sm transition-colors hover:opacity-80"
          style={{ color: "var(--muted)", cursor: "pointer" }}
        >
          ← Gallery
        </Link>

        {editMode ? (
          <input
            data-id="name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => persist(hotspots, name)}
            className="rounded-md border px-2 py-1 text-sm font-semibold"
            style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text)" }}
          />
        ) : (
          <h1 className="text-base font-semibold">{name}</h1>
        )}

        <span className="text-xs" style={{ color: "var(--muted)" }}>
          {hotspots.length} {hotspots.length === 1 ? "note" : "notes"}
        </span>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs" style={{ color: "var(--muted)" }} data-id="save-status">
            {saving ? "Saving…" : savedTick > 0 ? "Saved ✓" : ""}
          </span>
          <button
            data-id="toggle-edit"
            onClick={() => {
              setEditMode((m) => !m);
              setEditing(null);
              setHovered(null);
            }}
            className="rounded-lg px-3 py-1.5 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{
              background: editMode ? "var(--accent)" : "var(--panel-2)",
              color: editMode ? "#fff" : "var(--text)",
              cursor: "pointer",
            }}
          >
            {editMode ? "Done" : "✎ Edit notes"}
          </button>
        </div>
      </div>

      {editMode && (
        <p className="px-5 py-2 text-xs" style={{ color: "var(--muted)" }}>
          Drag a box over any UI element to add a note. Click an existing box to edit
          or delete it.
        </p>
      )}

      {/* Stage */}
      <div className="flex justify-center px-6 py-8" style={{ overflow: "visible" }}>
        <div style={{ position: "relative", display: "inline-block", maxWidth: "100%" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/image/${screenshot.file}`}
            alt={name}
            draggable={false}
            style={{
              display: "block",
              maxHeight: "calc(100vh - 170px)",
              maxWidth: "100%",
              width: "auto",
              height: "auto",
              userSelect: "none",
              borderRadius: 8,
            }}
          />

          <div
            ref={overlayRef}
            className="absolute inset-0"
            style={{ cursor: editMode ? "crosshair" : "default" }}
            onMouseDown={onOverlayMouseDown}
          >
            {hotspots.map((h, i) => {
              const isHover = hovered === h.id;
              return (
                <div
                  key={h.id}
                  data-id={`hotspot-${h.id}`}
                  onMouseEnter={() => !editMode && setHovered(h.id)}
                  onMouseLeave={(e) => {
                    if (editMode) return;
                    const related = e.relatedTarget as Node | null;
                    const tooltip = (e.currentTarget as HTMLElement).querySelector("[data-tooltip]");
                    if (tooltip && related && tooltip.contains(related)) return;
                    setHovered(null);
                  }}
                  onClick={(e) => {
                    if (editMode) {
                      e.stopPropagation();
                      openExisting(h);
                    }
                  }}
                  style={{
                    position: "absolute",
                    left: `${h.x}%`,
                    top: `${h.y}%`,
                    width: `${h.w}%`,
                    height: `${h.h}%`,
                    border: `2px solid ${isHover || editMode ? "var(--accent)" : "rgba(63,174,90,0.55)"}`,
                    borderRadius: 6,
                    background: isHover
                      ? "rgba(63,174,90,0.22)"
                      : editMode
                        ? "rgba(63,174,90,0.10)"
                        : "rgba(63,174,90,0.04)",
                    transition: "background 0.12s, border-color 0.12s",
                    cursor: editMode ? "pointer" : "help",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: -10,
                      left: -10,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "var(--accent)",
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.5)",
                    }}
                  >
                    {i + 1}
                  </span>

                  {/* Tooltip on hover (view mode) */}
                  {isHover && !editMode && (
                    <div
                      data-tooltip
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        position: "absolute",
                        zIndex: 40,
                        width: "max-content",
                        maxWidth: 300,
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: "var(--panel-2)",
                        border: "1px solid var(--border)",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                        userSelect: "text",
                        cursor: "text",
                        ...tooltipPlacement(h),
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: h.description ? 4 : 0 }}>
                        {h.title}
                      </div>
                      {h.description && (
                        <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--muted)", whiteSpace: "pre-wrap" }}>
                          {h.description}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Title label (edit mode) */}
                  {editMode && h.title && (
                    <span
                      style={{
                        position: "absolute",
                        bottom: -2,
                        left: 0,
                        transform: "translateY(100%)",
                        fontSize: 10.5,
                        background: "rgba(0,0,0,0.7)",
                        color: "var(--text)",
                        padding: "1px 5px",
                        borderRadius: 4,
                        whiteSpace: "nowrap",
                        maxWidth: 180,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {h.title}
                    </span>
                  )}
                </div>
              );
            })}

            {/* Live draft rectangle while drawing */}
            {draft && (
              <div
                style={{
                  position: "absolute",
                  left: `${draft.x}%`,
                  top: `${draft.y}%`,
                  width: `${draft.w}%`,
                  height: `${draft.h}%`,
                  border: "2px dashed var(--accent)",
                  background: "rgba(63,174,90,0.15)",
                  borderRadius: 6,
                  pointerEvents: "none",
                }}
              />
            )}
          </div>
        </div>
      </div>

      {hotspots.length === 0 && !editMode && (
        <p className="px-6 pb-10 text-center text-sm" style={{ color: "var(--muted)" }}>
          No notes on this screenshot yet. Click{" "}
          <span style={{ color: "var(--accent)" }}>“✎ Edit notes”</span> to add some.
        </p>
      )}

      {/* Editor drawer */}
      {editing && (
        <div
          className="fixed right-0 top-0 z-50 flex h-full w-80 flex-col gap-3 border-l p-5 shadow-2xl"
          style={{ borderColor: "var(--border)", background: "var(--panel)" }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              {editing.id ? "Edit note" : "New note"}
            </h2>
            <button
              data-id="close-editor"
              onClick={() => setEditing(null)}
              className="text-lg leading-none"
              style={{ color: "var(--muted)", cursor: "pointer" }}
            >
              ✕
            </button>
          </div>

          <label className="text-xs" style={{ color: "var(--muted)" }}>
            Feature / component name
          </label>
          <input
            data-id="note-title"
            autoFocus
            value={editing.title}
            onChange={(e) => setEditing({ ...editing, title: e.target.value })}
            placeholder="e.g. Refresh button"
            className="rounded-md border px-2.5 py-2 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--text)" }}
          />

          <label className="text-xs" style={{ color: "var(--muted)" }}>
            Detailed explanation
          </label>
          <textarea
            data-id="note-description"
            value={editing.description}
            onChange={(e) => setEditing({ ...editing, description: e.target.value })}
            placeholder="What does this feature do? When would you use it?"
            rows={8}
            className="flex-1 resize-none rounded-md border px-2.5 py-2 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--text)" }}
          />

          <div className="flex items-center gap-2">
            <button
              data-id="save-note"
              onClick={saveEditing}
              className="flex-1 rounded-lg px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: "var(--accent)", cursor: "pointer" }}
            >
              Save
            </button>
            {editing.id && (
              <button
                data-id="delete-note"
                onClick={deleteEditing}
                className="rounded-lg px-3 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: "#3a1414", color: "#fca5a5", cursor: "pointer" }}
              >
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
