import React from 'react';

import { NzbgetWidget } from '../../base-items/widgets/NzbgetWidget';
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

export const SortableNzbget: React.FC<Props> = ({
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
                <NzbgetWidget config={config} id={id} />
            </WidgetContainer>
    );
};
