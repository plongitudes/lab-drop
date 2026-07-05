import { Box, useMediaQuery } from '@mui/material';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import RGL, { WidthProvider, type Layout } from 'react-grid-layout';
import shortid from 'shortid';

import './dashboardGrid.css';
import { DashboardTile } from './DashboardTile';
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

const GridLayout = WidthProvider(RGL);

const rectsOverlap = (a: Layout, b: Layout): boolean =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export const DashboardGrid: React.FC = () => {
    const [selectedItem, setSelectedItem] = useState<DashboardItem | null>(null);
    const [openEditModal, setOpenEditModal] = useState(false);
    // Multi-select (edit mode only). Set of selected tile ids; scoped here so toggling it
    // re-renders this grid but not the memoized tiles (their polling widgets stay put).
    const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
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

    // Drag drop: try a rigid cluster swap. On success persist it; on rejection snap back.
    const handleDragStop = useCallback((_next: Layout[], _old: Layout, dropped: Layout, _ph: Layout, e: MouseEvent) => {
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
    }, [layout, items, cols, setDashboardLayout, saveLayout, revertGesture, toggleSelection]);

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

    // Selection is an edit-mode concept only; clear it whenever edit mode turns off.
    useEffect(() => {
        if (!editMode) setSelectedIds(new Set());
    }, [editMode]);

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
            <Box sx={{ width: '100%', maxWidth: '100vw', boxSizing: 'border-box', pb: 4 }}>
                <GridLayout
                    className='dashboard-grid-layout'
                    layout={layout}
                    cols={cols}
                    rowHeight={ROW_HEIGHT}
                    margin={GRID_MARGIN}
                    containerPadding={GRID_CONTAINER_PADDING}
                    isDraggable={editMode}
                    isResizable={editMode}
                    onDragStart={snapshotLayout}
                    onResizeStart={snapshotLayout}
                    onDragStop={handleDragStop}
                    onResizeStop={handleResizeStop}
                    draggableCancel='.MuiIconButton-root, .no-drag'
                    compactType={null}
                    allowOverlap
                    isBounded={false}
                >
                    {items.map((item) => {
                        const isSelected = editMode && selectedIds.has(item.id);
                        return (
                        <div
                            key={item.id}
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

            <CenteredModal open={openEditModal} handleClose={() => setOpenEditModal(false)} title='Edit Item'>
                <AddEditForm handleClose={() => setOpenEditModal(false)} existingItem={selectedItem}/>
            </CenteredModal>
        </>
    );
};
