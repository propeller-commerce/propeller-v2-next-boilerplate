import { AuthProvider } from 'react-admin';

export const authProvider: AuthProvider = {
    login: ({ username, password }) => {
        const request = new Request('/api/admin/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email: username, password }),
            headers: new Headers({ 'Content-Type': 'application/json' }),
        });
        return fetch(request)
            .then(response => {
                if (response.status < 200 || response.status >= 300) {
                    throw new Error(response.statusText);
                }
                return response.json();
            })
            .then(auth => {
                localStorage.setItem('admin_auth', JSON.stringify(auth));
            })
            .catch(() => {
                throw new Error('Network error');
            });
    },
    logout: () => {
        localStorage.removeItem('admin_auth');
        return Promise.resolve();
    },
    checkError: (error) => {
        const status = error.status;
        if (status === 401 || status === 403) {
            localStorage.removeItem('admin_auth');
            return Promise.reject();
        }
        return Promise.resolve();
    },
    checkAuth: () => {
        return localStorage.getItem('admin_auth')
            ? Promise.resolve()
            : Promise.reject();
    },
    getPermissions: () => Promise.resolve(),
    getIdentity: () => {
        try {
            const auth = JSON.parse(localStorage.getItem('admin_auth') || '{}');
            return Promise.resolve({
                id: auth.id,
                fullName: auth.fullName,
            });
        } catch (error) {
            return Promise.reject(error);
        }
    },
};
