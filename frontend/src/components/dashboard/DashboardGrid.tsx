import { Box, useMediaQuery } from '@mui/material';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import RGL, { WidthProvider, type Layout } from 'react-grid-layout';
import shortid from 'shortid';

import './dashboardGrid.css';
import { ClipboardTray } from './ClipboardTray';
import { DashboardTile } from './DashboardTile';
import { SelectionActionBar } from './SelectionActionBar';
import { useAppContext } from '../../context/useAppContext';
import { DashboardItem, ITEM_TYPE } from '../../types';
import { AddEditForm } from '../forms/AddEditForm/AddEditForm';
import { CenteredModal } from '../modals/CenteredModal';
import { ConfirmationOptions, PopupManager } from '../modals/PopupManager';
import { ToastManager } from '../toast/ToastManager';
import { theme } from '../../theme/theme';
import {
    GRID_COLS,
    GRID_CONTAINER_PADDING,
    GRID_MARGIN,
    ROW_HEIGHT,
    getTileSizing,
    isSpacerType,
    type Device,
} from '../../constants/gridLayout';
import { migrateFlowLayout } from '../../utils/migrateFlowLayout';
import { resolveClusterSwap } from '../../utils/resolveClusterSwap';
import { fitBoxAt } from '../../utils/fitBoxAt';

const GridLayout = WidthProvider(RGL);

type Box = { x: number; y: number; w: number; h: number };
const rectsOverlap = (a: Box, b: Box): boolean =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// Convert a drag event's pointer position into a grid cell (top-left anchor), mirroring RGL's
// own math, so we can compute the fitted drop size during dragover before RGL reports a position.
const computeDropCell = (e: { clientX: number; clientY: number }, cols: number): { x: number; y: number } | null => {
    const gridEl = document.querySelector('.dashboard-grid-layout') as HTMLElement | null;
    if (!gridEl) return null;
    const rect = gridEl.getBoundingClientRect();
    const [mx, my] = GRID_MARGIN;
    const [px, py] = GRID_CONTAINER_PADDING;
    const colWidth = (rect.width - mx * (cols - 1) - px * 2) / cols;
    const x = Math.round((e.clientX - rect.left - px) / (colWidth + mx));
    const y = Math.round((e.clientY - rect.top - py) / (ROW_HEIGHT + my));
    return { x: Math.max(0, Math.min(cols - 1, x)), y: Math.max(0, y) };
};

