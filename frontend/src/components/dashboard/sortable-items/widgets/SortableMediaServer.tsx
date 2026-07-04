import React from 'react';

import { MediaServerWidget } from '../../../dashboard/base-items/widgets/MediaServerWidget/MediaServerWidget';

type Props = {
    id: string;
    editMode: boolean;
    isOverlay?: boolean;
    onDelete?: () => void;
    onEdit?: () => void;
    onDuplicate?: () => void;
    config?: any;
    url?: string;
};

export const SortableMediaServer: React.FC<Props> = ({
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
            <MediaServerWidget
                config={config}
                editMode={editMode}
                id={id}
                onEdit={onEdit}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
            />
    );
};
