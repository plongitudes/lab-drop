import React from 'react';

import { DualWidget } from '../../base-items/widgets/DualWidget';

type Props = {
    id: string;
    editMode: boolean;
    isOverlay?: boolean;
    onDelete?: () => void;
    onEdit?: () => void;
    onDuplicate?: () => void;
    config?: {
        topWidget?: {
            type: string;
            config?: any;
        };
        bottomWidget?: {
            type: string;
            config?: any;
        };
    };
    url?: string;
};

export const SortableDualWidget: React.FC<Props> = ({
    id,
    editMode,
    isOverlay = false,
    onDelete,
    onEdit,
    onDuplicate,
    config,
    url
}) => {

    return (
            <DualWidget
                config={config}
                editMode={editMode}
                id={id}
                onDelete={onDelete}
                onEdit={onEdit}
                onDuplicate={onDuplicate}
                url={url}
            />
    );
};
