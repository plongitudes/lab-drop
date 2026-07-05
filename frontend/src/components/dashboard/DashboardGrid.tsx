import { Box, useMediaQuery } from '@mui/material';
import React, { useCallback, useMemo, useState } from 'react';
import RGL, { WidthProvider, type Layout } from 'react-grid-layout';
import shortid from 'shortid';

import './dashboardGrid.css';
import { SortableNzbget } from './sortable-items/widgets/SortableNzbget';
import { SortableSabnzbd } from './sortable-items/widgets/SortableSabnzbd';
import { useAppContext } from '../../context/useAppContext';
import { DashboardItem, DOWNLOAD_CLIENT_TYPE, ITEM_TYPE, TORRENT_CLIENT_TYPE } from '../../types';
import { AddEditForm } from '../forms/AddEditForm/AddEditForm';
import { CenteredModal } from '../modals/CenteredModal';
import { ConfirmationOptions, PopupManager } from '../modals/PopupManager';
import { ToastManager } from '../toast/ToastManager';
import { SortableAppShortcut } from './sortable-items/apps/SortableAppShortcut';
import { SortableAdGuard } from './sortable-items/widgets/SortableAdGuard';
import { SortableDateTimeWidget } from './sortable-items/widgets/SortableDateTime';
import { SortableDeluge } from './sortable-items/widgets/SortableDeluge';
import { SortableDiskMonitor } from './sortable-items/widgets/SortableDiskMonitor';
import { SortableDualWidget } from './sortable-items/widgets/SortableDualWidget';
import { SortableGroupWidget } from './sortable-items/widgets/SortableGroupWidget';
import { SortableMediaRequestManager } from './sortable-items/widgets/SortableMediaRequestManager';
import { SortableMediaServer } from './sortable-items/widgets/SortableMediaServer';
import { SortableNotes } from './sortable-items/widgets/SortableNotes';
import { SortablePihole } from './sortable-items/widgets/SortablePihole';
import { SortableQBittorrent } from './sortable-items/widgets/SortableQBittorrent';
import { SortableRadarr } from './sortable-items/widgets/SortableRadarr';
import { SortableSonarr } from './sortable-items/widgets/SortableSonarr';
import { SortableSystemMonitorWidget } from './sortable-items/widgets/SortableSystemMonitor';
import { SortableTransmission } from './sortable-items/widgets/SortableTransmission';
import { SortableWeatherWidget } from './sortable-items/widgets/SortableWeather';
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

const GridLayout = WidthProvider(RGL);

