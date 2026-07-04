import React from 'react';

import { PiholeWidget } from '../../base-items/widgets/PiholeWidget/PiholeWidget';
import { WidgetContainer } from '../../base-items/widgets/WidgetContainer';

type Props = {
    id: string;
    editMode: boolean;
    isOverlay?: boolean;
    config?: any;
    onDelete?: () => void;
    onEdit?: () => void;
    onDuplicate?: () => void;
};

export const SortablePihole: React.FC<Props> = ({ id, editMode, isOverlay = false, config, onDelete, onEdit, onDuplicate }) => {

    return (
            <WidgetContainer editMode={editMode} id={id} onDelete={onDelete} onEdit={onEdit} onDuplicate={onDuplicate}>
                <PiholeWidget config={config} id={id} />
            </WidgetContainer>
    );
};
