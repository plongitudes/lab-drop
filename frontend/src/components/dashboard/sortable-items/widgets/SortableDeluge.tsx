import React from 'react';

import { DelugeWidget } from '../../base-items/widgets/DelugeWidget';
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

export const SortableDeluge: React.FC<Props> = ({
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
                <DelugeWidget config={config} id={id} />
            </WidgetContainer>
    );
};
