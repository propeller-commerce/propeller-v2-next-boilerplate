'use client';

import React, { useState } from 'react';
import {
    Grid,
    Typography,
    Box,
    Paper,
    Card,
    CardContent,
    CardHeader,
    Tabs,
    Tab,
    IconButton,
    Button
} from '@mui/material';
import {
    Umbrella,
    Settings,
    MoreHorizontal,
    ArrowUpRight,
    ArrowDownRight,
    Star
} from 'lucide-react';
import {
    LineChart,
    Line,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

// Dummy Data for charts
const sparklineData1 = [
    { value: 50 }, { value: 80 }, { value: 45 }, { value: 70 }, { value: 60 }, { value: 90 }, { value: 55 }, { value: 85 }, { value: 70 }, { value: 40 }
];
const sparklineData2 = [
    { value: 65 }, { value: 40 }, { value: 75 }, { value: 50 }, { value: 85 }, { value: 45 }, { value: 65 }, { value: 30 }, { value: 55 }, { value: 40 }
];
const sparklineData3 = [
    { value: 30 }, { value: 55 }, { value: 45 }, { value: 70 }, { value: 60 }, { value: 90 }, { value: 75 }, { value: 50 }, { value: 80 }, { value: 95 }
];

const bigChartData = [
    { name: 'Jan', uv: 4000, pv: 2400 },
    { name: 'Feb', uv: 3000, pv: 1398 },
    { name: 'Mar', uv: 2000, pv: 9800 },
    { name: 'Apr', uv: 2780, pv: 3908 },
    { name: 'May', uv: 1890, pv: 4800 },
    { name: 'Jun', uv: 2390, pv: 3800 },
    { name: 'Jul', uv: 3490, pv: 4300 },
    { name: 'Aug', uv: 2000, pv: 9800 },
    { name: 'Sep', uv: 2780, pv: 3908 },
    { name: 'Oct', uv: 1890, pv: 4800 },
    { name: 'Nov', uv: 2390, pv: 3800 },
    { name: 'Dec', uv: 3490, pv: 4300 },
];

const PageTitle = () => (
    <Paper
        elevation={0}
        sx={{
            p: 3,
            px: 4,
            mb: 4,
            display: 'flex',
            alignItems: 'center',
            height: '110px',
            borderRadius: '0.25rem',
            background: 'linear-gradient(90deg, #434343 0%, #000000 100%) !important',
            color: '#fff',
            position: 'relative',
            overflow: 'hidden',
            boxSizing: 'border-box'
        }}
    >
        <Box
            sx={{
                width: 60,
                height: 60,
                backgroundColor: '#fff',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 3,
                boxShadow: '0 0.125rem 0.625rem rgba(0,0,0,0.1)'
            }}
        >
            <Umbrella size={28} color="#3f6ad8" />
        </Box>
        <Box sx={{ flex: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5, letterSpacing: '0.5px' }}>
                Sales Dashboard
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Example of a Dashboard page built with ArchitectUI.
            </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton sx={{ color: '#fff', mr: 1, backgroundColor: 'rgba(255, 255, 255, 0.1)', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.2)' } }}>
                <Star size={18} />
            </IconButton>
            <Button
                variant="contained"
                startIcon={<Settings size={16} />}
                sx={{
                    backgroundColor: '#3ac47d',
                    '&:hover': { backgroundColor: '#31a66a' },
                    boxShadow: '0 0.125rem 0.625rem rgba(58, 196, 125, 0.4)',
                    textTransform: 'none',
                    fontWeight: 600
                }}
            >
                Buttons
            </Button>
        </Box>
    </Paper>
);

const DashboardTabs = () => {
    const [value, setValue] = useState(0);
    return (
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center' }}>
            <Tabs
                value={value}
                onChange={(_, newValue) => setValue(newValue)}
                sx={{
                    '& .MuiTabs-indicator': { display: 'none' },
                    backgroundColor: '#fff',
                    borderRadius: '50px',
                    padding: '4px',
                    boxShadow: '0 0.125rem 0.625rem rgba(0,0,0,0.05)'
                }}
            >
                {['Sales Report', 'Account Activity', 'Analytics', 'Technical Support'].map((label, index) => (
                    <Tab
                        key={label}
                        label={label}
                        sx={{
                            borderRadius: '50px',
                            minHeight: '38px',
                            px: 3,
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            color: '#495057',
                            textTransform: 'none',
                            '&.Mui-selected': {
                                backgroundColor: '#3f6ad8',
                                color: '#fff !important'
                            },
                        }}
                    />
                ))}
            </Tabs>
        </Box>
    );
};

const StatCard = ({ title, value, trend, trendValue, trendText, data, color }: any) => (
    <Card sx={{ borderRadius: '0.25rem', height: 'auto', mb: 0, boxShadow: '0 0.46875rem 2.1875rem rgba(4, 9, 20, 0.03), 0 0.9375rem 1.40625rem rgba(4, 9, 20, 0.03)' }}>
        <CardHeader
            title={title}
            titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase', color: '#6c757d' }}
            sx={{ borderBottom: '1px solid #f1f4f6', py: 1.5, px: 2, minHeight: '56px', boxSizing: 'border-box' }}
            action={<IconButton size="small"><MoreHorizontal size={18} /></IconButton>}
        />
        <CardContent sx={{ p: '16px 16px 0px 16px', '&:last-child': { pb: 2 } }}>
            <Box sx={{ mb: 2 }}>
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#495057', fontSize: '2.5rem', lineHeight: 1.2 }}>{value}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                    <Typography variant="caption" sx={{ color: trend === 'up' ? '#3ac47d' : '#d92550', fontWeight: 700, display: 'flex', alignItems: 'center', mr: 1 }}>
                        {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />} {trendValue}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#adb5bd' }}>{trendText}</Typography>
                </Box>
            </Box>
            <Box sx={{ height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 0 }} activeDot={{ r: 4 }} />
                        <Tooltip
                            contentStyle={{ borderRadius: '4px', border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
                            cursor={{ stroke: '#f1f4f6', strokeWidth: 2 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </Box>
        </CardContent>
    </Card>
);

const Dashboard = () => (
    <Box sx={{ p: { xs: 2, md: 3 }, backgroundColor: '#f1f4f6', minHeight: 'calc(100vh - 60px)' }}>
        <Grid container spacing={3}>
            {/* Row 1: 3 Stat Cards */}
            <Grid size={{ xs: 12, md: 4 }}>
                <StatCard
                    title="Top Sellers"
                    value="$984"
                    trend="up"
                    trendValue="12.5%"
                    trendText="than last month"
                    data={sparklineData1}
                    color="#3f6ad8"
                />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
                <StatCard
                    title="Best Selling Products"
                    value="458"
                    trend="down"
                    trendValue="5.4%"
                    trendText="down from last week"
                    data={sparklineData2}
                    color="#f7b924"
                />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
                <StatCard
                    title="Portfolio Performance"
                    value="9%"
                    trend="up"
                    trendValue="+12%"
                    trendText="growth rate"
                    data={sparklineData3}
                    color="#3ac47d"
                />
            </Grid>

            {/* Row 2: Larger Stats */}
            <Grid size={{ xs: 12, md: 8 }}>
                <Card sx={{ borderRadius: '0.25rem', boxShadow: '0 0.46875rem 2.1875rem rgba(4, 9, 20, 0.03), 0 0.9375rem 1.40625rem rgba(4, 9, 20, 0.03)' }}>
                    <CardHeader
                        title="Sales Statistics"
                        titleTypographyProps={{ variant: 'h6', fontWeight: 700, color: '#495057' }}
                        sx={{ borderBottom: '1px solid #f1f4f6', p: 3, minHeight: '60px' }}
                        action={
                            <Button variant="outlined" size="small" sx={{ color: '#3f6ad8', borderColor: '#3f6ad8', textTransform: 'none' }}>
                                View Details
                            </Button>
                        }
                    />
                    <CardContent sx={{ p: 3 }}>
                        <Box sx={{ height: 350 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={bigChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3f6ad8" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#3f6ad8" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3ac47d" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#3ac47d" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#adb5bd' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#adb5bd' }} />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '4px', border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
                                    />
                                    <Area type="monotone" dataKey="uv" stroke="#3f6ad8" fillOpacity={1} fill="url(#colorUv)" />
                                    <Area type="monotone" dataKey="pv" stroke="#3ac47d" fillOpacity={1} fill="url(#colorPv)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </Box>
                    </CardContent>
                </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
                <Card sx={{ borderRadius: '0.25rem', height: '100%', boxShadow: '0 0.46875rem 2.1875rem rgba(4, 9, 20, 0.03)' }}>
                    <CardHeader
                        title="Technical Support"
                        titleTypographyProps={{ variant: 'h6', fontWeight: 700, color: '#495057' }}
                        sx={{ borderBottom: '1px solid #f1f4f6', p: 3, minHeight: '60px' }}
                    />
                    <CardContent sx={{ p: 3 }}>
                        {[
                            { label: 'Assigned', value: '45', color: '#545cd8' },
                            { label: 'Pending', value: '12', color: '#f7b924' },
                            { label: 'Resolved', value: '68', color: '#3ac47d' },
                            { label: 'Closed', value: '32', color: '#495057' }
                        ].map((item, idx) => (
                            <Box key={idx} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, pb: 1, borderBottom: idx < 3 ? '1px solid #f1f4f6' : 'none' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: item.color, mr: 1.5 }} />
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{item.label}</Typography>
                                </Box>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: item.color }}>{item.value}</Typography>
                            </Box>
                        ))}
                        <Box sx={{ mt: 2, pt: 2, display: 'flex', justifyContent: 'center' }}>
                            <Button variant="text" size="small" sx={{ color: '#3f6ad8', fontSize: '0.75rem', fontWeight: 700, textTransform: 'none' }}>
                                View All Support Tickets
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            </Grid>
        </Grid>
    </Box>
);

export default Dashboard;
