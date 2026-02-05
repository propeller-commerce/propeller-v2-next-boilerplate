import simpleRestProvider from 'ra-data-simple-rest';
import { fetchUtils } from 'react-admin';

const fetchJson = (url: string, options: any = {}) => {
    if (!options.headers) {
        options.headers = new Headers({ Accept: 'application/json' });
    }
    const auth = JSON.parse(localStorage.getItem('admin_auth') || '{}');
    if (auth && auth.token) {
        options.headers.set('Authorization', `Bearer ${auth.token}`);
    }
    return fetchUtils.fetchJson(url, options);
};

export const dataProvider = simpleRestProvider('/api/admin', fetchJson);
