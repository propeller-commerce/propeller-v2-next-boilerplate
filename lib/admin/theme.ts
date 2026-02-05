import { defaultTheme, RaThemeOptions } from 'react-admin';

export const theme: RaThemeOptions = {
    ...defaultTheme,
    palette: {
        primary: {
            main: '#3f6ad8', // ArchitectUI Primary
        },
        secondary: {
            main: '#6c757d',
        },
        success: {
            main: '#3ac47d',
            contrastText: '#fff',
        },
        error: {
            main: '#d92550',
            contrastText: '#fff',
        },
        warning: {
            main: '#f7b924',
            contrastText: '#fff',
        },
        info: {
            main: '#16aaff',
            contrastText: '#fff',
        },
        background: {
            default: '#f1f4f6',
            paper: '#ffffff',
        },
        text: {
            primary: '#495057',
            secondary: '#6c757d',
        },
    },
    typography: {
        fontFamily: '"Inter", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        fontSize: 14,
        h1: { fontWeight: 700, color: '#495057', fontSize: '2rem' },
        h2: { fontWeight: 700, color: '#495057', fontSize: '1.75rem' },
        h3: { fontWeight: 700, color: '#495057', fontSize: '1.5rem' },
        h4: { fontWeight: 700, color: '#495057', fontSize: '1.25rem' },
        h5: { fontWeight: 700, color: '#495057', fontSize: '1.1rem' },
        h6: { fontWeight: 700, color: '#495057', fontSize: '1rem' },
        body1: { fontSize: '0.88rem', color: '#495057', lineHeight: 1.5 },
        body2: { fontSize: '0.8rem', color: '#6c757d', lineHeight: 1.45 },
        button: { textTransform: 'none', fontWeight: 500 },
    },
    shape: {
        borderRadius: 4,
    },
    components: {
        ...defaultTheme.components,
        MuiPaper: {
            styleOverrides: {
                root: {
                    transition: 'box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
                },
                elevation1: {
                    boxShadow: '0 0.46875rem 2.1875rem rgba(4, 9, 20, 0.03), 0 0.9375rem 1.40625rem rgba(4, 9, 20, 0.03), 0 0.25rem 0.53125rem rgba(4, 9, 20, 0.05), 0 0.125rem 0.1875rem rgba(4, 9, 20, 0.03)',
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.8rem',
                    borderRadius: '0.25rem',
                    transition: 'color 0.15s ease-in-out, background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
                },
                containedPrimary: {
                    backgroundColor: '#3f6ad8',
                    boxShadow: '0 0.125rem 0.625rem rgba(63, 106, 216, 0.4)',
                    '&:hover': {
                        backgroundColor: '#2955c8',
                        boxShadow: '0 0.3125rem 1rem rgba(63, 106, 216, 0.5)',
                    },
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
                        '& fieldset': {
                            borderColor: '#ced4da',
                        },
                        '&:hover fieldset': {
                            borderColor: '#ced4da',
                        },
                        '&.Mui-focused fieldset': {
                            borderColor: '#8a98d3',
                            borderWidth: '1px',
                        },
                        '&.Mui-focused': {
                            boxShadow: '0 0 0 0.2rem rgba(63, 106, 216, 0.25)',
                        },
                    },
                },
            },
        },
        MuiInputLabel: {
            styleOverrides: {
                root: {
                    fontSize: '0.875rem',
                    color: '#495057',
                    '&.Mui-focused': {
                        color: '#3f6ad8',
                    },
                },
            },
        },
        MuiTableHead: {
            styleOverrides: {
                root: {
                    backgroundColor: '#f8f9fa',
                    '& .MuiTableCell-root': {
                        color: '#495057',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        textTransform: 'uppercase',
                        borderBottom: '2px solid #dee2e6',
                    },
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                root: {
                    padding: '0.75rem 1rem',
                    fontSize: '0.88rem',
                    borderBottom: '1px solid #dee2e6',
                    color: '#495057',
                },
            },
        },
        MuiTableRow: {
            styleOverrides: {
                root: {
                    transition: 'background-color 0.15s ease-in-out',
                    '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.02) !important',
                    },
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: '#fff !important',
                    color: '#3f6ad8',
                    backgroundImage: 'none',
                    boxShadow: '0 0.46875rem 2.1875rem rgba(4, 9, 20, 0.03), 0 0.9375rem 1.40625rem rgba(4, 9, 20, 0.03), 0 0.25rem 0.53125rem rgba(4, 9, 20, 0.05), 0 0.125rem 0.1875rem rgba(4, 9, 20, 0.03)',
                },
            },
        },
        RaSidebar: {
            styleOverrides: {
                root: {
                    backgroundColor: '#fff',
                    '& .RaSidebar-fixed': {
                        backgroundColor: '#fff',
                        color: '#343a40',
                        boxShadow: '7px 0 60px rgba(0,0,0,0.05)',
                    },
                },
            },
        },
        RaMenuItemLink: {
            styleOverrides: {
                root: {
                    color: '#343a40',
                    margin: '0.125rem 0.625rem',
                    borderRadius: '0.25rem',
                    padding: '0.625rem 0.9375rem',
                    fontSize: '0.88rem',
                    fontWeight: 400,
                    transition: 'all 0.2s',
                    '&.RaMenuItemLink-active': {
                        color: '#3f6ad8',
                        backgroundColor: '#e0f3ff',
                        fontWeight: 700,
                        '& .RaMenuItemLink-icon': {
                            color: '#3f6ad8',
                        },
                    },
                    '&:hover': {
                        backgroundColor: 'rgba(63, 106, 216, 0.1)',
                        color: '#3f6ad8',
                    },
                },
                icon: {
                    color: '#6c757d',
                    fontSize: '1.25rem',
                    minWidth: '2.5rem',
                },
            },
        },
        MuiTabs: {
            styleOverrides: {
                indicator: {
                    backgroundColor: '#3f6ad8',
                    height: '3px',
                },
            },
        },
        MuiTab: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontWeight: 500,
                    fontSize: '0.9rem',
                    minHeight: '3rem',
                    color: '#495057',
                    opacity: 0.7,
                    '&.Mui-selected': {
                        color: '#3f6ad8',
                        fontWeight: 700,
                        opacity: 1,
                    },
                },
            },
        },
    },
};
