export enum ITEM_TYPE {
    WEATHER_WIDGET = 'weather-widget',
    DATE_TIME_WIDGET = 'date-time-widget',
    SYSTEM_MONITOR_WIDGET = 'system-monitor-widget',
    DISK_MONITOR_WIDGET = 'disk-monitor-widget',
    DOWNLOAD_CLIENT = 'download-client',
    TORRENT_CLIENT = 'torrent-client', // Legacy support - maps to DOWNLOAD_CLIENT
    PIHOLE_WIDGET = 'pihole-widget',
    ADGUARD_WIDGET = 'adguard-widget',
    MEDIA_SERVER_WIDGET = 'media-server-widget',
    MEDIA_REQUEST_MANAGER_WIDGET = 'media-request-manager-widget',
    NOTES_WIDGET = 'notes-widget',
    SONARR_WIDGET = 'sonarr-widget',
    RADARR_WIDGET = 'radarr-widget',
    DUAL_WIDGET = 'dual-widget',
    GROUP_WIDGET = 'group-widget',
    APP_SHORTCUT = 'app-shortcut',
    PLACEHOLDER = 'placeholder',
    // Legacy placeholder types - keeping for backward compatibility
    BLANK_APP = 'blank-app',
    BLANK_WIDGET = 'blank-widget',
    BLANK_ROW = 'blank-row',
    PAGE = 'page'
}

export enum DOWNLOAD_CLIENT_TYPE {
    QBITTORRENT = 'qbittorrent',
    DELUGE = 'deluge',
    TRANSMISSION = 'transmission',
    SABNZBD = 'sabnzbd',
    NZBGET = 'nzbget'
}

// Legacy support
export enum TORRENT_CLIENT_TYPE {
    QBITTORRENT = 'qbittorrent',
    DELUGE = 'deluge',
    TRANSMISSION = 'transmission',
}

export type NewItem = {
    name?: string;
    icon?: { path: string; name: string; source?: string };
    url?: string;
    label: string;
    type: string;
    showLabel?: boolean;
    adminOnly?: boolean;
    config?: {
        temperatureUnit?: string;
        healthUrl?: string;
        healthCheckType?: string;
        // Security flags for sensitive data
        _hasApiToken?: boolean;
        _hasPassword?: boolean;
        [key: string]: any;
    };
}

export type Icon = {
    path: string;
    name: string;
    source?: string;
    guidelines?: string;
}

export type SearchProvider = {
    name: string;
    url: string;
}

// Free 2-D placement: a tile's position/size on the grid (per device).
export type TileLayout = {
    x: number;   // grid column (0-based)
    y: number;   // grid row (0-based)
    w: number;   // width in grid columns
    h: number;   // height in rowHeight units
};

// A spatial-grouping zone: a labeled/colored background rectangle that tiles sit within.
export type Zone = {
    id: string;
    name: string;
    color?: string;   // theme-relative accent; optional
    x: number;
    y: number;
    w: number;
    h: number;
};

export type Page = {
    id: string;
    name: string;
    adminOnly?: boolean;
    layout: {
        desktop: DashboardItem[];
        mobile: DashboardItem[];
        zonesDesktop?: Zone[];
        zonesMobile?: Zone[];
    };
}

export type Config = {
    layout: {
        desktop: DashboardItem[];
        mobile: DashboardItem[];
        zonesDesktop?: Zone[];
        zonesMobile?: Zone[];
    },
    pages?: Page[];
    title?: string;
    backgroundImage?: string;
    search?: boolean;
    searchProvider?: SearchProvider;
    showInternetIndicator?: boolean;
    showIP?: boolean;
    ipDisplayType?: 'wan' | 'lan' | 'both';
    isSetupComplete?: boolean;
    lastSeenVersion?: string;
    defaultNoteFontSize?: string;
    themeColor?: string;
}

export type UploadImageResponse = {
    message: string;
    filePath: string;
}

export type DashboardLayout = {
    layout: {
        desktop: DashboardItem[];
        mobile: DashboardItem[];
        zonesDesktop?: Zone[];
        zonesMobile?: Zone[];
    }
}

export type DashboardItem = {
    id: string;
    label: string;
    type: string;
    url?: string;
    icon?: { path: string; name: string; source?: string; };
    showLabel?: boolean;
    adminOnly?: boolean;
    // Free 2-D placement (per device: lives on the item within layout.desktop / layout.mobile).
    // Optional for backward-compat; absent => needs migration (see migrateFlowLayout).
    layout?: TileLayout;
    config?: {
        temperatureUnit?: string;
        healthUrl?: string;
        healthCheckType?: string;
        // Security flags for sensitive data
        _hasApiToken?: boolean;
        _hasPassword?: boolean;
        [key: string]: any;
    };
};

