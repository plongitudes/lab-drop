import { ITEM_TYPE } from '../types';

/**
 * Grid geometry + per-tile sizing for the free 2-D dashboard layout (react-grid-layout).
 *
 * Column choice: 36 desktop / 12 mobile. 36 lets the app-shortcut's legacy `lg: 4/3`
 * span (9 icons per row) map to an integer width (w=4), while standard widgets (legacy
 * `lg: 4`, i.e. 1/3 width) become w=12. On mobile the legacy spans were `xs: 4` (app,
 * 1/3) and `xs: 12` (widget, full), so 12 columns maps those directly.
 *
 * The h / min / max values below are informed starting points; they are tuned visually
 * against real rendered tile heights in Stage 2 (Risk 1 in the plan). Sizing is derived
 * per-type at render time and is NOT persisted, so it can change in code freely.
 */

export type Device = 'desktop' | 'mobile';

export const GRID_COLS: Record<Device, number> = {
    desktop: 36,
    mobile: 12,
};

/** Pixel height of one grid row unit. */
export const ROW_HEIGHT = 56;

/** [horizontal, vertical] gap between tiles, in px. Matches the old MUI `spacing={2}` (16px). */
export const GRID_MARGIN: [number, number] = [16, 16];

/** [horizontal, vertical] padding around the grid, in px. Matches the old `px: 2`. */
export const GRID_CONTAINER_PADDING: [number, number] = [16, 16];

export const getGridCols = (device: Device): number => GRID_COLS[device];

/** Full sizing for one tile in a react-grid-layout item. */
export type TileSizing = {
    w: number;
    h: number;
    minW: number;
    minH: number;
    maxW: number;
    maxH: number;
};

/** Per-type sizing spec, resolved by device. Widths/mins are per-device; heights are row units. */
type TileSpec = {
    w: Record<Device, number>;
    h: Record<Device, number>;
    minW: Record<Device, number>;
    minH: number;
    /** Absolute max height in row units; width max is always the full column count. */
    maxH: number;
};

// Standard widget: 1/3 width desktop (w=12/36), full width mobile (w=12/12).
const WIDGET_SPEC: TileSpec = {
    w: { desktop: 12, mobile: 12 },
    h: { desktop: 4, mobile: 4 },
    minW: { desktop: 8, mobile: 6 },
    minH: 2,
    maxH: 12,
};

// App shortcut: 1/9 width desktop (w=4/36), 1/3 width mobile (w=4/12); compact height.
const APP_SPEC: TileSpec = {
    w: { desktop: 4, mobile: 4 },
    h: { desktop: 2, mobile: 2 },
    minW: { desktop: 2, mobile: 2 },
    minH: 1,
    maxH: 4,
};

/**
 * Per-type overrides on top of WIDGET_SPEC. Keys are ITEM_TYPE values.
 * Only heights that meaningfully differ from the default are listed; widths follow the
 * legacy spans (all widgets were 1/3 desktop / full mobile, so they share WIDGET_SPEC.w).
 */
const TILE_SPECS: Partial<Record<string, TileSpec>> = {
    [ITEM_TYPE.APP_SHORTCUT]: APP_SPEC,

    [ITEM_TYPE.DATE_TIME_WIDGET]: { ...WIDGET_SPEC, h: { desktop: 2, mobile: 2 }, minH: 2, maxH: 4 },
    [ITEM_TYPE.WEATHER_WIDGET]: { ...WIDGET_SPEC, h: { desktop: 3, mobile: 3 } },
    [ITEM_TYPE.SYSTEM_MONITOR_WIDGET]: { ...WIDGET_SPEC, h: { desktop: 3, mobile: 3 } },
    [ITEM_TYPE.PIHOLE_WIDGET]: { ...WIDGET_SPEC, h: { desktop: 3, mobile: 3 } },
    [ITEM_TYPE.ADGUARD_WIDGET]: { ...WIDGET_SPEC, h: { desktop: 3, mobile: 3 } },
    [ITEM_TYPE.NOTES_WIDGET]: { ...WIDGET_SPEC, h: { desktop: 4, mobile: 4 } },
    [ITEM_TYPE.DISK_MONITOR_WIDGET]: { ...WIDGET_SPEC, h: { desktop: 4, mobile: 4 }, minH: 2 },

    // Legacy composites — retired during migration, but keep sane sizing until then.
    [ITEM_TYPE.GROUP_WIDGET]: { ...WIDGET_SPEC, h: { desktop: 4, mobile: 4 }, minH: 3 },
    [ITEM_TYPE.DUAL_WIDGET]: { ...WIDGET_SPEC, h: { desktop: 4, mobile: 4 }, minH: 3 },
};

const LEGACY_SPACER_TYPES = new Set<string>([
    ITEM_TYPE.PLACEHOLDER,
    ITEM_TYPE.BLANK_APP,
    ITEM_TYPE.BLANK_WIDGET,
    ITEM_TYPE.BLANK_ROW,
]);

export const isSpacerType = (type: string): boolean => LEGACY_SPACER_TYPES.has(type);

const specFor = (type: string): TileSpec => TILE_SPECS[type] ?? WIDGET_SPEC;

/** Default width/height for a freshly placed or migrated tile of the given type. */
export const getTileDefaults = (
    type: string,
    device: Device,
): { w: number; h: number } => {
    const spec = specFor(type);
    return { w: spec.w[device], h: spec.h[device] };
};

/** Resize constraints for a tile of the given type on the given device. */
export const getTileSizing = (type: string, device: Device): TileSizing => {
    const spec = specFor(type);
    return {
        w: spec.w[device],
        h: spec.h[device],
        minW: spec.minW[device],
        minH: spec.minH,
        maxW: GRID_COLS[device],
        maxH: spec.maxH,
    };
};
