// Lightweight pointer drag-drop: drop targets carry a `data-drop` attribute
// ("cell:<n>", "queue", "slot", or "window"), and on drag end we hit-test the
// pointer against the stack of elements under it. Generous targets +
// snap-back on miss keep the interaction cozy and forgiving.

import type { CellIndex } from "@/game/types";
import { asCellIndex } from "@/game/types";

export type DropTarget =
  | { readonly kind: "cell"; readonly cell: CellIndex }
  | { readonly kind: "queue" }
  | { readonly kind: "slot" }
  | { readonly kind: "window" };

function parse(token: string): DropTarget | null {
  if (token === "queue") return { kind: "queue" };
  if (token === "slot") return { kind: "slot" };
  if (token === "window") return { kind: "window" };
  if (token.startsWith("cell:")) {
    const n = Number(token.slice(5));
    if (Number.isInteger(n)) return { kind: "cell", cell: asCellIndex(n) };
  }
  return null;
}

/** Topmost drop target under a viewport (client) coordinate, or null. */
export function resolveDropAt(clientX: number, clientY: number): DropTarget | null {
  const els = document.elementsFromPoint(clientX, clientY);
  for (const el of els) {
    const token = (el as HTMLElement | SVGElement).dataset?.drop;
    if (token) {
      const target = parse(token);
      if (target) return target;
    }
  }
  return null;
}
