import { describe, expect, it } from 'vitest';

import { resolveClusterSwap, type PlacedTile } from './resolveClusterSwap';

const COLS = 36;
const t = (id: string, x: number, y: number, w: number, h: number): PlacedTile => ({ id, x, y, w, h });

describe('resolveClusterSwap', () => {
    it('swaps two equal-footprint tiles (1:1)', () => {
        const tiles = [t('A', 0, 0, 4, 2), t('B', 4, 0, 4, 2)];
        const r = resolveClusterSwap(tiles, 'A', 4, 0, COLS); // drop A onto B
        expect(r).toEqual({ A: { x: 4, y: 0 }, B: { x: 0, y: 0 } });
    });

    it('swaps a big tile with a fully-enclosed cluster (rigid translation)', () => {
        const tiles = [
            t('N', 24, 0, 12, 4), // Notes
            t('a', 0, 0, 4, 2), t('b', 4, 0, 4, 2),
            t('c', 0, 2, 4, 2), t('d', 4, 2, 4, 2),
        ];
        const r = resolveClusterSwap(tiles, 'N', 0, 0, COLS); // drop Notes onto the 2x2 app cluster
        expect(r).toEqual({
            N: { x: 0, y: 0 },
            a: { x: 24, y: 0 }, b: { x: 28, y: 0 },
            c: { x: 24, y: 2 }, d: { x: 28, y: 2 },
        });
    });

    it('rejects when a tile straddles the drop footprint boundary', () => {
        const tiles = [
            t('N', 24, 0, 12, 4),
            t('a', 0, 0, 4, 2),
            t('straddler', 10, 0, 4, 2), // extends to x=14, past F right edge (x=12)
        ];
        expect(resolveClusterSwap(tiles, 'N', 0, 0, COLS)).toBeNull();
    });

    it('rejects small-onto-big (the big tile straddles the small footprint)', () => {
        const tiles = [t('app', 0, 0, 4, 2), t('N', 0, 4, 12, 4)];
        expect(resolveClusterSwap(tiles, 'app', 0, 4, COLS)).toBeNull();
    });

    it('allows a plain move onto free space', () => {
        const tiles = [t('a', 0, 0, 4, 2), t('b', 4, 0, 4, 2)];
        expect(resolveClusterSwap(tiles, 'a', 20, 10, COLS)).toEqual({ a: { x: 20, y: 10 } });
    });

    it('rejects an out-of-bounds drop', () => {
        const tiles = [t('a', 0, 0, 4, 2)];
        expect(resolveClusterSwap(tiles, 'a', 34, 0, COLS)).toBeNull(); // 34+4 > 36
    });

    it('rejects a short drag whose translated cluster re-collides with the dragged tile', () => {
        // A(w8) drops 4 cols right, overlapping its own old cell and neighbor B;
        // translating B by the offset lands it back under A -> overlap -> reject.
        const tiles = [t('A', 0, 0, 8, 2), t('B', 8, 0, 4, 2)];
        expect(resolveClusterSwap(tiles, 'A', 4, 0, COLS)).toBeNull();
    });

    it('returns null for a no-op drop (same position)', () => {
        const tiles = [t('a', 0, 0, 4, 2)];
        expect(resolveClusterSwap(tiles, 'a', 0, 0, COLS)).toBeNull();
    });
});
