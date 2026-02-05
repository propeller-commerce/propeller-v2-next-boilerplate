'use client';

import { NextPage } from 'next';
import dynamic from 'next/dynamic';

const AdminApp = dynamic(() => import('@/components/admin/AdminApp'), { ssr: false });

const AdminPage: NextPage = () => {
    return <AdminApp />;
};

export default AdminPage;
