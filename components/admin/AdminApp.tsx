'use client';

import { Admin, Resource, Layout, Sidebar, SidebarProps } from 'react-admin';
import { dataProvider } from '@/lib/admin/dataProvider';
import { authProvider } from '@/lib/admin/authProvider';
import { theme } from '@/lib/admin/theme';
import { UserList } from '@/components/admin/UserList';
import { UserCreate } from '@/components/admin/UserCreate';
import { UserEdit } from '@/components/admin/UserEdit';
import { Users as UserIcon } from 'lucide-react';
import Dashboard from '@/components/admin/Dashboard';
import MyAppBar from './MyAppBar';
import MyMenu from './MyMenu';

const MySidebar = (props: SidebarProps) => <Sidebar {...props} size={280} />;
const MyLayout = (props: any) => (
    <Layout
        {...props}
        sx={{
            '& .RaLayout-appBar': {
                position: 'relative !important',
                top: 0,
                width: '100%',
                zIndex: 1201,
                '& .RaAppBar-root': {
                    transform: 'none !important',
                },
            },
            '& .RaLayout-appFrame': {
                marginTop: '60px',
            },
            // '& .RaSidebar-root': {
            //     height: '100% !important',
            // },
            // '& .RaSidebar-docked': {
            //     height: '100% !important',
            // },
            // '& .RaSidebar-appBarCollapsed': {
            //     height: '100% !important',
            // },
            '& .RaLayout-sidebar': {
                '& .MuiDrawer-paper': {
                    backgroundColor: '#fff',
                    border: 'none',
                    boxShadow: '7px 0 60px 0 rgba(0,0,0,0.05)',
                    // marginTop: '60px',
                    height: '100%',
                    zIndex: 1200,
                    position: 'relative !important',
                    top: 0,
                },
            },
            '& .RaLayout-contentWithSidebar': {
                // marginTop: '60px',
                backgroundColor: '#f1f4f6',
                minHeight: '100%',
            },
            '& .RaLayout-content': {
                padding: '1.5rem !important',
            },
            '& .RaSidebar-fixed': {
                position: 'relative !important',
                width: '100%',
                height: '100%',
                overflowX: 'hidden',
                overflowY: 'auto',
                scrollbarWidth: 'none',
                '&::-webkit-scrollbar': {
                    display: 'none'
                }
            }
        }}
        appBar={MyAppBar}
        sidebar={MySidebar}
        menu={MyMenu}
    />
);

const AdminApp = () => (
    <Admin
        dataProvider={dataProvider}
        authProvider={authProvider}
        theme={theme}
        dashboard={Dashboard}
        layout={MyLayout}
    >
        <Resource
            name="users"
            list={UserList}
            create={UserCreate}
            edit={UserEdit}
            icon={UserIcon}
            options={{ label: 'Users' }}
        />
    </Admin>
);

export default AdminApp;
