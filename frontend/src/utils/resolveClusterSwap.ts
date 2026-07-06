/**
 * Swap-on-drop resolution for the free-2-D dashboard grid.
 *
 * When a tile is dropped onto occupied cell(s), the group of tiles fully enclosed by the dragged
 * tile's drop footprint is displaced so the dragged tile can take that footprint. Two strategies,
 * tried in order:
 *
 *  1. **Rigid cluster swap** — translate the enclosed cluster as one block into the dragged tile's
 *     vacated cell. Because the source and drop footprints are congruent, a fully-enclosed cluster
 *     is guaranteed to fit *when the two footprints don't overlap* (a clean trade of places).
 *
 *  2. **Short-drag push** — when the drag is small enough that the source and drop footprints
 *     overlap, the rigid translation lands the cluster back under the dragged tile (re-collision).
 *     This happens whenever the dragged tile is taller/wider than the gap it crossed. Instead of
 *     rejecting, push the cluster just clear of the drop footprint on the side the dragged tile
 *     came from, growing the board's lower/other edge if needed. (E.g. an h3 clock dropped onto two
 *     h2 tiles one row above it: the clock takes the footprint and the two tiles are pushed just
 *     below it.)
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

    // The dragged tile's footprint at the drop location.
    const F: Rect = { x: dropX, y: dropY, w: dragged.w, h: dragged.h };

    // Dragged tile must stay in bounds (y is unbounded below the grid).
    if (F.x < 0 || F.y < 0 || F.x + F.w > cols) return null;
    // No actual movement.
    if (F.x === dragged.x && F.y === dragged.y) return null;

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

    // Vector carrying the drop footprint back onto the dragged tile's vacated cell.
    const vx = dragged.x - F.x;
    const vy = dragged.y - F.y;

    // 1) Rigid cluster swap.
    const rigid = build((s) => ({ x: s.x + vx, y: s.y + vy }));
    if (rigid) return rigid;

    // 2) Short-drag push, along the dominant motion axis, toward the side the drag came from.
    let push: (s: PlacedTile) => { x: number; y: number };
    if (Math.abs(vy) >= Math.abs(vx)) {
        if (vy > 0) {
            // Dragged tile came from below -> push the cluster just below F.
            const minY = Math.min(...overlapped.map((s) => s.y));
            const delta = F.y + F.h - minY;
            push = (s) => ({ x: s.x, y: s.y + delta });
        } else {
            // Dragged tile came from above -> push the cluster just above F.
            const maxY = Math.max(...overlapped.map((s) => s.y + s.h));
            const delta = F.y - maxY;
            push = (s) => ({ x: s.x, y: s.y + delta });
        }
    } else {
        if (vx > 0) {
            // Dragged tile came from the right -> push the cluster just right of F.
            const minX = Math.min(...overlapped.map((s) => s.x));
            const delta = F.x + F.w - minX;
            push = (s) => ({ x: s.x + delta, y: s.y });
        } else {
            // Dragged tile came from the left -> push the cluster just left of F.
            const maxX = Math.max(...overlapped.map((s) => s.x + s.w));
            const delta = F.x - maxX;
            push = (s) => ({ x: s.x + delta, y: s.y });
        }
    }
    return build(push);
};
