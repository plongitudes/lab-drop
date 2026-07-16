/**
 * Largest free rectangle that fits when dropping a tile at a grid cell.
 *
 * Anchored top-left at (x, y), extending right and down, capped at the tile's natural size
 * (maxW × maxH) and floored at its minimum usable size (minW × minH). Used to let a larger
 * widget dragged from the tray shrink to fit a smaller gap: the drop ghost previews the fitted
 * size and the tile is placed at it. Returns null when even the minimum won't fit (reject drop).
 */

export type Box = { x: number; y: number; w: number; h: number };

export const fitBoxAt = (
    occupied: Box[],
    x: number,
    y: number,
    maxW: number,
    maxH: number,
    minW: number,
    minH: number,
    cols: number,
): { w: number; h: number } | null => {
    if (x < 0 || y < 0 || x >= cols) return null;

    const isFree = (cx: number, cy: number): boolean =>
        cx >= 0 &&
        cx < cols &&
        cy >= 0 &&
        !occupied.some((b) => cx >= b.x && cx < b.x + b.w && cy >= b.y && cy < b.y + b.h);

    // Free width available on each row below the cursor, capped at the natural width and the grid edge.
    const capW = Math.min(maxW, cols - x);
    const rowExtent: number[] = [];
    for (let r = 0; r < maxH; r++) {
        let ext = 0;
        while (ext < capW && isFree(x + ext, y + r)) ext++;
        rowExtent.push(ext);
    }

    // A solid rectangle of height hh is as wide as its narrowest row; pick the largest-area one
    // that still meets the minimums. Width only shrinks as height grows, so once it drops below
    // minW no taller rectangle can qualify.
    let best: { w: number; h: number } | null = null;
    let bestArea = 0;
    let minWidth = Infinity;
    for (let hh = 1; hh <= maxH; hh++) {
        minWidth = Math.min(minWidth, rowExtent[hh - 1]);
        if (minWidth < minW) break;
        if (hh >= minH) {
            const area = minWidth * hh;
            if (area > bestArea) {
                bestArea = area;
                best = { w: minWidth, h: hh };
            }
        }
    }
    return best;
};
