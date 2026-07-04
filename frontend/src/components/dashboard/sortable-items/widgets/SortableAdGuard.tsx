import React from 'react';

import { AdGuardWidget } from '../../base-items/widgets/AdGuardWidget/AdGuardWidget';
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

export const SortableAdGuard: React.FC<Props> = ({ id, editMode, isOverlay = false, config, onDelete, onEdit, onDuplicate }) => {

    return (
            <WidgetContainer editMode={editMode} id={id} onDelete={onDelete} onEdit={onEdit} onDuplicate={onDuplicate}>
                <AdGuardWidget config={config} id={id} />
            </WidgetContainer>
    );
};
