import React from 'react';

import { MediaRequestManagerWidget } from '../../../dashboard/base-items/widgets/MediaRequestManagerWidget';
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

const SortableMediaRequestManager: React.FC<Props> = ({
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
                <MediaRequestManagerWidget
                    id={id}
                    service={config?.service || 'jellyseerr'}
                    host={config?.host}
                    port={config?.port}
                    ssl={config?.ssl}
                    _hasApiKey={config?._hasApiKey}
                    displayName={config?.displayName}
                    showLabel={config?.showLabel}
                />
            </WidgetContainer>
    );
};

export { SortableMediaRequestManager };
