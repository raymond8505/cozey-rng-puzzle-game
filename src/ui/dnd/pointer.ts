import type { PanInfo } from "motion/react";

/** Viewport (client) coordinates from a drag-end event, for elementsFromPoint.
 *  Falls back to Motion's page-relative point minus scroll. */
export function clientXY(
  e: MouseEvent | TouchEvent | PointerEvent,
  info: PanInfo,
): [number, number] {
  const pe = e as PointerEvent;
  if (typeof pe.clientX === "number") return [pe.clientX, pe.clientY];
  const t = (e as TouchEvent).changedTouches?.[0];
  if (t) return [t.clientX, t.clientY];
  return [info.point.x - window.scrollX, info.point.y - window.scrollY];
}
