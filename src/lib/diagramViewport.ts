export type DiagramTransform = { x: number; y: number; scale: number };
export type DiagramSize = { width: number; height: number };
export type DiagramPoint = { x: number; y: number };
export const MIN_DIAGRAM_ZOOM = 0.25;
export const MAX_DIAGRAM_ZOOM = 3;

export function boundDiagram(value: DiagramTransform, viewport: DiagramSize, content: DiagramSize): DiagramTransform {
  const scale = Math.max(MIN_DIAGRAM_ZOOM, Math.min(MAX_DIAGRAM_ZOOM, value.scale));
  return { scale,
    x: Math.max(Math.min(0, viewport.width - content.width * scale), Math.min(0, value.x)),
    y: Math.max(Math.min(0, viewport.height - content.height * scale), Math.min(0, value.y)),
  };
}

/** Keep the content beneath the fingers stationary while changing magnification. */
export function zoomDiagram(value: DiagramTransform, scale: number, from: DiagramPoint, to: DiagramPoint,
  viewport: DiagramSize, content: DiagramSize) {
  const nextScale = Math.max(MIN_DIAGRAM_ZOOM, Math.min(MAX_DIAGRAM_ZOOM, scale));
  const ratio = nextScale / value.scale;
  return boundDiagram({ scale: nextScale, x: to.x - (from.x - value.x) * ratio,
    y: to.y - (from.y - value.y) * ratio }, viewport, content);
}
