import { boundDiagram, zoomDiagram } from '../diagramViewport';

const viewport = { width: 400, height: 600 }, content = { width: 800, height: 5000 };
it('borne les déplacements et conserve l’accès à la dernière branche', () => {
  expect(boundDiagram({ x: -9999, y: -9999, scale: 1 }, viewport, content)).toEqual({ x: -400, y: -4400, scale: 1 });
  expect(boundDiagram({ x: 100, y: 100, scale: 1 }, viewport, content)).toEqual({ x: 0, y: 0, scale: 1 });
});
it('zoome autour du point entre les doigts sans le déplacer', () => {
  const from = { x: 200, y: 300 }, start = { x: -50, y: -500, scale: 1 };
  const next = zoomDiagram(start, 2, from, from, viewport, content);
  expect((from.x - next.x) / next.scale).toBe((from.x - start.x) / start.scale);
  expect((from.y - next.y) / next.scale).toBe((from.y - start.y) / start.scale);
});
it('combine pincement et déplacement et limite le grossissement', () => {
  expect(zoomDiagram({ x: -100, y: -100, scale: 1 }, 1, { x: 0, y: 0 }, { x: 25, y: 40 }, viewport, content))
    .toEqual({ x: -75, y: -60, scale: 1 });
  expect(boundDiagram({ x: 0, y: 0, scale: 99 }, viewport, content).scale).toBe(3);
  expect(boundDiagram({ x: 0, y: 0, scale: 0.01 }, viewport, content).scale).toBe(0.25);
});
it('réadapte les limites après rotation ou lorsque le dessin tient dans la vue', () => {
  expect(boundDiagram({ x: -400, y: -4400, scale: 1 }, { width: 900, height: 350 }, content))
    .toEqual({ x: 0, y: -4400, scale: 1 });
  expect(boundDiagram({ x: -100, y: -100, scale: 0.5 }, viewport, { width: 400, height: 600 }))
    .toEqual({ x: 0, y: 0, scale: 0.5 });
});
