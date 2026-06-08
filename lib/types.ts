// Shared, client-safe types (no node imports — safe to import from client components).

export type Hotspot = {
  id: string;
  /** Position + size as percentages (0-100) of the rendered image box. */
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  description: string;
};

export type Screenshot = {
  id: string;
  name: string;
  /** Filename inside the images/ data dir. */
  file: string;
  createdAt: number;
  hotspots: Hotspot[];
};
