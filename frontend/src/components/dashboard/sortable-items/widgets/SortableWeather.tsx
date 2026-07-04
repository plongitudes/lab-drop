import { Box } from '@mui/material';
import React from 'react';

import { WeatherWidget } from '../../base-items/widgets/WeatherWidget';
import { WidgetContainer } from '../../base-items/widgets/WidgetContainer';


type Props = {
    id: string;
    editMode: boolean;
    isOverlay?: boolean;
    onDelete?: () => void;
    onEdit?: () => void;
    onDuplicate?: () => void;
    config?: {
        temperatureUnit?: string;
    };
};

export const SortableWeatherWidget: React.FC<Props> = ({ id, editMode, isOverlay = false, onDelete, onEdit, onDuplicate, config }) => {

    return (
            <WidgetContainer editMode={editMode} id={id} onDelete={onDelete} onEdit={onEdit} onDuplicate={onDuplicate}>
                <WeatherWidget config={config} />
            </WidgetContainer>
    );
};
