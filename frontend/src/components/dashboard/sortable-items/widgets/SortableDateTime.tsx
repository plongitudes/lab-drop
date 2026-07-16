import React from 'react';

import { DateTimeWidget } from '../../base-items/widgets/DateTimeWidget';
import { WidgetContainer } from '../../base-items/widgets/WidgetContainer';

type DateTimeConfig = {
    location?: {
        name: string;
        latitude: number;
        longitude: number;
    } | null;
    timezone?: string;
    use24Hour?: boolean;
};

type Props = {
    id: string;
    editMode: boolean;
    isOverlay?: boolean;
    onDelete?: () => void;
    onEdit?: () => void;
    onDuplicate?: () => void;
    config?: DateTimeConfig;
};

export const SortableDateTimeWidget: React.FC<Props> = ({
    id,
    editMode,
    isOverlay = false,
    onDelete,
    onEdit,
    onDuplicate,
    config
}) => {

    // Ensure we have a properly typed config for the DateTimeWidget
    // Only extract the properties we need, ignore the rest
    const dateTimeConfig: DateTimeConfig = {
        location: config?.location || null,
        timezone: config?.timezone || undefined,
        use24Hour: config?.use24Hour || false
    };

    return (
            <WidgetContainer editMode={editMode} id={id} onDelete={onDelete} onEdit={onEdit} onDuplicate={onDuplicate}>
                <DateTimeWidget config={dateTimeConfig} />
            </WidgetContainer>
    );
};