export const DashboardGrid: React.FC = () => {
    const [selectedItem, setSelectedItem] = useState<DashboardItem | null>(null);
    const [openEditModal, setOpenEditModal] = useState(false);
    // Multi-select (edit mode only). Set of selected tile ids; scoped here so toggling it
    // re-renders this grid but not the memoized tiles (their polling widgets stay put).
    const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
    // Clipboard tray: tiles that were cut/copied out of the grid, awaiting placement.
    const [trayItems, setTrayItems] = useState<DashboardItem[]>([]);
    // Size of the tray chip currently being dragged onto the grid (drives RGL's drop placeholder).
    const [dropSize, setDropSize] = useState<{ w: number; h: number }>({ w: 4, h: 2 });
    const draggingTrayId = useRef<string | null>(null);
    const { dashboardLayout, setDashboardLayout, refreshDashboard, editMode, isAdmin, saveLayout } = useAppContext();

    // Match the breakpoint AppContextProvider uses to pick the desktop vs mobile array.
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const device: Device = isMobile ? 'mobile' : 'desktop';
    const cols = GRID_COLS[device];

    // Items to render: filter admin-only for non-admins, then migrate the flow layout into
    // explicit coordinates (idempotent once items already carry `.layout`). Spacers are dropped.
    const items = useMemo(() => {
        const visible = isAdmin
            ? dashboardLayout
            : dashboardLayout.filter((item) => item.adminOnly !== true);
        const migrated = migrateFlowLayout(visible, device);
        return migrated.filter((item) => !isSpacerType(item.type));
    }, [dashboardLayout, isAdmin, device]);

    // Build the react-grid-layout descriptor for every tile.
    const layout: Layout[] = useMemo(
        () =>
            items.map((item) => {
                const sizing = getTileSizing(item.type, device);
                const l = item.layout ?? { x: 0, y: 0, w: sizing.w, h: sizing.h };
                return {
                    i: item.id,
                    x: l.x,
                    y: l.y,
                    w: l.w,
                    h: l.h,
                    minW: sizing.minW,
                    minH: sizing.minH,
                    maxW: sizing.maxW,
                    maxH: sizing.maxH,
                };
            }),
        [items, device],
    );

    // Persist a drag/resize: merge react-grid-layout's new coordinates back onto the items,
    // update state (so the rendered layout stays in sync) and save the current device's array.
    // Fires once per gesture via onDragStop/onResizeStop — no debounce needed.
    const commitLayout = useCallback((next: Layout[]) => {
        const byId = new Map(next.map((l) => [l.i, l]));
        const updated = items.map((item) => {
            const l = byId.get(item.id);
            return l ? { ...item, layout: { x: l.x, y: l.y, w: l.w, h: l.h } } : item;
        });
        setDashboardLayout(updated);
        saveLayout(updated);
    }, [items, setDashboardLayout, saveLayout]);

    // Snapshot of the layout when a gesture begins, so a rejected drag/resize can snap back.
    const preGestureLayout = useRef<DashboardItem[]>([]);
    const snapshotLayout = useCallback(() => {
        preGestureLayout.current = items;
    }, [items]);

    // If the tile that starts dragging is part of a multi-selection, the whole set moves together.
    const groupDragIds = useRef<Set<string> | null>(null);
    // Live preview context for a group drag: geometry + members captured at drag start so onDrag
    // can move the other selected tiles imperatively (no React re-render) and draw a ghost.
    type GroupDragCtx = {
        originX: number; originY: number;
        colStep: number; rowStep: number; gridLeft: number; gridTop: number; padX: number; padY: number;
        bbox: { minX: number; minY: number; maxX: number; maxY: number };
        members: { id: string; x: number; y: number; w: number; h: number }[];
        baseTransforms: Map<string, string>;
    };
    const groupDragCtx = useRef<GroupDragCtx | null>(null);
    const [groupGhost, setGroupGhost] = useState<{ left: number; top: number; width: number; height: number; valid: boolean } | null>(null);

    const tileEl = (id: string) => document.querySelector(`.rgl-tile[data-tile-id="${id}"]`) as HTMLElement | null;

    const handleDragStart = useCallback((_l: Layout[], oldItem: Layout) => {
        preGestureLayout.current = items;
        const isGroup = selectedIds.has(oldItem.i) && selectedIds.size > 1;
        groupDragIds.current = isGroup ? new Set(selectedIds) : null;
        groupDragCtx.current = null;
        if (!isGroup) return;

        const gridEl = document.querySelector('.dashboard-grid-layout') as HTMLElement | null;
        if (!gridEl) return;
        const rect = gridEl.getBoundingClientRect();
        const [mx, my] = GRID_MARGIN;
        const [px, py] = GRID_CONTAINER_PADDING;
        const colWidth = (rect.width - mx * (cols - 1) - px * 2) / cols;
        const members = layout
            .filter((l) => selectedIds.has(l.i))
            .map((l) => ({ id: l.i, x: l.x, y: l.y, w: l.w, h: l.h }));
        const bbox = {
            minX: Math.min(...members.map((m) => m.x)),
            minY: Math.min(...members.map((m) => m.y)),
            maxX: Math.max(...members.map((m) => m.x + m.w)),
            maxY: Math.max(...members.map((m) => m.y + m.h)),
        };
        const baseTransforms = new Map<string, string>();
        members.forEach((m) => {
            if (m.id === oldItem.i) return;
            const el = tileEl(m.id);
            if (el) baseTransforms.set(m.id, el.style.transform);
        });
        groupDragCtx.current = {
            originX: oldItem.x, originY: oldItem.y,
            colStep: colWidth + mx, rowStep: ROW_HEIGHT + my,
            gridLeft: rect.left, gridTop: rect.top, padX: px, padY: py,
            bbox, members, baseTransforms,
        };
    }, [items, selectedIds, layout, cols]);

    // Live group-drag preview: nudge the other selected tiles by the current delta and draw the
    // bounding-box ghost (green if the whole group fits at the target, red if it would be rejected).
    const handleDrag = useCallback((_l: Layout[], _o: Layout, dragged: Layout) => {
        const ctx = groupDragCtx.current;
        if (!ctx) return;
        const dx = dragged.x - ctx.originX;
        const dy = dragged.y - ctx.originY;
        const dxpx = dx * ctx.colStep;
        const dypx = dy * ctx.rowStep;

        ctx.members.forEach((m) => {
            if (m.id === dragged.i) return;
            const el = tileEl(m.id);
            if (el) {
                el.style.transform = `${ctx.baseTransforms.get(m.id) ?? ''} translate(${dxpx}px, ${dypx}px)`;
                el.style.opacity = '0.7';
            }
        });

        const nonGroup = layout.filter((l) => !groupDragIds.current?.has(l.i));
        const valid = ctx.members.every((m) => {
            const nx = m.x + dx;
            const ny = m.y + dy;
            if (nx < 0 || ny < 0 || nx + m.w > cols) return false;
            return !nonGroup.some((o) => rectsOverlap(o, { x: nx, y: ny, w: m.w, h: m.h }));
        });

        setGroupGhost({
            left: ctx.gridLeft + ctx.padX + (ctx.bbox.minX + dx) * ctx.colStep,
            top: ctx.gridTop + ctx.padY + (ctx.bbox.minY + dy) * ctx.rowStep,
            width: (ctx.bbox.maxX - ctx.bbox.minX) * ctx.colStep - GRID_MARGIN[0],
            height: (ctx.bbox.maxY - ctx.bbox.minY) * ctx.rowStep - GRID_MARGIN[1],
            valid,
        });
    }, [layout, cols]);

    // Clear the live group-drag preview (restore transforms/opacity and hide the ghost).
    const clearGroupPreview = useCallback(() => {
        const ctx = groupDragCtx.current;
        if (ctx) {
            ctx.members.forEach((m) => {
                const el = tileEl(m.id);
                if (el) {
                    el.style.transform = ctx.baseTransforms.get(m.id) ?? el.style.transform;
                    el.style.opacity = '';
                }
            });
        }
        groupDragCtx.current = null;
        setGroupGhost(null);
    }, []);

    // Rubber-band selection: drag on empty grid space to select the tiles the rectangle touches.
    // Cmd/Ctrl/Shift adds to the current selection instead of replacing it.
    const [marqueeBox, setMarqueeBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
    const marqueePts = useRef<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
    const marqueeBase = useRef<Set<string>>(new Set());
    const onGridMouseDown = useCallback((e: React.MouseEvent) => {
        if (!editMode || e.button !== 0) return;
        const target = e.target as HTMLElement;
        // Only start on empty background — not a tile, the action bar/tray, or a control.
        if (target.closest('.rgl-tile, .MuiPaper-root, button, a')) return;

        const additive = e.metaKey || e.ctrlKey || e.shiftKey;
        marqueeBase.current = additive ? new Set(selectedIds) : new Set();
        marqueePts.current = { x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY };
        setMarqueeBox({ left: e.clientX, top: e.clientY, width: 0, height: 0 });

        const onMove = (ev: MouseEvent) => {
            const m = marqueePts.current;
            if (!m) return;
            m.x1 = ev.clientX;
            m.y1 = ev.clientY;
            setMarqueeBox({
                left: Math.min(m.x0, m.x1),
                top: Math.min(m.y0, m.y1),
                width: Math.abs(m.x1 - m.x0),
                height: Math.abs(m.y1 - m.y0),
            });
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            const m = marqueePts.current;
            marqueePts.current = null;
            setMarqueeBox(null);
            if (!m) return;
            const r = {
                left: Math.min(m.x0, m.x1), right: Math.max(m.x0, m.x1),
                top: Math.min(m.y0, m.y1), bottom: Math.max(m.y0, m.y1),
            };
            // A negligible drag is just a background click: clear selection unless additive.
            if (r.right - r.left < 4 && r.bottom - r.top < 4) {
                if (!additive) setSelectedIds(new Set());
                return;
            }
            const hit = new Set(marqueeBase.current);
            document.querySelectorAll('.rgl-tile[data-tile-id]').forEach((el) => {
                const b = el.getBoundingClientRect();
                if (!(b.right < r.left || b.left > r.right || b.bottom < r.top || b.top > r.bottom)) {
                    hit.add((el as HTMLElement).dataset.tileId as string);
                }
            });
            setSelectedIds(hit);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [editMode, selectedIds]);

    // Toggle a tile's selection. Plain = select only this tile; additive (Cmd/Ctrl/Shift) =
    // add/remove from the current selection.
    const toggleSelection = useCallback((id: string, additive: boolean) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (additive) {
                if (next.has(id)) next.delete(id);
                else next.add(id);
            } else if (next.size === 1 && next.has(id)) {
                next.clear();
            } else {
                next.clear();
                next.add(id);
            }
            return next;
        });
    }, []);

    // Force react-grid-layout to reconcile back to the pre-gesture positions. RGL compares the
    // incoming `layout` prop against the last one it saw; pushing the (moved) layout first makes
    // that stored copy differ from the pre-gesture layout, so the revert actually re-syncs.
    const revertGesture = useCallback((moved: DashboardItem[]) => {
        setDashboardLayout(moved);
        const preGesture = preGestureLayout.current;
        setTimeout(() => setDashboardLayout(preGesture), 0);
    }, [setDashboardLayout]);

    // Drag drop: move a multi-selection as a group, else try a rigid cluster swap. Persist on
    // success; snap back on rejection.
    const handleDragStop = useCallback((_next: Layout[], _old: Layout, dropped: Layout, _ph: Layout, e: MouseEvent) => {
        const group = groupDragIds.current;
        groupDragIds.current = null;
        clearGroupPreview();
        const tiles = layout.map((l) => ({ id: l.i, x: l.x, y: l.y, w: l.w, h: l.h }));
        const origin = tiles.find((t) => t.id === dropped.i);

        // No movement: react-draggable fires start/stop even for a plain click, and it suppresses
        // the trailing DOM click — so treat a zero-move drop as a selection click here. (Clicks on
        // the edit menu never reach this: draggableCancel stops react-draggable on those.)
        if (origin && origin.x === dropped.x && origin.y === dropped.y) {
            const target = e?.target as HTMLElement | undefined;
            if (target?.closest('button, a, input, textarea, [role="button"]')) return;
            toggleSelection(dropped.i, !!(e && (e.metaKey || e.ctrlKey || e.shiftKey)));
            return;
        }

        // Group move: translate every selected tile by the same delta as a rigid block. Valid only
        // if all stay in bounds and none overlaps a non-selected tile; otherwise snap the group back.
        if (group && origin) {
            const dx = dropped.x - origin.x;
            const dy = dropped.y - origin.y;
            const nonGroup = tiles.filter((t) => !group.has(t.id));
            const moves: Record<string, { x: number; y: number }> = {};
            let valid = true;
            for (const t of tiles) {
                if (!group.has(t.id)) continue;
                const nx = t.x + dx;
                const ny = t.y + dy;
                if (nx < 0 || ny < 0 || nx + t.w > cols) { valid = false; break; }
                if (nonGroup.some((o) => rectsOverlap(o, { x: nx, y: ny, w: t.w, h: t.h }))) { valid = false; break; }
                moves[t.id] = { x: nx, y: ny };
            }
            if (valid) {
                const updated = items.map((item) =>
                    moves[item.id] && item.layout
                        ? { ...item, layout: { ...item.layout, x: moves[item.id].x, y: moves[item.id].y } }
                        : item,
                );
                setDashboardLayout(updated);
                saveLayout(updated);
            } else {
                const moved = items.map((item) =>
                    item.id === dropped.i && item.layout
                        ? { ...item, layout: { ...item.layout, x: dropped.x, y: dropped.y } }
                        : item,
                );
                revertGesture(moved);
            }
            return;
        }

        const swap = resolveClusterSwap(tiles, dropped.i, dropped.x, dropped.y, cols);

        if (swap) {
            const updated = items.map((item) => {
                const p = swap[item.id];
                return p && item.layout ? { ...item, layout: { ...item.layout, x: p.x, y: p.y } } : item;
            });
            setDashboardLayout(updated);
            saveLayout(updated);
            return;
        }

        const moved = items.map((item) =>
            item.id === dropped.i && item.layout
                ? { ...item, layout: { ...item.layout, x: dropped.x, y: dropped.y } }
                : item,
        );
        revertGesture(moved);
    }, [layout, items, cols, setDashboardLayout, saveLayout, revertGesture, toggleSelection, clearGroupPreview]);

    // Resize: reject a resize that would overlap another tile; otherwise persist.
    const handleResizeStop = useCallback((next: Layout[], _old: Layout, resized: Layout) => {
        const collides = next.some((l) => l.i !== resized.i && rectsOverlap(l, resized));
        if (!collides) {
            commitLayout(next);
            return;
        }
        const moved = items.map((item) =>
            item.id === resized.i && item.layout
                ? { ...item, layout: { ...item.layout, w: resized.w, h: resized.h } }
                : item,
        );
        revertGesture(moved);
    }, [items, commitLayout, revertGesture]);

    const handleDeselect = useCallback(() => setSelectedIds(new Set()), []);

    // Cut: lift the selected tiles out of the grid into the tray (freeing their cells).
    const handleCut = useCallback(() => {
        const toCut = items.filter((i) => selectedIds.has(i.id));
        if (!toCut.length) return;
        setTrayItems((prev) => [...prev, ...toCut]);
        const cutIds = new Set(toCut.map((i) => i.id));
        const remaining = dashboardLayout.filter((i) => !cutIds.has(i.id));
        setDashboardLayout(remaining);
        saveLayout(remaining);
        setSelectedIds(new Set());
    }, [items, selectedIds, dashboardLayout, setDashboardLayout, saveLayout]);

    // Copy: put fresh-id clones of the selected tiles in the tray; originals stay in place.
    const handleCopy = useCallback(() => {
        const clones = items
            .filter((i) => selectedIds.has(i.id))
            .map((i) => ({ ...(JSON.parse(JSON.stringify(i)) as DashboardItem), id: `item-${shortid.generate()}` }));
        if (!clones.length) return;
        setTrayItems((prev) => [...prev, ...clones]);
        setSelectedIds(new Set());
    }, [items, selectedIds]);

    const handleDeleteSelected = useCallback(() => {
        const ids = new Set(selectedIds);
        if (!ids.size) return;
        PopupManager.deleteConfirmation({
            title: `Delete ${ids.size} item${ids.size > 1 ? 's' : ''}?`,
            confirmAction: async () => {
                const remaining = dashboardLayout.filter((i) => !ids.has(i.id));
                setDashboardLayout(remaining);
                saveLayout(remaining);
                setSelectedIds(new Set());
                ToastManager.success(`${ids.size} item${ids.size > 1 ? 's' : ''} deleted`);
            },
        });
    }, [selectedIds, dashboardLayout, setDashboardLayout, saveLayout]);

    // Largest size a tray tile can take when dropped at (x, y): its natural size shrunk to the
    // free area at the cursor, floored at the type's min size. null => won't fit at all.
    const fitTrayDrop = useCallback((item: DashboardItem, x: number, y: number): { w: number; h: number } | null => {
        if (!item.layout) return null;
        const sizing = getTileSizing(item.type, device);
        const occupied = items.map((i) => i.layout).filter(Boolean) as Box[];
        return fitBoxAt(occupied, x, y, item.layout.w, item.layout.h, sizing.minW, sizing.minH, cols);
    }, [items, cols, device]);

    const handleChipDragStart = useCallback((item: DashboardItem, e: React.DragEvent) => {
        draggingTrayId.current = item.id;
        if (item.layout) setDropSize({ w: item.layout.w, h: item.layout.h });
        e.dataTransfer.setData('text/plain', item.id);
        e.dataTransfer.effectAllowed = 'move';
    }, []);

    const handleChipDragEnd = useCallback(() => {
        draggingTrayId.current = null;
    }, []);

    // While a chip is dragged over the grid, resize the drop ghost to the largest area that fits
    // at the cursor (so a big widget previews shrinking into a small gap). false => can't fit here.
    const handleDropDragOver = useCallback((e: { clientX: number; clientY: number }) => {
        const id = draggingTrayId.current;
        const item = id ? trayItems.find((t) => t.id === id) : undefined;
        if (!item?.layout) return dropSize;
        const cell = computeDropCell(e, cols);
        if (!cell) return { w: item.layout.w, h: item.layout.h };
        const fit = fitTrayDrop(item, cell.x, cell.y);
        return fit ?? false;
    }, [trayItems, cols, dropSize, fitTrayDrop]);

    // RGL fires this when a tray chip is dropped onto the grid. Place at the fitted size.
    const handleGridDrop = useCallback((_layout: Layout[], dropItem: Layout) => {
        const id = draggingTrayId.current;
        draggingTrayId.current = null;
        if (!id) return;
        const item = trayItems.find((t) => t.id === id);
        if (!item) return;
        const fit = fitTrayDrop(item, dropItem.x, dropItem.y);
        if (!fit) {
            ToastManager.error('No room to place that there');
            return;
        }
        const placed = { ...item, layout: { x: dropItem.x, y: dropItem.y, w: fit.w, h: fit.h } };
        const updated = [...dashboardLayout, placed];
        setDashboardLayout(updated);
        saveLayout(updated);
        setTrayItems((prev) => prev.filter((t) => t.id !== id));
    }, [trayItems, dashboardLayout, fitTrayDrop, setDashboardLayout, saveLayout]);

    // Return remaining tray items to the grid (stacked below all content) so nothing is lost.
    const flushTrayToGrid = useCallback(() => {
        if (!trayItems.length) return;
        const boxes = dashboardLayout.map((i) => i.layout).filter(Boolean) as Box[];
        let y = boxes.reduce((m, b) => Math.max(m, b.y + b.h), 0);
        const appended = trayItems.map((item) => {
            const w = item.layout?.w ?? 12;
            const h = item.layout?.h ?? 3;
            const placed = { ...item, layout: { x: 0, y, w, h } };
            y += h;
            return placed;
        });
        setDashboardLayout([...dashboardLayout, ...appended]);
        saveLayout([...dashboardLayout, ...appended]);
        setTrayItems([]);
    }, [trayItems, dashboardLayout, setDashboardLayout, saveLayout]);

    // Selection + tray are edit-mode concepts; clear selection and return tray items on exit.
    useEffect(() => {
        if (!editMode) {
            setSelectedIds(new Set());
            flushTrayToGrid();
        }
    }, [editMode, flushTrayToGrid]);

    const handleDelete = useCallback((id: string) => {
        const itemToDelete = dashboardLayout.find(item => item.id === id);
        const itemName = itemToDelete?.label || itemToDelete?.config?.displayName || 'Item';

        const options: ConfirmationOptions = {
            title: 'Delete Item?',
            confirmAction: async () => {
                const updatedLayout = dashboardLayout.filter((item) => item.id !== id);
                setDashboardLayout(updatedLayout);
                saveLayout(updatedLayout);

                ToastManager.success(`${itemName} deleted successfully`);
            }
        };

        PopupManager.deleteConfirmation(options);
    }, [dashboardLayout, setDashboardLayout, saveLayout]);

    const handleEdit = useCallback((item: DashboardItem) => {
        setSelectedItem(item);
        setOpenEditModal(true);
    }, []);

    const handleDuplicate = useCallback(async (item: DashboardItem) => {
        // Deep clone the item
        const duplicatedItem: DashboardItem = JSON.parse(JSON.stringify(item));

        // Generate a new unique ID for the main item
        const newItemId = shortid.generate();
        duplicatedItem.id = newItemId;

        // Helper function to preserve sensitive data flags for any config
        const preserveSensitiveDataFlags = (config: any) => {
            if (!config) return config;

            const preservedConfig = { ...config };

            // Preserve Pi-hole sensitive data flags
            if (config._hasApiToken) {
                preservedConfig._hasApiToken = true;
            }
            if (config._hasPassword) {
                preservedConfig._hasPassword = true;
            }

            // Preserve AdGuard Home sensitive data flags
            if (config._hasUsername) {
                preservedConfig._hasUsername = true;
            }

            return preservedConfig;
        };

        // Add duplication metadata to help backend copy credentials
        if (duplicatedItem.config) {
            duplicatedItem.config._duplicatedFrom = item.id;
        } else {
            duplicatedItem.config = { _duplicatedFrom: item.id };
        }

        // Handle different widget types with sensitive data
        if (duplicatedItem.config) {
            // Handle regular widgets with sensitive data
            duplicatedItem.config = preserveSensitiveDataFlags(duplicatedItem.config);

            // Handle dual widgets with sensitive data
            if (item.type === ITEM_TYPE.DUAL_WIDGET && duplicatedItem.config) {
                if (duplicatedItem.config.topWidget?.config) {
                    duplicatedItem.config.topWidget.config = preserveSensitiveDataFlags(duplicatedItem.config.topWidget.config);
                }
                if (duplicatedItem.config.bottomWidget?.config) {
                    duplicatedItem.config.bottomWidget.config = preserveSensitiveDataFlags(duplicatedItem.config.bottomWidget.config);
                }
            }

            // Handle group widgets
            if (item.type === ITEM_TYPE.GROUP_WIDGET && duplicatedItem.config?.items && item.config?.items) {
                // Ensure each item in the group gets a new ID
                duplicatedItem.config.items = item.config.items.map((groupItem: any) => {
                    const newGroupItemId = shortid.generate();

                    return {
                        ...groupItem,
                        id: newGroupItemId // New ID for each group item
                    };
                });
            }
        }

        // Insert the duplicated item after the original
        const index = dashboardLayout.findIndex((i) => i.id === item.id);
        const updatedLayout = [...dashboardLayout];
        updatedLayout.splice(index + 1, 0, duplicatedItem);

        setDashboardLayout(updatedLayout);

        // Refresh the dashboard to get the updated config with processed credentials
        await refreshDashboard();

        // Add a longer delay to ensure config propagates to all widgets and backend processing is complete
        await new Promise(resolve => setTimeout(resolve, 500));
    }, [dashboardLayout, setDashboardLayout, refreshDashboard]);


    return (
        <>
            <Box
                onMouseDown={onGridMouseDown}
                sx={{ width: '100%', maxWidth: '100vw', boxSizing: 'border-box', pb: 4, minHeight: editMode ? 'calc(100vh - 64px)' : undefined }}
            >
                <GridLayout
                    className='dashboard-grid-layout'
                    layout={layout}
                    cols={cols}
                    rowHeight={ROW_HEIGHT}
                    margin={GRID_MARGIN}
                    containerPadding={GRID_CONTAINER_PADDING}
                    isDraggable={editMode}
                    isResizable={editMode}
                    onDragStart={handleDragStart}
                    onDrag={handleDrag}
                    onResizeStart={snapshotLayout}
                    onDragStop={handleDragStop}
                    onResizeStop={handleResizeStop}
                    draggableCancel='.MuiIconButton-root, .no-drag'
                    compactType={null}
                    allowOverlap
                    isBounded={false}
                    isDroppable={editMode}
                    droppingItem={{ i: '__tray_drop__', w: dropSize.w, h: dropSize.h }}
                    onDropDragOver={handleDropDragOver}
                    onDrop={handleGridDrop}
                >
                    {items.map((item) => {
                        const isSelected = editMode && selectedIds.has(item.id);
                        return (
                        <div
                            key={item.id}
                            data-tile-id={item.id}
                            className={isSelected ? 'rgl-tile tile-selected' : 'rgl-tile'}
                        >
                            <DashboardTile
                                item={item}
                                editMode={editMode}
                                onDelete={handleDelete}
                                onEdit={handleEdit}
                                onDuplicate={handleDuplicate}
                            />
                            {isSelected && <span className='tile-select-badge' aria-hidden>✓</span>}
                        </div>
                        );
                    })}
                </GridLayout>
            </Box>

            {editMode && (
                <>
                    <SelectionActionBar
                        count={selectedIds.size}
                        onCut={handleCut}
                        onCopy={handleCopy}
                        onDelete={handleDeleteSelected}
                        onDeselect={handleDeselect}
                    />
                    <ClipboardTray
                        items={trayItems}
                        onChipDragStart={handleChipDragStart}
                        onChipDragEnd={handleChipDragEnd}
                    />
                    {marqueeBox && (
                        <div
                            className='marquee-rect'
                            style={{ left: marqueeBox.left, top: marqueeBox.top, width: marqueeBox.width, height: marqueeBox.height }}
                        />
                    )}
                    {groupGhost && (
                        <div
                            className={groupGhost.valid ? 'group-drag-ghost valid' : 'group-drag-ghost invalid'}
                            style={{ left: groupGhost.left, top: groupGhost.top, width: groupGhost.width, height: groupGhost.height }}
                        />
                    )}
                </>
            )}

            <CenteredModal open={openEditModal} handleClose={() => setOpenEditModal(false)} title='Edit Item'>
                <AddEditForm handleClose={() => setOpenEditModal(false)} existingItem={selectedItem}/>
            </CenteredModal>
        </>
    );
};
