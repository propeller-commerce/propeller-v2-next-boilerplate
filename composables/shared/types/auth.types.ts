import type { Contact, Customer, GraphQLClient } from 'propeller-sdk-v2';

export interface LoginCredentials {
  email: string;
  password: string;
}

export type LoginResult =
  | { success: true; user: Contact | Customer }
  | { success: false; error: string };

export interface RegisterContactInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  phone?: string;
}

export interface RegisterCustomerInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export type RegisterResult =
  | { success: true; user: Contact | Customer }
  | { success: false; error: string };

export type ForgotPasswordResult =
  | { success: true }
  | { success: false; error: string };

export interface AuthOptions {
  graphqlClient: GraphQLClient;
  language?: string;
  /** Called after successful login to update auth header */
  onAuthHeaderUpdate?: (token: string) => void;
}

export type { Contact, Customer };