export const DashboardGrid: React.FC = () => {
    const [selectedItem, setSelectedItem] = useState<DashboardItem | null>(null);
    const [openEditModal, setOpenEditModal] = useState(false);
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

    const handleDelete = (id: string) => {
        const itemToDelete = dashboardLayout.find(item => item.id === id);
        const itemName = itemToDelete?.label || itemToDelete?.config?.displayName || 'Item';

        const options: ConfirmationOptions = {
            title: 'Delete Item?',
            confirmAction: async () => {
                const updatedLayout = dashboardLayout.filter((item) => item.id !== id);
                setDashboardLayout(updatedLayout);
                // saveLayout is wired for drag/resize persistence in a later stage.

                ToastManager.success(`${itemName} deleted successfully`);
            }
        };

        PopupManager.deleteConfirmation(options);
    };

    const handleEdit = (item: DashboardItem) => {
        setSelectedItem(item);
        setOpenEditModal(true);
    };

    const handleDuplicate = async (item: DashboardItem) => {
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
    };

    // Helper function to create a proper DateTimeConfig
    const createDateTimeConfig = (config: any) => {
        return {
            location: config?.location || null,
            timezone: config?.timezone || undefined,
            use24Hour: config?.use24Hour || false
        };
    };

    // Helper function to render download client components
    const renderDownloadClient = (item: any) => {
        const clientType = item.config?.clientType;
        const key = item.id;
        const commonProps = {
            id: item.id,
            editMode,
            config: item.config,
            onDelete: () => handleDelete(item.id),
            onEdit: () => handleEdit(item),
            onDuplicate: () => handleDuplicate(item),
        };

        // Handle all download client types for DOWNLOAD_CLIENT
        if (item.type === ITEM_TYPE.DOWNLOAD_CLIENT) {
            if (clientType === DOWNLOAD_CLIENT_TYPE.DELUGE) {
                return <SortableDeluge key={key} {...commonProps} />;
            }
            if (clientType === DOWNLOAD_CLIENT_TYPE.TRANSMISSION) {
                return <SortableTransmission key={key} {...commonProps} />;
            }
            if (clientType === DOWNLOAD_CLIENT_TYPE.SABNZBD) {
                return <SortableSabnzbd key={key} {...commonProps} />;
            }
            if (clientType === DOWNLOAD_CLIENT_TYPE.NZBGET) {
                return <SortableNzbget key={key} {...commonProps} />;
            }
            // Default to qBittorrent for DOWNLOAD_CLIENT
            return <SortableQBittorrent key={key} {...commonProps} />;
        }

        // Handle legacy TORRENT_CLIENT - only torrent clients (no SABnzbd)
        if (item.type === ITEM_TYPE.TORRENT_CLIENT) {
            if (clientType === TORRENT_CLIENT_TYPE.DELUGE) {
                return <SortableDeluge key={key} {...commonProps} />;
            }
            if (clientType === TORRENT_CLIENT_TYPE.TRANSMISSION) {
                return <SortableTransmission key={key} {...commonProps} />;
            }
            if (clientType === TORRENT_CLIENT_TYPE.QBITTORRENT) {
                return <SortableQBittorrent key={key} {...commonProps} />;
            }
            // Default to qBittorrent for legacy torrent client
            return <SortableQBittorrent key={key} {...commonProps} />;
        }

        // Fallback
        return <SortableQBittorrent key={key} {...commonProps} />;
    };

    // Render a single item's content (positioning/drag is owned by react-grid-layout).
    const renderItem = (item: any) => {
        switch (item.type) {
        case ITEM_TYPE.WEATHER_WIDGET:
            return <SortableWeatherWidget key={item.id} id={item.id} editMode={editMode} config={item.config} onDelete={() => handleDelete(item.id)} onEdit={() => handleEdit(item)} onDuplicate={() => handleDuplicate(item)}/>;
        case ITEM_TYPE.DATE_TIME_WIDGET:
            return <SortableDateTimeWidget key={item.id} id={item.id} editMode={editMode} config={createDateTimeConfig(item.config)} onDelete={() => handleDelete(item.id)} onEdit={() => handleEdit(item)} onDuplicate={() => handleDuplicate(item)}/>;
        case ITEM_TYPE.SYSTEM_MONITOR_WIDGET:
            return <SortableSystemMonitorWidget key={item.id} id={item.id} editMode={editMode} config={item.config} onDelete={() => handleDelete(item.id)} onEdit={() => handleEdit(item)} onDuplicate={() => handleDuplicate(item)}/>;
        case ITEM_TYPE.DISK_MONITOR_WIDGET:
            return <SortableDiskMonitor key={item.id} id={item.id} editMode={editMode} config={item.config} onDelete={() => handleDelete(item.id)} onEdit={() => handleEdit(item)} onDuplicate={() => handleDuplicate(item)} />;
        case ITEM_TYPE.PIHOLE_WIDGET:
            return <SortablePihole key={item.id} id={item.id} editMode={editMode} config={item.config} onDelete={() => handleDelete(item.id)} onEdit={() => handleEdit(item)} onDuplicate={() => handleDuplicate(item)}/>;
        case ITEM_TYPE.ADGUARD_WIDGET:
            return <SortableAdGuard key={item.id} id={item.id} editMode={editMode} config={item.config} onDelete={() => handleDelete(item.id)} onEdit={() => handleEdit(item)} onDuplicate={() => handleDuplicate(item)}/>;
        case ITEM_TYPE.DOWNLOAD_CLIENT:
            return renderDownloadClient(item);
        case ITEM_TYPE.TORRENT_CLIENT:
            return renderDownloadClient(item);
        case ITEM_TYPE.DUAL_WIDGET: {
            const dualWidgetConfig = {
                topWidget: item.config?.topWidget || undefined,
                bottomWidget: item.config?.bottomWidget || undefined
            };
            return <SortableDualWidget
                key={item.id}
                id={item.id}
                editMode={editMode}
                config={dualWidgetConfig}
                onDelete={() => handleDelete(item.id)}
                onEdit={() => handleEdit(item)}
                onDuplicate={() => handleDuplicate(item)}
            />;
        }
        case ITEM_TYPE.GROUP_WIDGET:
            return <SortableGroupWidget
                key={item.id}
                id={item.id}
                editMode={editMode}
                label={item.label}
                config={item.config}
                onDelete={() => handleDelete(item.id)}
                onEdit={() => handleEdit(item)}
                onDuplicate={() => handleDuplicate(item)}
            />;
        case ITEM_TYPE.MEDIA_SERVER_WIDGET:
            return <SortableMediaServer
                key={item.id}
                id={item.id}
                editMode={editMode}
                config={item.config}
                onDelete={() => handleDelete(item.id)}
                onEdit={() => handleEdit(item)}
                onDuplicate={() => handleDuplicate(item)}
            />;
        case ITEM_TYPE.MEDIA_REQUEST_MANAGER_WIDGET:
            return <SortableMediaRequestManager
                key={item.id}
                id={item.id}
                editMode={editMode}
                config={item.config}
                onDelete={() => handleDelete(item.id)}
                onEdit={() => handleEdit(item)}
                onDuplicate={() => handleDuplicate(item)}
            />;
        case ITEM_TYPE.NOTES_WIDGET:
            return <SortableNotes
                key={item.id}
                id={item.id}
                editMode={editMode}
                config={item.config}
                onDelete={() => handleDelete(item.id)}
                onEdit={() => handleEdit(item)}
                onDuplicate={() => handleDuplicate(item)}
            />;
        case ITEM_TYPE.SONARR_WIDGET:
            return <SortableSonarr
                key={item.id}
                id={item.id}
                editMode={editMode}
                config={item.config}
                onDelete={() => handleDelete(item.id)}
                onEdit={() => handleEdit(item)}
                onDuplicate={() => handleDuplicate(item)}
            />;
        case ITEM_TYPE.RADARR_WIDGET:
            return <SortableRadarr
                key={item.id}
                id={item.id}
                editMode={editMode}
                config={item.config}
                onDelete={() => handleDelete(item.id)}
                onEdit={() => handleEdit(item)}
                onDuplicate={() => handleDuplicate(item)}
            />;
        case ITEM_TYPE.APP_SHORTCUT:
            return (
                <SortableAppShortcut
                    key={item.id}
                    id={item.id}
                    url={item.url}
                    name={item.label}
                    iconName={item.icon?.path || ''}
                    editMode={editMode}
                    onDelete={() => handleDelete(item.id)}
                    onEdit={() => handleEdit(item)}
                    onDuplicate={() => handleDuplicate(item)}
                    showLabel={item.showLabel}
                    config={item.config}
                />
            );
        default:
            return null;
        }
    };

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
                    onDragStop={commitLayout}
                    onResizeStop={commitLayout}
                    draggableCancel='.MuiIconButton-root, .no-drag'
                    compactType={null}
                    preventCollision
                    isBounded={false}
                >
                    {items.map((item) => (
                        <div key={item.id} className='rgl-tile'>
                            {renderItem(item)}
                        </div>
                    ))}
                </GridLayout>
            </Box>

            <CenteredModal open={openEditModal} handleClose={() => setOpenEditModal(false)} title='Edit Item'>
                <AddEditForm handleClose={() => setOpenEditModal(false)} existingItem={selectedItem}/>
            </CenteredModal>
        </>
    );
};
