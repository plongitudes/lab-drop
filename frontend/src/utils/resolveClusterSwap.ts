/**
 * Swap-on-drop resolution for the free-2-D dashboard grid.
 *
 * When a tile is dropped onto occupied cell(s), the group of tiles fully enclosed by the dragged
 * tile's drop footprint is displaced so the dragged tile can take that footprint. Which way they're
 * displaced depends on whether the drag was long or short:
 *
 *  - **Clean swap (footprints disjoint)** — the dragged tile's old and new footprints don't overlap,
 *    so the enclosed cluster rigidly translates into the vacated cell (a straight trade of places).
 *
 *  - **Short drag (footprints overlap)** — the drag is small enough that a rigid translation would
 *    land the cluster back under the dragged tile. Instead, pack the cluster against the *far* edge
 *    of the vacated footprint (the side away from the drop), growing the board if needed. Packing to
 *    the far edge (rather than just barely clearing the drop) means the cluster stays put as the drag
 *    continues in the same direction, instead of following-then-receding as the resolution flips.
 *
 * The only hard gate is "no straddlers" (every overlapped tile must be fully enclosed) plus a final
 * whole-board validation. Returns a map of id -> new {x,y} for every moved tile, or null to reject
 * the drop (snap back).
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

    // The dragged tile's vacated (old) footprint O and drop footprint F.
    const O: Rect = { x: dragged.x, y: dragged.y, w: dragged.w, h: dragged.h };
    const F: Rect = { x: dropX, y: dropY, w: dragged.w, h: dragged.h };

    // Dragged tile must stay in bounds (y is unbounded below the grid).
    if (F.x < 0 || F.y < 0 || F.x + F.w > cols) return null;
    // No actual movement.
    if (F.x === O.x && F.y === O.y) return null;

    const others = tiles.filter((t) => t.id !== draggedId);
    const overlapped = others.filter((t) => overlaps(t, F));

    // Drop onto free space: a plain move.
    if (overlapped.length === 0) {
        return { [draggedId]: { x: F.x, y: F.y } };
    }

    // Every overlapped tile must be fully enclosed by F — otherwise the displacement is ambiguous
    // (a straddler is attached to something outside F). This also rejects small-onto-big.
    if (!overlapped.every((s) => contains(F, s))) return null;

    // Build a candidate final layout: dragged tile -> F, each enclosed tile moved by `place`.
    // Validate the whole board (bounds + no overlaps anywhere) and return the moved map, or null.
    const build = (
        place: (s: PlacedTile) => { x: number; y: number },
    ): Record<string, { x: number; y: number }> | null => {
        const moved = new Map<string, { x: number; y: number }>();
        moved.set(draggedId, { x: F.x, y: F.y });
        for (const s of overlapped) moved.set(s.id, place(s));

        const final: PlacedTile[] = tiles.map((t) => {
            const m = moved.get(t.id);
            return m ? { id: t.id, x: m.x, y: m.y, w: t.w, h: t.h } : t;
        });

        for (const t of final) {
            if (t.x < 0 || t.y < 0 || t.x + t.w > cols) return null;
        }
        for (let i = 0; i < final.length; i++) {
            for (let j = i + 1; j < final.length; j++) {
                if (overlaps(final[i], final[j])) return null;
            }
        }
        return Object.fromEntries(moved);
    };

    // Clean swap: footprints disjoint -> rigid translation into the vacated cell.
    if (!overlaps(O, F)) {
        return build((s) => ({ x: s.x + (O.x - F.x), y: s.y + (O.y - F.y) }));
    }

    // Short drag: pack the cluster against the far edge of O, away from F, along the dominant axis.
    const dx = F.x - O.x;
    const dy = F.y - O.y;
    let place: (s: PlacedTile) => { x: number; y: number };
    if (Math.abs(dx) >= Math.abs(dy)) {
        if (dx > 0) {
            // Dragged rightward -> pack the cluster to O's left edge.
            const minX = Math.min(...overlapped.map((s) => s.x));
            const delta = O.x - minX;
            place = (s) => ({ x: s.x + delta, y: s.y });
        } else {
            // Dragged leftward -> pack the cluster to O's right edge.
            const maxX = Math.max(...overlapped.map((s) => s.x + s.w));
            const delta = O.x + O.w - maxX;
            place = (s) => ({ x: s.x + delta, y: s.y });
        }
    } else {
        if (dy > 0) {
            // Dragged downward -> pack the cluster to O's top edge.
            const minY = Math.min(...overlapped.map((s) => s.y));
            const delta = O.y - minY;
            place = (s) => ({ x: s.x, y: s.y + delta });
        } else {
            // Dragged upward -> pack the cluster to O's bottom edge.
            const maxY = Math.max(...overlapped.map((s) => s.y + s.h));
            const delta = O.y + O.h - maxY;
            place = (s) => ({ x: s.x, y: s.y + delta });
        }
    }
    return build(place);
};
