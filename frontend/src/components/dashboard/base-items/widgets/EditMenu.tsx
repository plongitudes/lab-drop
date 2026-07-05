import MoreVertIcon from '@mui/icons-material/MoreVert';
import { IconButton, Menu, MenuItem } from '@mui/material';
import React, { useState } from 'react';
import { FaArrowRight, FaFile, FaHouse, FaPenToSquare } from 'react-icons/fa6';

import { useAppContext } from '../../../../context/useAppContext';

type EditMenuProps = {
    editMode: boolean;
    itemId?: string;
    onEdit?: () => void;
    // onDelete/onDuplicate are no longer surfaced here: delete lives in the selection action bar,
    // and duplicate is superseded by copy-to-tray (and was broken under coordinate layout — it
    // cloned onto the original's exact cell). Kept optional so callers don't need to change.
    onDelete?: () => void;
    onDuplicate?: () => void;
};

export const EditMenu: React.FC<EditMenuProps> = ({ editMode, itemId, onEdit }) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [moveMenuAnchor, setMoveMenuAnchor] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    const moveMenuOpen = Boolean(moveMenuAnchor);

    const { pages, currentPageId, moveItemToPage } = useAppContext();

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation(); // Stop drag from triggering
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => setAnchorEl(null);
    const handleMoveMenuOpen = (event: React.MouseEvent<HTMLElement>) => setMoveMenuAnchor(event.currentTarget);
    const handleMoveMenuClose = () => setMoveMenuAnchor(null);

    const handleMoveToPage = async (targetPageId: string | null) => {
        if (itemId) {
            await moveItemToPage(itemId, targetPageId);
            handleMoveMenuClose();
            handleMenuClose();
        }
    };

    // Move-to-page only makes sense when there are other pages to move to.
    const hasOtherPages = pages.length > 0 || currentPageId !== null;

    if (!editMode) return null;

    // Only one action (Edit) — show a direct pencil button instead of a single-item menu.
    if (!hasOtherPages) {
        return (
            <div
                onPointerDownCapture={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
            >
                <IconButton
                    aria-label='Edit'
                    sx={{ position: 'absolute', top: 0, right: 0, zIndex: 99, color: 'text.primary' }}
                    onClick={() => onEdit?.()}
                >
                    <FaPenToSquare size={16} />
                </IconButton>
            </div>
        );
    }

    // With other pages, keep a compact menu: Edit + Move to page.
    return (
        <div
            onPointerDownCapture={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
        >
            <IconButton
                sx={{ position: 'absolute', top: 0, right: 0, zIndex: 99 }}
                onClick={handleMenuOpen}
            >
                <MoreVertIcon sx={{ color: 'text.primary' }}/>
            </IconButton>
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleMenuClose}
                disableScrollLock={false}
                sx={{ '& .MuiPaper-root': { bgcolor: '#2A2A2A', color: 'white', borderRadius: 1, boxShadow: 4 } }}
            >
                <MenuItem
                    onClick={() => { handleMenuClose(); onEdit?.(); }}
                    sx={{ py: 1, display: 'flex', alignItems: 'center', gap: 1 }}
                >
                    <FaPenToSquare size={14} />
                    Edit
                </MenuItem>
                <MenuItem
                    onClick={handleMoveMenuOpen}
                    sx={{ py: 1, display: 'flex', alignItems: 'center', gap: 1 }}
                >
                    <FaArrowRight size={14} />
                    Move to page
                </MenuItem>
            </Menu>

            {/* Move to submenu */}
            <Menu
                anchorEl={moveMenuAnchor}
                open={moveMenuOpen}
                onClose={handleMoveMenuClose}
                disableScrollLock={false}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                sx={{ '& .MuiPaper-root': { bgcolor: '#2A2A2A', color: 'white', borderRadius: 1, boxShadow: 4 } }}
            >
                {currentPageId !== null && (
                    <MenuItem
                        onClick={() => handleMoveToPage(null)}
                        sx={{ py: 1, display: 'flex', alignItems: 'center', gap: 1 }}
                    >
                        <FaHouse size={14} />
                        Home
                    </MenuItem>
                )}
                {pages
                    .filter((page) => page.id !== currentPageId)
                    .map((page) => (
                        <MenuItem
                            key={page.id}
                            onClick={() => handleMoveToPage(page.id)}
                            sx={{ py: 1, display: 'flex', alignItems: 'center', gap: 1 }}
                        >
                            <FaFile size={14} />
                            {page.name}
                        </MenuItem>
                    ))
                }
            </Menu>
        </div>
    );
};
