import { describe, expect, it } from 'vitest';

import { ITEM_TYPE, type DashboardItem } from '../types';
import { migrateFlowLayout, needsMigration, packDeviceLayout } from './migrateFlowLayout';

const mk = (id: string, type: string, extra: Partial<DashboardItem> = {}): DashboardItem => ({
    id,
    label: id,
    type,
    ...extra,
});

const byId = (items: DashboardItem[]) =>
    Object.fromEntries(items.map((i) => [i.id, i.layout]));

describe('packDeviceLayout (desktop, 36 cols)', () => {
    it('packs three 1/3-width widgets into a single row', () => {
        const items = [
            mk('a', ITEM_TYPE.WEATHER_WIDGET),
            mk('b', ITEM_TYPE.WEATHER_WIDGET),
            mk('c', ITEM_TYPE.WEATHER_WIDGET),
        ];
        const out = byId(packDeviceLayout(items, 'desktop'));
        expect(out.a).toEqual({ x: 0, y: 0, w: 12, h: 3 });
        expect(out.b).toEqual({ x: 12, y: 0, w: 12, h: 3 });
        expect(out.c).toEqual({ x: 24, y: 0, w: 12, h: 3 });
    });

    it('wraps the fourth widget to the next shelf', () => {
        const items = Array.from({ length: 4 }, (_, i) => mk(`w${i}`, ITEM_TYPE.WEATHER_WIDGET));
        const out = byId(packDeviceLayout(items, 'desktop'));
        expect(out.w3).toEqual({ x: 0, y: 3, w: 12, h: 3 }); // shelf height = 3
    });

    it('packs 9 app shortcuts per row (the legacy 4/3 span)', () => {
        const items = Array.from({ length: 10 }, (_, i) => mk(`app${i}`, ITEM_TYPE.APP_SHORTCUT));
        const out = byId(packDeviceLayout(items, 'desktop'));
        expect(out.app0).toEqual({ x: 0, y: 0, w: 4, h: 2 });
        expect(out.app8).toEqual({ x: 32, y: 0, w: 4, h: 2 }); // 9th fills last slot (8*4=32)
        expect(out.app9).toEqual({ x: 0, y: 2, w: 4, h: 2 }); // 10th wraps
    });
});

describe('migrateFlowLayout spacer handling', () => {
    it('a full-row spacer forces a wrap, and dropping it preserves the frozen gap', () => {
        const items = [
            mk('top', ITEM_TYPE.WEATHER_WIDGET),
            mk('spacer', ITEM_TYPE.BLANK_ROW),
            mk('bottom', ITEM_TYPE.WEATHER_WIDGET),
        ];
        const out = migrateFlowLayout(items, 'desktop'); // dropSpacers: true
        expect(out.map((i) => i.id)).toEqual(['top', 'bottom']); // spacer removed
        const m = byId(out);
        expect(m.top).toEqual({ x: 0, y: 0, w: 12, h: 3 });
        // top(h3) then blank-row(h4) => bottom starts at y = 3 + 4 = 7, gap preserved
        expect(m.bottom).toEqual({ x: 0, y: 7, w: 12, h: 3 });
    });

    it('keeps spacers when dropSpacers is false', () => {
        const items = [mk('a', ITEM_TYPE.WEATHER_WIDGET), mk('s', ITEM_TYPE.BLANK_WIDGET)];
        const out = migrateFlowLayout(items, 'desktop', { dropSpacers: false });
        expect(out.map((i) => i.id)).toEqual(['a', 's']);
        expect(out[1].layout).toEqual({ x: 12, y: 0, w: 12, h: 4 });
    });
});

describe('migrateFlowLayout (mobile, 12 cols)', () => {
    it('stacks full-width widgets one per row', () => {
        const items = Array.from({ length: 3 }, (_, i) => mk(`w${i}`, ITEM_TYPE.WEATHER_WIDGET));
        const out = byId(migrateFlowLayout(items, 'mobile'));
        expect(out.w0).toEqual({ x: 0, y: 0, w: 12, h: 3 });
        expect(out.w1).toEqual({ x: 0, y: 3, w: 12, h: 3 });
        expect(out.w2).toEqual({ x: 0, y: 6, w: 12, h: 3 });
    });
});

describe('idempotency', () => {
    it('returns already-migrated arrays untouched', () => {
        const items = [
            mk('a', ITEM_TYPE.WEATHER_WIDGET, { layout: { x: 5, y: 5, w: 12, h: 3 } }),
        ];
        expect(needsMigration(items)).toBe(false);
        expect(migrateFlowLayout(items, 'desktop')).toBe(items); // same reference
    });

    it('an array of only spacers is not considered legacy', () => {
        const items = [mk('s', ITEM_TYPE.BLANK_ROW)];
        expect(needsMigration(items)).toBe(false);
    });
});
