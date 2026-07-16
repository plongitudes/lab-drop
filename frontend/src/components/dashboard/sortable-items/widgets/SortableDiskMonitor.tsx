import React from 'react';

import { DiskMonitorWidget } from '../../base-items/widgets/DiskMonitorWidget';
import { WidgetContainer } from '../../base-items/widgets/WidgetContainer';

type Props = {
    id: string;
    editMode: boolean;
    isOverlay?: boolean;
    config?: {
        selectedDisks?: Array<{ mount: string; customName: string; showMountPath?: boolean }>;
        showIcons?: boolean;
        showMountPath?: boolean;
        layout?: '2x2' | '2x4' | '1x5';
        [key: string]: any;
    };
    onDelete?: () => void;
    onEdit?: () => void;
    onDuplicate?: () => void;
};

export const SortableDiskMonitor: React.FC<Props> = ({ id, editMode, config, onDelete, onEdit, onDuplicate }) => (
    <WidgetContainer editMode={editMode} id={id} onDelete={onDelete} onEdit={onEdit} onDuplicate={onDuplicate}>
        <DiskMonitorWidget config={config} editMode={editMode} />
    </WidgetContainer>
);
