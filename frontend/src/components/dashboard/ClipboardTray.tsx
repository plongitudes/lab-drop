import { Box, Paper, Typography } from '@mui/material';
import React from 'react';

import { DashboardItem } from '../../types';
import { getIconPath } from '../../utils/utils';

type Props = {
    items: DashboardItem[];
    onChipDragStart: (item: DashboardItem, e: React.DragEvent) => void;
    onChipDragEnd: () => void;
};

/** Dock of cut/copied tiles. Each chip is HTML5-draggable onto the grid to place it. */
export const ClipboardTray: React.FC<Props> = ({ items, onChipDragStart, onChipDragEnd }) => {
    if (items.length === 0) return null;
    return (
        <Paper
            elevation={10}
            sx={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 1250,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                px: 2,
                py: 1.5,
                backgroundColor: 'rgba(18, 18, 26, 0.97)',
                backdropFilter: 'blur(6px)',
                borderTop: '1px solid rgba(255, 255, 255, 0.12)',
            }}
        >
            <Typography variant='body2' sx={{ opacity: 0.8, whiteSpace: 'nowrap' }}>
                Tray ({items.length}) — drag onto the grid to place
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', flex: 1 }}>
                {items.map((item) => (
                    <Box
                        key={item.id}
                        draggable
                        onDragStart={(e) => onChipDragStart(item, e)}
                        onDragEnd={onChipDragEnd}
                        title={item.label || item.type}
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 0.5,
                            minWidth: 72,
                            height: 56,
                            px: 1,
                            borderRadius: 2,
                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.14)',
                            cursor: 'grab',
                            flexShrink: 0,
                        }}
                    >
                        {item.icon?.path ? (
                            <img
                                src={getIconPath(item.icon.path)}
                                alt=''
                                draggable={false}
                                style={{ width: 22, height: 22, objectFit: 'contain' }}
                            />
                        ) : null}
                        <Typography variant='caption' noWrap sx={{ maxWidth: 88 }}>
                            {item.label || item.type}
                        </Typography>
                    </Box>
                ))}
            </Box>
        </Paper>
    );
};
