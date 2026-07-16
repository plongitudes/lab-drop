import { ITEM_TYPE, type DashboardItem } from '../types';
import { GRID_COLS, getTileDefaults, isSpacerType, type Device } from '../constants/gridLayout';

/**
 * Migrates a legacy 1-D flow layout (position = array index, size = per-type span) into
 * explicit free-2-D coordinates by *replaying the flow* — a left-to-right shelf packer that
 * mirrors how MUI Grid2 wrapped tiles. This freezes today's exact visual layout into x/y/w/h,
 * including the gaps that spacer/placeholder tiles were faking, so a user's dashboard looks
 * identical after the switch to react-grid-layout.
 *
 * Spacers participate in packing (so their gaps are reproduced) and are then dropped — the
 * surrounding tiles keep their frozen coordinates, so the empty cells remain genuinely empty.
 *
 * Note: group-widget and dual-widget tiles are packed here as opaque tiles. They are
 * transformed (split / exploded into zones) in their own later stages, not here.
 */

type SpacerKind = 'app' | 'widget' | 'row';

/** If the item is a legacy spacer, return its size kind; otherwise null. */
const spacerKind = (item: DashboardItem): SpacerKind | null => {
    switch (item.type) {
        case ITEM_TYPE.BLANK_APP: return 'app';
        case ITEM_TYPE.BLANK_WIDGET: return 'widget';
        case ITEM_TYPE.BLANK_ROW: return 'row';
        case ITEM_TYPE.PLACEHOLDER: {
            const size = item.config?.placeholderSize;
            return size === 'row' ? 'row' : size === 'widget' ? 'widget' : 'app';
        }
        default:
            return null;
    }
};

/** The flow footprint (columns × row-units) an item occupied under the old layout. */
const itemSpan = (item: DashboardItem, device: Device): { w: number; h: number } => {
    const cols = GRID_COLS[device];
    switch (spacerKind(item)) {
        case 'app':
            return getTileDefaults(ITEM_TYPE.APP_SHORTCUT, device);
        case 'widget':
            // Generic 1/3-width widget footprint (full width on mobile).
            return getTileDefaults(ITEM_TYPE.NOTES_WIDGET, device);
        case 'row':
            return { w: cols, h: getTileDefaults(ITEM_TYPE.NOTES_WIDGET, device).h };
        default:
            return getTileDefaults(item.type, device);
    }
};

/**
 * True if this device array still needs migrating: any non-spacer item lacks `.layout`.
 * Already-migrated arrays are returned untouched by migrateFlowLayout (idempotent).
 */
export const needsMigration = (items: DashboardItem[]): boolean =>
    items.some((item) => !isSpacerType(item.type) && !item.layout);

/**
 * Assign x/y/w/h to every item by replaying the flow. Does NOT drop spacers — that is done
 * by migrateFlowLayout so the packing step stays a pure, testable placement.
 */
export const packDeviceLayout = (items: DashboardItem[], device: Device): DashboardItem[] => {
    const cols = GRID_COLS[device];
    let cursorX = 0;
    let shelfY = 0;
    let shelfMaxH = 0;

    return items.map((item) => {
        const { h } = itemSpan(item, device);
        const w = Math.min(itemSpan(item, device).w, cols);

        // Wrap to a new shelf when the item won't fit on the current one.
        if (cursorX > 0 && cursorX + w > cols) {
            shelfY += shelfMaxH;
            cursorX = 0;
            shelfMaxH = 0;
        }

        const layout = { x: cursorX, y: shelfY, w, h };
        cursorX += w;
        shelfMaxH = Math.max(shelfMaxH, h);

        return { ...item, layout };
    });
};

/**
 * Migrate one device's ordered tile array to free-2-D coordinates.
 * @param opts.dropSpacers drop legacy spacer tiles after packing (default true).
 */
export const migrateFlowLayout = (
    items: DashboardItem[],
    device: Device,
    opts: { dropSpacers?: boolean } = {},
): DashboardItem[] => {
    const { dropSpacers = true } = opts;
    if (!needsMigration(items)) {
        return items;
    }
    const packed = packDeviceLayout(items, device);
    return dropSpacers ? packed.filter((item) => !isSpacerType(item.type)) : packed;
};
