import React from 'react';

import { DashboardItem, DOWNLOAD_CLIENT_TYPE, ITEM_TYPE, TORRENT_CLIENT_TYPE } from '../../types';
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
import { SortableNzbget } from './sortable-items/widgets/SortableNzbget';
import { SortablePihole } from './sortable-items/widgets/SortablePihole';
import { SortableQBittorrent } from './sortable-items/widgets/SortableQBittorrent';
import { SortableRadarr } from './sortable-items/widgets/SortableRadarr';
import { SortableSabnzbd } from './sortable-items/widgets/SortableSabnzbd';
import { SortableSonarr } from './sortable-items/widgets/SortableSonarr';
import { SortableSystemMonitorWidget } from './sortable-items/widgets/SortableSystemMonitor';
import { SortableTransmission } from './sortable-items/widgets/SortableTransmission';
import { SortableWeatherWidget } from './sortable-items/widgets/SortableWeather';

type Props = {
    item: DashboardItem;
    editMode: boolean;
    onDelete: (id: string) => void;
    onEdit: (item: DashboardItem) => void;
    onDuplicate: (item: DashboardItem) => void;
};

const createDateTimeConfig = (config: any) => ({
    location: config?.location || null,
    timezone: config?.timezone || undefined,
    use24Hour: config?.use24Hour || false,
});

/**
 * Renders a single dashboard tile's content (react-grid-layout owns positioning/drag).
 * Memoized so that state changes which don't affect this tile — notably selection toggles on
 * other tiles — skip re-rendering it. Requires stable `onDelete/onEdit/onDuplicate` refs and a
 * stable `item` reference (DashboardGrid preserves item identity for unchanged tiles).
 */
const DashboardTileImpl: React.FC<Props> = ({ item, editMode, onDelete, onEdit, onDuplicate }) => {
    const del = () => onDelete(item.id);
    const edit = () => onEdit(item);
    const dup = () => onDuplicate(item);

    const renderDownloadClient = () => {
        const clientType = item.config?.clientType;
        const commonProps = { id: item.id, editMode, config: item.config, onDelete: del, onEdit: edit, onDuplicate: dup };

        if (item.type === ITEM_TYPE.DOWNLOAD_CLIENT) {
            if (clientType === DOWNLOAD_CLIENT_TYPE.DELUGE) return <SortableDeluge {...commonProps} />;
            if (clientType === DOWNLOAD_CLIENT_TYPE.TRANSMISSION) return <SortableTransmission {...commonProps} />;
            if (clientType === DOWNLOAD_CLIENT_TYPE.SABNZBD) return <SortableSabnzbd {...commonProps} />;
            if (clientType === DOWNLOAD_CLIENT_TYPE.NZBGET) return <SortableNzbget {...commonProps} />;
            return <SortableQBittorrent {...commonProps} />;
        }
        if (item.type === ITEM_TYPE.TORRENT_CLIENT) {
            if (clientType === TORRENT_CLIENT_TYPE.DELUGE) return <SortableDeluge {...commonProps} />;
            if (clientType === TORRENT_CLIENT_TYPE.TRANSMISSION) return <SortableTransmission {...commonProps} />;
            if (clientType === TORRENT_CLIENT_TYPE.QBITTORRENT) return <SortableQBittorrent {...commonProps} />;
            return <SortableQBittorrent {...commonProps} />;
        }
        return <SortableQBittorrent {...commonProps} />;
    };

    switch (item.type) {
    case ITEM_TYPE.WEATHER_WIDGET:
        return <SortableWeatherWidget id={item.id} editMode={editMode} config={item.config} onDelete={del} onEdit={edit} onDuplicate={dup} />;
    case ITEM_TYPE.DATE_TIME_WIDGET:
        return <SortableDateTimeWidget id={item.id} editMode={editMode} config={createDateTimeConfig(item.config)} onDelete={del} onEdit={edit} onDuplicate={dup} />;
    case ITEM_TYPE.SYSTEM_MONITOR_WIDGET:
        return <SortableSystemMonitorWidget id={item.id} editMode={editMode} config={item.config} onDelete={del} onEdit={edit} onDuplicate={dup} />;
    case ITEM_TYPE.DISK_MONITOR_WIDGET:
        return <SortableDiskMonitor id={item.id} editMode={editMode} config={item.config} onDelete={del} onEdit={edit} onDuplicate={dup} />;
    case ITEM_TYPE.PIHOLE_WIDGET:
        return <SortablePihole id={item.id} editMode={editMode} config={item.config} onDelete={del} onEdit={edit} onDuplicate={dup} />;
    case ITEM_TYPE.ADGUARD_WIDGET:
        return <SortableAdGuard id={item.id} editMode={editMode} config={item.config} onDelete={del} onEdit={edit} onDuplicate={dup} />;
    case ITEM_TYPE.DOWNLOAD_CLIENT:
    case ITEM_TYPE.TORRENT_CLIENT:
        return renderDownloadClient();
    case ITEM_TYPE.DUAL_WIDGET: {
        const dualWidgetConfig = {
            topWidget: item.config?.topWidget || undefined,
            bottomWidget: item.config?.bottomWidget || undefined,
        };
        return <SortableDualWidget id={item.id} editMode={editMode} config={dualWidgetConfig} onDelete={del} onEdit={edit} onDuplicate={dup} />;
    }
    case ITEM_TYPE.GROUP_WIDGET:
        return <SortableGroupWidget id={item.id} editMode={editMode} label={item.label} config={item.config} onDelete={del} onEdit={edit} onDuplicate={dup} />;
    case ITEM_TYPE.MEDIA_SERVER_WIDGET:
        return <SortableMediaServer id={item.id} editMode={editMode} config={item.config} onDelete={del} onEdit={edit} onDuplicate={dup} />;
    case ITEM_TYPE.MEDIA_REQUEST_MANAGER_WIDGET:
        return <SortableMediaRequestManager id={item.id} editMode={editMode} config={item.config} onDelete={del} onEdit={edit} onDuplicate={dup} />;
    case ITEM_TYPE.NOTES_WIDGET:
        return <SortableNotes id={item.id} editMode={editMode} config={item.config} onDelete={del} onEdit={edit} onDuplicate={dup} />;
    case ITEM_TYPE.SONARR_WIDGET:
        return <SortableSonarr id={item.id} editMode={editMode} config={item.config} onDelete={del} onEdit={edit} onDuplicate={dup} />;
    case ITEM_TYPE.RADARR_WIDGET:
        return <SortableRadarr id={item.id} editMode={editMode} config={item.config} onDelete={del} onEdit={edit} onDuplicate={dup} />;
    case ITEM_TYPE.APP_SHORTCUT:
        return (
            <SortableAppShortcut
                id={item.id}
                url={item.url}
                name={item.label}
                iconName={item.icon?.path || ''}
                editMode={editMode}
                onDelete={del}
                onEdit={edit}
                onDuplicate={dup}
                showLabel={item.showLabel}
                config={item.config}
            />
        );
    default:
        return null;
    }
};

export const DashboardTile = React.memo(DashboardTileImpl);
