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

    it('pushes the cluster clear on a short horizontal drag (rigid would re-collide)', () => {
        // A(w8) drops 4 cols right onto neighbor B; a rigid translation lands B back under A, so
        // B is pushed left (the side A came from) to A's vacated cell instead of rejecting.
        const tiles = [t('A', 0, 0, 8, 2), t('B', 8, 0, 4, 2)];
        expect(resolveClusterSwap(tiles, 'A', 4, 0, COLS)).toEqual({
            A: { x: 4, y: 0 },
            B: { x: 0, y: 0 },
        });
    });

    it('pushes a shorter cluster below a taller tile dropped onto it, growing the board', () => {
        // Tall T(h3) sits one row below P(h2)/Q(h2). Dropping T up onto them lands its footprint
        // at y0-3, which a rigid swap would re-collide with; instead P/Q are pushed just below T.
        const tiles = [t('T', 0, 2, 8, 3), t('P', 0, 0, 4, 2), t('Q', 4, 0, 4, 2)];
        expect(resolveClusterSwap(tiles, 'T', 0, 0, COLS)).toEqual({
            T: { x: 0, y: 0 },
            P: { x: 0, y: 3 },
            Q: { x: 4, y: 3 },
        });
    });

    it('rejects a push that would collide with a bystander tile', () => {
        // Pushing P below T (to y3-5) would overlap the bystander X at y4-6 -> reject.
        const tiles = [t('T', 0, 2, 4, 3), t('P', 0, 0, 4, 2), t('X', 0, 4, 4, 2)];
        expect(resolveClusterSwap(tiles, 'T', 0, 0, COLS)).toBeNull();
    });

    it('returns null for a no-op drop (same position)', () => {
        const tiles = [t('a', 0, 0, 4, 2)];
        expect(resolveClusterSwap(tiles, 'a', 0, 0, COLS)).toBeNull();
    });
});
