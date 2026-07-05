import { Button, Divider, Paper, Typography } from '@mui/material';
import React from 'react';

type Props = {
    count: number;
    onCut: () => void;
    onCopy: () => void;
    onDelete: () => void;
    onDeselect: () => void;
};

/** Floating bar shown while one or more tiles are selected in edit mode. */
export const SelectionActionBar: React.FC<Props> = ({ count, onCut, onCopy, onDelete, onDeselect }) => {
    if (count === 0) return null;
    return (
        <Paper
            elevation={8}
            sx={{
                position: 'fixed',
                top: 74,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1250,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 2,
                py: 1,
                borderRadius: 999,
                backgroundColor: 'rgba(28, 28, 38, 0.96)',
                backdropFilter: 'blur(6px)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
            }}
        >
            <Typography variant='body2' sx={{ mr: 0.5, opacity: 0.85 }}>
                {count} selected
            </Typography>
            <Divider orientation='vertical' flexItem sx={{ borderColor: 'rgba(255,255,255,0.15)' }} />
            <Button size='small' variant='contained' onClick={onCut}>Cut</Button>
            <Button size='small' variant='outlined' onClick={onCopy}>Copy</Button>
            <Button size='small' variant='outlined' color='error' onClick={onDelete}>Delete</Button>
            <Button size='small' color='inherit' onClick={onDeselect}>Deselect</Button>
        </Paper>
    );
};
