'use client';

import { Login, LoginForm } from 'react-admin';

const MyLoginForm = (props: any) => (
    <LoginForm {...props} />
);

const MyLoginPage = (props: any) => (
    <Login {...props}>
        <MyLoginForm />
    </Login>
);

export default MyLoginPage;
