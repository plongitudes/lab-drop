import React from 'react';

import { SabnzbdWidget } from '../../base-items/widgets/SabnzbdWidget';
import { WidgetContainer } from '../../base-items/widgets/WidgetContainer';

interface Props {
    id: string;
    editMode?: boolean;
    isOverlay?: boolean;
    onDelete?: () => void;
    onEdit?: () => void;
    onDuplicate?: () => void;
    config?: any;
}

export const SortableSabnzbd: React.FC<Props> = ({
    id,
    editMode = false,
    isOverlay = false,
    onDelete,
    onEdit,
    onDuplicate,
    config
}) => {

    return (
            <WidgetContainer editMode={editMode} id={id} onDelete={onDelete} onEdit={onEdit} onDuplicate={onDuplicate}>
                <SabnzbdWidget config={config} id={id} />
            </WidgetContainer>
    );
};
