import { AppBar, Logout, UserMenu } from 'react-admin';
import { Typography, Box, IconButton, Divider } from '@mui/material';
import {
    Search,
    Grid as GridIcon,
    Settings,
    Menu as MenuIcon,
    Gift,
    ChevronDown,
    Zap,
    Calendar,
    Activity
} from 'lucide-react';

const HeaderButton = ({ icon: Icon, label, badge, color = "#6c757d" }: any) => (
    <Box sx={{ display: { xs: 'none', lg: 'flex' }, alignItems: 'center', cursor: 'pointer', mx: 1.5, '&:hover': { opacity: 0.8 } }}>
        <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            {badge ? (
                <Box sx={{
                    position: 'absolute',
                    top: -8,
                    left: -8,
                    backgroundColor: '#d92550',
                    color: '#fff',
                    fontSize: '10px',
                    fontWeight: 700,
                    borderRadius: '50%',
                    width: 16,
                    height: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #FAFBFC',
                    zIndex: 1
                }}>
                    {badge}
                </Box>
            ) : null}
            <Icon size={18} color={color} style={{ marginRight: '6px' }} />
        </Box>
        <Typography variant="body2" sx={{ fontWeight: 500, color: '#495057', fontSize: '0.85rem', display: 'flex', alignItems: 'center' }}>
            {label}
            <ChevronDown size={14} style={{ marginLeft: '4px', opacity: 0.5 }} />
        </Typography>
    </Box>
);

const CircleIcon = ({ icon: Icon, color = "#545CDC", bgColor = "#f0f3f6", size = 18 }: any) => (
    <IconButton sx={{
        backgroundColor: bgColor,
        width: 38,
        height: 38,
        borderRadius: '50%',
        mx: 0.5,
        '&:hover': { backgroundColor: '#e9ebed' }
    }}>
        <Icon size={size} color={color} />
    </IconButton>
);

const MyAppBar = (props: any) => (
    <AppBar
        {...props}
        elevation={0}
        sx={{
            height: '60px',
            backgroundColor: '#FAFBFC',
            boxShadow: '0px 7.5px 35px 0px rgba(8, 10, 37, 0.03), 0px 2px 3px 0px rgba(8, 10, 37, 0.03)',
            zIndex: (theme) => theme.zIndex.drawer + 1,
            color: '#495057',
            '& .MuiToolbar-root': {
                minHeight: '60px',
                width: '100%',
                backgroundColor: '#FAFBFC',
                display: 'flex',
                alignItems: 'center',
                px: 3,
                borderBottom: 'none'
            }
        }}
    >
        {/* Logo Section */}
        <Box sx={{
            width: 280,
            ml: -3,
            display: 'flex',
            alignItems: 'center',
            height: '100%',
            px: 3,
        }}>
            <Typography
                variant="h6"
                sx={{
                    fontWeight: 700,
                    fontSize: '1.4rem',
                    color: '#343a40',
                    // fontFamily: '"Dancing Script", cursive, "Segoe UI", Roboto',
                    mr: 2,
                    letterSpacing: '-1px'
                }}
            >
                Propeller
            </Typography>
            {/* <IconButton size="small" sx={{ color: '#6c757d' }}>
                <MenuIcon size={22} />
            </IconButton> */}
        </Box>

        {/* Left Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, ml: 1 }}>
            {/* <CircleIcon icon={Search} color="#545CDC" /> */}
            {/* <HeaderButton icon={Gift} label="Mega Menu" color="#545CDC" /> */}
            {/* <HeaderButton icon={Settings} label="Settings" badge="4" color="#d92550" /> */}
            {/* <HeaderButton icon={Zap} label="Projects" color="#545CDC" /> */}
        </Box>

        {/* Right Section */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* Status Icons */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', mr: 2 }}>
                {/* <CircleIcon icon={GridIcon} color="#545CDC" bgColor="rgba(84, 92, 220, 0.1)" /> */}
                {/* <Box sx={{ mx: 0.5, width: 38, height: 38, borderRadius: '50%', backgroundColor: '#f0f3f6', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', '&:hover': { backgroundColor: '#e9ebed' } }}>
                    <Box component="span" sx={{ fontSize: '1.2rem' }}>🇩🇪</Box>
                </Box> */}
                {/* <CircleIcon icon={Activity} color="#3ac47d" bgColor="rgba(58, 196, 125, 0.1)" /> */}
            </Box>

            <Divider orientation="vertical" flexItem sx={{ height: 30, my: 'auto', mx: 1, borderColor: 'rgba(0,0,0,0.1)' }} />

            {/* Profile Section */}
            <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>

                {/* <Box sx={{ display: { xs: 'none', md: 'block' }, ml: 1.5, mr: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2, color: '#495057' }}>Alina Mclourd</Typography>
                    <Typography variant="caption" sx={{ color: '#6C757D', display: 'block', fontSize: '10px' }}>VP People Manager</Typography>
                </Box> */}
                {/* <IconButton sx={{
                    backgroundColor: '#3f6ad8',
                    width: 38,
                    height: 38,
                    borderRadius: '4px',
                    color: '#fff',
                    boxShadow: '0 0.125rem 0.625rem rgba(63, 106, 216, 0.3)',
                    '&:hover': { backgroundColor: '#3452b4' }
                }}>
                    <Calendar size={18} />
                </IconButton> */}
            </Box>
        </Box>
    </AppBar>
);

export default MyAppBar;
