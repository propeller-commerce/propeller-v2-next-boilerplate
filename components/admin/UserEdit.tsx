'use client';

import {
    Edit,
    SimpleForm,
    TextInput,
    PasswordInput,
    required,
    email,
    SaveButton,
} from 'react-admin';
import { Box, Card, CardContent, CardHeader, Grid, Button, Typography } from '@mui/material';
import { ArrowLeft, Edit as EditIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CustomToolbar = () => null;

export const UserEdit = () => {
    const navigate = useNavigate();

    return (
        <Edit sx={{ '& .RaEdit-main': { backgroundColor: 'transparent', boxShadow: 'none' } }}>
            <SimpleForm
                toolbar={<CustomToolbar />}
                sx={{ p: 0, '& .RaSimpleForm-content': { p: 0 } }}
            >
                <Box sx={{ p: { xs: 2, md: 3 }, backgroundColor: '#f1f4f6', minHeight: 'calc(100vh - 60px)' }}>
                    <Card sx={{
                        boxShadow: '0 0.46875rem 2.1875rem rgba(4, 9, 20, 0.03), 0 0.9375rem 1.40625rem rgba(4, 9, 20, 0.03), 0 0.25rem 0.53125rem rgba(4, 9, 20, 0.05), 0 0.125rem 0.1875rem rgba(4, 9, 20, 0.03)',
                        border: '1px solid rgba(0,0,0,0.125)',
                        borderRadius: '4px',
                        overflow: 'visible'
                    }}>
                        <CardHeader
                            title={
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Box
                                        sx={{
                                            mr: 2,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: 42,
                                            height: 42,
                                            borderRadius: '50%',
                                            backgroundColor: 'rgba(63, 106, 216, 0.1)',
                                            color: '#3f6ad8'
                                        }}
                                    >
                                        <EditIcon size={20} />
                                    </Box>
                                    <Box>
                                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'rgba(13, 27, 62, 0.7)', fontSize: '1.1rem' }}>
                                            Edit User
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#6c757d', fontSize: '0.8rem' }}>
                                            Modify administrator details below
                                        </Typography>
                                    </Box>
                                </Box>
                            }
                            action={
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button
                                        variant="outlined"
                                        startIcon={<ArrowLeft size={16} />}
                                        onClick={() => navigate('/users')}
                                        sx={{
                                            color: '#d92550',
                                            borderColor: '#d92550',
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            '&:hover': { borderColor: '#a71d3d', backgroundColor: 'rgba(217, 37, 80, 0.05)' }
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <SaveButton
                                        type="button"
                                        label="Save Changes"
                                        icon={<></>}
                                        sx={{
                                            backgroundColor: '#3f6ad8', // Primary Blue for Edit
                                            boxShadow: '0 0.125rem 0.625rem rgba(63, 106, 216, 0.4)',
                                            color: '#fff',
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            px: 3,
                                            '&:hover': { backgroundColor: '#3452b4' }
                                        }}
                                    />
                                </Box>
                            }
                            sx={{
                                p: 3,
                                borderBottom: '1px solid rgba(0,0,0,0.125)',
                                backgroundColor: '#fff',
                                position: 'sticky',
                                top: 0,
                                zIndex: 10
                            }}
                        />
                        <CardContent sx={{ p: 4 }}>
                            <Grid container spacing={3}>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextInput source="first_name" label="First Name" validate={[required()]} fullWidth variant="outlined" />
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextInput source="middle_name" label="Middle Name" fullWidth variant="outlined" />
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextInput source="last_name" label="Last Name" validate={[required()]} fullWidth variant="outlined" />
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextInput source="email" label="Email" validate={[required(), email()]} fullWidth variant="outlined" />
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <PasswordInput source="password" label="Password (leave empty to keep current)" fullWidth variant="outlined" />
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextInput source="telephone" label="Telephone" fullWidth variant="outlined" />
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Box>
            </SimpleForm>
        </Edit>
    );
};
