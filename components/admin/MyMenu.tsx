import { MenuItemLink, MenuProps, useSidebarState } from 'react-admin';
import { Box, Typography } from '@mui/material';
import { Users, Rocket } from 'lucide-react';

const MyMenu = (props: MenuProps) => {
    const [open] = useSidebarState();

    return (
        <Box
            sx={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                mt: 2,
                '& .MuiMenuItem-root': {
                    display: 'flex',
                    alignItems: 'center',
                    minHeight: '44px',
                    borderRadius: '0.25rem',
                    margin: open ? '0 12px 2px 12px' : '0 8px 2px 8px',
                    padding: open ? '0 15px' : '0',
                    width: open ? 'calc(100% - 24px)' : 'calc(100% - 16px)',
                    color: '#343a40',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    transition: 'all .2s',
                    justifyContent: open ? 'flex-start' : 'center',
                    '&:hover': {
                        backgroundColor: '#f6f9fc',
                        color: '#3f6ad8',
                        borderRadius: '0.25rem',
                        '& .MuiListItemIcon-root': {
                            color: '#3f6ad8',
                        },
                    },
                    '&.RaMenuItemLink-active': {
                        backgroundColor: '#e0f3ff',
                        color: '#3f6ad8',
                        fontWeight: 700,
                        '& .MuiListItemIcon-root': {
                            color: '#3f6ad8',
                        },
                    },
                    '& .MuiListItemIcon-root': {
                        minWidth: open ? '34px' : 'auto',
                        color: '#adb5bd',
                        display: 'flex',
                        justifyContent: 'center',
                        mr: open ? 1 : 0,
                    },
                },
            }}
        >

            <MenuItemLink
                to="/"
                primaryText={open ? 'Dashboard' : ''}
                leftIcon={<Rocket size={18} />}
                {...props}
            />

            <MenuItemLink
                to="/users"
                primaryText={open ? 'Users' : ''}
                leftIcon={<Users size={18} />}
                {...props}
            />
        </Box>
    );
};

export default MyMenu;
