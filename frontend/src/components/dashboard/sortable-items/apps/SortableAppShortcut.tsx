import React from 'react';

import { AppShortcut } from '../../base-items/apps/AppShortcut';
import { WidgetContainer } from '../../base-items/widgets/WidgetContainer';

type Props = {
    id: string;
    url?: string;
    name: string;
    iconName: string;
    editMode: boolean;
    isOverlay?: boolean;
    isPreview?: boolean;
    onDelete?: () => void;
    onEdit?: () => void;
    onDuplicate?: () => void;
    showLabel?: boolean;
    config?: any;
};

export const SortableAppShortcut: React.FC<Props> = ({
    id,
    url,
    name,
    iconName,
    editMode,
    isPreview = false,
    onDelete,
    onEdit,
    onDuplicate,
    showLabel,
    config
}) => {
    // Use healthUrl for status checking if available
    const healthUrl = config?.healthUrl;
    const healthCheckType = config?.healthCheckType || 'http';
    const statusUrl = healthUrl || url;

    return (
        <WidgetContainer
            editMode={editMode}
            id={id}
            onDelete={onDelete}
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            appShortcut
            url={statusUrl}
            healthCheckType={healthCheckType}
            isPreview={isPreview}
        >
            <AppShortcut
                url={url}
                name={isPreview ? `${name} (Drop Here)` : name}
                iconName={iconName}
                showLabel={showLabel}
                editMode={editMode}
                config={config}
                isPreview={isPreview}
            />
        </WidgetContainer>
    );
};
