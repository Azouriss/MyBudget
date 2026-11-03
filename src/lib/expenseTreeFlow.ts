import type { ExpenseCategoryBreakdown } from './expenseHierarchy';
import { expenseFlow } from './expenseFlow';

export const expenseBranchKey = (categoryId: string, subcategoryId: string | null) => JSON.stringify([categoryId, subcategoryId]);

/** One shared cent-to-width scale across both levels; text can grow independently. */
export function expenseTreeFlow(groups: readonly ExpenseCategoryBreakdown[],
  measured: Readonly<Record<string, number>> = {}, fontScale = 1) {
  const total = groups.reduce((sum, group) => sum + group.amountCents, 0);
  // Reuse the existing validation contract, including integer cents and unique IDs.
  expenseFlow(groups, total, 100, {}, fontScale);
  for (const group of groups) expenseFlow(group.children.map(child => ({
    categoryId: expenseBranchKey(group.categoryId, child.subcategoryId), amountCents: child.amountCents,
  })), group.amountCents, 100);
  const visible = groups.filter(group => group.amountCents > 0);
  const branchCount = visible.reduce((sum, group) => sum + group.children.filter(child => child.amountCents > 0).length, 0);
  const bandHeight = branchCount > 1 ? 160 : branchCount ? 16 : 0;
  const size = (key: string, minimum: number) => Math.max(minimum,
    Number.isFinite(measured[key]) && measured[key]! > 0 ? measured[key]! + 24 : 0);
  const rootHeight = size('total', Math.max(76 * fontScale, bandHeight + 24));
  const sourceY = (rootHeight - bandHeight) / 2;
  let top = 0, sourceOffset = sourceY;
  const nodes = visible.map(group => {
    const thickness = group.amountCents / total * bandHeight;
    const key = expenseBranchKey(group.categoryId, null);
    const nodeHeight = size(`category:${key}`, Math.max(76 * fontScale, thickness + 24));
    const children = group.children.filter(child => child.amountCents > 0).map(child => {
      const childKey = expenseBranchKey(group.categoryId, child.subcategoryId);
      const childThickness = child.amountCents / total * bandHeight;
      return { ...child, key: childKey, thickness: childThickness,
        height: size(childKey, Math.max(76 * fontScale, childThickness + 24)) };
    });
    const childrenHeight = children.reduce((sum, child) => sum + child.height, 0) + (children.length - 1) * 8;
    const height = Math.max(nodeHeight, childrenHeight);
    const nodeY = top + (height - nodeHeight) / 2;
    const targetY = top + (height - thickness) / 2;
    let childTop = top + (height - childrenHeight) / 2, childSource = targetY;
    const branches = children.map(child => {
      const branch = { ...child, top: childTop, sourceY: childSource,
        targetY: childTop + (child.height - child.thickness) / 2 };
      childTop += child.height + 8; childSource += child.thickness;
      return branch;
    });
    const node = { ...group, key: `category:${key}`, top: nodeY, height: nodeHeight,
      sourceY: sourceOffset, targetY, thickness, children: branches };
    top += height + 24; sourceOffset += thickness;
    return node;
  });
  return { total, bandHeight, sourceY, rootHeight, height: Math.max(rootHeight, top - 24), groups: nodes };
}

export function expenseRibbon(start: number, end: number, sourceY: number, targetY: number, thickness: number) {
  const middle = (start + end) / 2;
  return `M ${start} ${sourceY} C ${middle} ${sourceY}, ${middle} ${targetY}, ${end} ${targetY} L ${end} ${targetY + thickness} C ${middle} ${targetY + thickness}, ${middle} ${sourceY + thickness}, ${start} ${sourceY + thickness} Z`;
}
