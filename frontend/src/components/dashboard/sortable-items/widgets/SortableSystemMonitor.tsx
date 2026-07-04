import React from 'react';

import { SystemMonitorWidget } from '../../base-items/widgets/SystemMonitorWidget/SystemMonitorWidget';
import { WidgetContainer } from '../../base-items/widgets/WidgetContainer';

type Props = {
    id: string;
    editMode: boolean;
    isOverlay?: boolean;
    config?: {
        temperatureUnit?: string;
        [key: string]: any;
    };
    onDelete?: () => void;
    onEdit?: () => void;
    onDuplicate?: () => void;
};

export const SortableSystemMonitorWidget: React.FC<Props> = ({ id, editMode, isOverlay = false, config, onDelete, onEdit, onDuplicate }) => {

    return (
            <WidgetContainer editMode={editMode} id={id} onDelete={onDelete} onEdit={onEdit} onDuplicate={onDuplicate}>
                <SystemMonitorWidget config={config} editMode={editMode} />
            </WidgetContainer>
    );
};
