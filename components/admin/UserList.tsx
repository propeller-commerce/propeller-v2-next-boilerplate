'use client';

import {
    List,
    Datagrid,
    TextField,
    EmailField,
    EditButton,
    DeleteButton,
    TextInput,
} from 'react-admin';
import { Box, Card, CardHeader, Typography, useTheme, Button } from '@mui/material';

const userFilters = [
    <TextInput key="q" source="q" label="Search" alwaysOn />,
];

export const UserList = () => {
    return (
        <Box sx={{ p: { xs: 2, md: 3 }, backgroundColor: '#f1f4f6', minHeight: 'calc(100vh - 60px)' }}>
            <List
                filters={userFilters}
                sx={{
                    '& .RaList-content': {
                        boxShadow: '0 0.46875rem 2.1875rem rgba(4, 9, 20, 0.03), 0 0.9375rem 1.40625rem rgba(4, 9, 20, 0.03), 0 0.25rem 0.53125rem rgba(4, 9, 20, 0.05), 0 0.125rem 0.1875rem rgba(4, 9, 20, 0.03)',
                        backgroundColor: '#ffffff',
                        borderRadius: '4px',
                        border: 'none',
                    },
                    '& .RaList-actions': {
                        marginBottom: 2,
                    }
                }}
                sort={{ field: 'id', order: 'ASC' }}
            >
                <Datagrid
                    rowClick="edit"
                    sx={{
                        '& .RaDatagrid-headerCell': {
                            backgroundColor: '#fff',
                            color: '#545cd8',
                            fontWeight: 500,
                            textTransform: 'uppercase',
                            fontSize: '0.65rem', // ~12px
                            borderBottom: '1px solid #e9ecef',
                            padding: '8.8px 16px',
                        },
                        '& .RaDatagrid-row': {
                            borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
                            transition: 'background-color 0.2s',
                            '&:nth-of-type(even)': {
                                backgroundColor: '#f7f7f7',
                            },
                            '&:hover': {
                                backgroundColor: '#e0f3ff !important',
                            },
                        },
                        '& .RaDatagrid-rowCell': {
                            fontSize: '0.8125rem', // ~13px
                            color: 'rgba(0, 0, 0, 0.87)',
                            padding: '12px 16px',
                            verticalAlign: 'middle',
                        }
                    }}
                >
                    <TextField source="id" />
                    <TextField source="first_name" label="First Name" />
                    <TextField source="middle_name" label="Middle Name" />
                    <TextField source="last_name" label="Last Name" />
                    <EmailField source="email" />
                    <TextField source="telephone" />
                    <EditButton sx={{ color: '#3f6ad8' }} />
                    <DeleteButton sx={{ color: '#d92550' }} />
                </Datagrid>
            </List>
        </Box>
    );
};
