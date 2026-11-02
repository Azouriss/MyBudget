type ExpensePart = { categoryId: string; amountCents: number };

/** Ribbon widths preserve the exact category proportions; label rows may grow independently. */
export function expenseFlow(parts: readonly ExpensePart[], total: number, width: number,
  measuredHeights: Readonly<Record<string, number>> = {}, fontScale = 1) {
  if (!Number.isSafeInteger(total) || total < 0 || !Number.isFinite(width) || width < 24
    || !Number.isFinite(fontScale) || fontScale <= 0) throw new Error('Répartition invalide.');
  if (parts.some((part) => !Number.isSafeInteger(part.amountCents) || part.amountCents < 0)
    || new Set(parts.map((part) => part.categoryId)).size !== parts.length
    || parts.reduce((sum, part) => sum + part.amountCents, 0) !== total) throw new Error('Répartition incohérente.');
  const visible = parts.filter((part) => part.amountCents > 0);
  const bandHeight = visible.length ? 120 : 0;
  const rows = visible.map((part) => {
    const thickness = part.amountCents / total * bandHeight;
    const minHeight = Math.max(76 * fontScale, thickness + 16);
    const measured = measuredHeights[part.categoryId];
    const height = Number.isFinite(measured) && measured! > minHeight ? measured! : minHeight;
    return { ...part, thickness, minHeight, height };
  });
  const height = rows.reduce((sum, row) => sum + row.height, 0);
  const sourceY = (height - bandHeight) / 2;
  let sourceOffset = sourceY, targetOffset = 0;
  return { height, sourceY, bandHeight, rows: rows.map((row) => {
    const sy = sourceOffset, ty = targetOffset + (row.height - row.thickness) / 2;
    const end = width - 6, middle = width / 2;
    const path = `M 6 ${sy} C ${middle} ${sy}, ${middle} ${ty}, ${end} ${ty} L ${end} ${ty + row.thickness} C ${middle} ${ty + row.thickness}, ${middle} ${sy + row.thickness}, 6 ${sy + row.thickness} Z`;
    sourceOffset += row.thickness;
    targetOffset += row.height;
    return { ...row, sourceY: sy, targetY: ty, path };
  }) };
}
