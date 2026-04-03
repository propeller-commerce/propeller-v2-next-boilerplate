import type { GraphQLClient, Contact, Customer } from 'propeller-sdk-v2';
import type { AsyncState } from '../core/types';

export interface AuthComposableConfig {
  graphqlClient: GraphQLClient;
}

export interface AuthState extends AsyncState {
  user: Contact | Customer | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResult {
  user: Contact | Customer;
  accessToken: string;
  refreshToken: string;
  expiresAt?: string;
}

export interface AuthComposable {
  getState: () => AuthState;
  subscribe: (listener: () => void) => () => void;
  login: (credentials: LoginCredentials) => Promise<LoginResult>;
  logout: () => void;
  refreshUser: () => Promise<Contact | Customer | null>;
  setUser: (user: Contact | Customer | null) => void;
}
