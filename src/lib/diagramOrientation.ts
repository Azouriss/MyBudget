type OrientationAdapter = { get: () => Promise<number>; lock: (value: number) => Promise<void> };

/** Serialize rotation and restoration, including closing during a pending rotation. */
export function diagramOrientation(adapter: OrientationAdapter, portrait: number, landscape: number) {
  let original: number | undefined, changed = false, closed = false;
  let pending: Promise<void> = Promise.resolve();
  return {
    rotate(wide: boolean) {
      pending = pending.catch(() => {}).then(async () => {
        if (closed) return;
        if (original === undefined) original = await adapter.get();
        if (closed) return;
        // Set before awaiting: even a platform that applies then rejects must be restored.
        changed = true;
        await adapter.lock(wide ? landscape : portrait);
      });
      return pending;
    },
    close() {
      if (closed) return pending;
      closed = true;
      pending = pending.catch(() => {}).then(async () => {
        if (changed && original !== undefined) await adapter.lock(original);
      });
      return pending;
    },
  };
}
