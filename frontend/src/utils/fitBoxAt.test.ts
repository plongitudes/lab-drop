import { describe, expect, it } from 'vitest';

import { fitBoxAt, type Box } from './fitBoxAt';

const COLS = 36;
const b = (x: number, y: number, w: number, h: number): Box => ({ x, y, w, h });

describe('fitBoxAt', () => {
    it('returns the natural size when the area is empty', () => {
        expect(fitBoxAt([], 0, 0, 12, 4, 8, 2, COLS)).toEqual({ w: 12, h: 4 });
    });

    it('shrinks width when blocked on the right', () => {
        // A tile at x=8 caps the free width to 8.
        expect(fitBoxAt([b(8, 0, 4, 4)], 0, 0, 12, 4, 8, 2, COLS)).toEqual({ w: 8, h: 4 });
    });

    it('shrinks height when blocked below', () => {
        // A tile starting at y=2 leaves only 2 free rows.
        expect(fitBoxAt([b(0, 2, 12, 4)], 0, 0, 12, 4, 8, 2, COLS)).toEqual({ w: 12, h: 2 });
    });

    it('rejects when the free area is narrower than minW', () => {
        // Only 4 columns free before a blocker, but minW is 8.
        expect(fitBoxAt([b(4, 0, 4, 10)], 0, 0, 12, 4, 8, 2, COLS)).toBeNull();
    });

    it('rejects when the cursor cell itself is occupied', () => {
        expect(fitBoxAt([b(0, 0, 4, 4)], 0, 0, 12, 4, 8, 2, COLS)).toBeNull();
    });

    it('caps width at the grid edge', () => {
        // Dropping near the right edge: only 6 columns remain (cols - x = 36 - 30).
        expect(fitBoxAt([], 30, 0, 12, 4, 4, 2, COLS)).toEqual({ w: 6, h: 4 });
        // ...and rejects if minW exceeds the remaining space.
        expect(fitBoxAt([], 30, 0, 12, 4, 8, 2, COLS)).toBeNull();
    });

    it('keeps natural size when it fits despite nearby tiles', () => {
        // Blocker is outside the 12-wide footprint, so no shrink.
        expect(fitBoxAt([b(12, 0, 4, 4)], 0, 0, 12, 4, 8, 2, COLS)).toEqual({ w: 12, h: 4 });
    });

    it('picks the larger-area rectangle for an L-shaped gap', () => {
        // Row 0 free to width 12; rows 1-3 blocked past x=6.
        // hh=1 => 12x1 (area 12); hh>=2 => width 6, hh=4 => 6x4 (area 24). Picks 6x4.
        const occ = [b(6, 1, 6, 3)];
        expect(fitBoxAt(occ, 0, 0, 12, 4, 4, 1, COLS)).toEqual({ w: 6, h: 4 });
    });
});
