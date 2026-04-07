import type { Company, Contact, GraphQLClient } from 'propeller-sdk-v2';

export interface CompanyOptions {
  graphqlClient: GraphQLClient;
  user: Contact | null;
  language?: string;
}

export interface PacConfig {
  id: number;
  contactId: number;
  role: string;
  authorizationLimit: number;
  companyId: number;
}

export interface PacConfigCreateInput {
  contactId: number;
  role: string;
  authorizationLimit: number;
}

export interface PacConfigUpdateInput {
  id: number;
  role?: string;
  authorizationLimit?: number;
}

export type PacConfigResult =
  | { success: true; config: PacConfig }
  | { success: false; error: string };

export type CompanySwitchResult =
  | { success: true; company: Company }
  | { success: false; error: string };

export type { Company, Contact };
