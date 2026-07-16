export enum ITEM_TYPE {
    WEATHER_WIDGET = 'weather-widget',
    DATE_TIME_WIDGET = 'date-time-widget',
    SYSTEM_MONITOR_WIDGET = 'system-monitor-widget',
    TORRENT_CLIENT = 'torrent-client',
    PIHOLE_WIDGET = 'pihole-widget',
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

// Free 2-D placement: a tile's position/size on the grid (per device).
export type TileLayout = {
    x: number;
    y: number;
    w: number;
    h: number;
};

// A spatial-grouping zone: a labeled/colored background rectangle that tiles sit within.
export type Zone = {
    id: string;
    name: string;
    color?: string;
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
    searchProvider?: string;
    isSetupComplete?: boolean;
    lastSeenVersion?: string;
    notes?: Note[];
    themeColor?: string;
    showInternetIndicator?: boolean;
    showIP?: boolean;
    ipDisplayType?: 'wan' | 'lan' | 'both';
}

export type Note = {
    id: string;
    title: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    fontSize?: string;
}

export type DashboardLayout = {
    desktop: DashboardItem[];
    mobile: DashboardItem[];
    zonesDesktop?: Zone[];
    zonesMobile?: Zone[];
}

export type DashboardItem = {
    id: string;
    label: string;
    type: string;
    url?: string;
    icon?: { path: string; name: string; source?: string; };
    showLabel?: boolean;
    adminOnly?: boolean;
    // Free 2-D placement (per device). Optional for backward-compat.
    layout?: TileLayout;
    config?: {
        [key: string]: any;
    };
};

