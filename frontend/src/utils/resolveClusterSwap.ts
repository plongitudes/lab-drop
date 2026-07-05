/**
 * Swap-on-drop resolution for the free-2-D dashboard grid.
 *
 * When a tile is dropped onto occupied cell(s), we try a *rigid cluster swap*: the group of
 * tiles fully enclosed by the dragged tile's drop footprint is translated as one block into
 * the dragged tile's vacated cell, and the dragged tile takes the drop footprint. Because the
 * source and drop footprints are congruent, a fully-enclosed cluster is guaranteed to fit; the
 * only real gate is "no straddlers" plus a final board validation (which also catches the
 * short-drag case where source and drop footprints overlap and would re-collide).
 *
 * Returns a map of id -> new {x,y} for every moved tile, or null to reject the drop (snap back).
 */

export type PlacedTile = { id: string; x: number; y: number; w: number; h: number };
type Rect = { x: number; y: number; w: number; h: number };

const overlaps = (a: Rect, b: Rect): boolean =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** True if `inner` is fully contained within `outer`. */
const contains = (outer: Rect, inner: Rect): boolean =>
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.w <= outer.x + outer.w &&
    inner.y + inner.h <= outer.y + outer.h;

export const resolveClusterSwap = (
    tiles: PlacedTile[],
    draggedId: string,
    dropX: number,
    dropY: number,
    cols: number,
): Record<string, { x: number; y: number }> | null => {
    const dragged = tiles.find((t) => t.id === draggedId);
    if (!dragged) return null;

    // The dragged tile's footprint at the drop location.
    const F: Rect = { x: dropX, y: dropY, w: dragged.w, h: dragged.h };

    // Dragged tile must stay in bounds (y is unbounded below the grid).
    if (F.x < 0 || F.y < 0 || F.x + F.w > cols) return null;
    // No actual movement.
    if (F.x === dragged.x && F.y === dragged.y) return null;

    const others = tiles.filter((t) => t.id !== draggedId);
    const overlapped = others.filter((t) => overlaps(t, F));

    // Drop onto free space: a plain move (RGL normally handles this, but keep it consistent).
    if (overlapped.length === 0) {
        return { [draggedId]: { x: F.x, y: F.y } };
    }

    // Every overlapped tile must be fully enclosed by F — otherwise the swap is ambiguous
    // (a straddler is attached to something outside F). This also rejects small-onto-big.
    if (!overlapped.every((s) => contains(F, s))) return null;

    // Rigid translation that carries the cluster into the dragged tile's vacated cell.
    const vx = dragged.x - F.x;
    const vy = dragged.y - F.y;

    // Compute the tentative final layout (moved tiles + untouched tiles).
    const moved = new Map<string, Rect>();
    moved.set(draggedId, { ...F });
    for (const s of overlapped) moved.set(s.id, { x: s.x + vx, y: s.y + vy, w: s.w, h: s.h });

    const final: PlacedTile[] = tiles.map((t) => {
        const m = moved.get(t.id);
        return m ? { id: t.id, ...m } : t;
    });

    // Validate: everything in bounds and no overlaps anywhere on the board.
    for (const t of final) {
        if (t.x < 0 || t.y < 0 || t.x + t.w > cols) return null;
    }
    for (let i = 0; i < final.length; i++) {
        for (let j = i + 1; j < final.length; j++) {
            if (overlaps(final[i], final[j])) return null;
        }
    }

    // Return only the tiles that moved.
    const result: Record<string, { x: number; y: number }> = {
        [draggedId]: { x: F.x, y: F.y },
    };
    for (const s of overlapped) result[s.id] = { x: s.x + vx, y: s.y + vy };
    return result;
};
