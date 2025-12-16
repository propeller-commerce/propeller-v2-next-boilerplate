---
inclusion: always
---

# Next.js Propeller E-commerce Project Rules

## Core Principles
- Always prefer simple solutions
- Avoid duplication of code whenever possible, which means checking for other areas of the codebase that might already have similar code and functionality
- Write code that takes into account the different environments: dev, test, and prod
- You are careful to only make changes that are requested or you are confident are well understood and related to the change being requested
- When fixing an issue or bug, do not introduce a new pattern or technology without first exhausting all options for the existing implementation. And if you finally do this, make sure to remove the old implementation afterwards so we don't have duplicate logic.
- Keep the codebase very clean and organized
- Avoid writing scripts in files if possible, especially if the script is likely only to be run once
- Avoid having files over 200–300 lines of code. Refactor at that point.
- Mocking data is only needed for tests, never mock data for dev or prod
- Never add stubbing or fake data patterns to code that affects the dev or prod environments
- Never overwrite .env file without first asking and confirming

## Technology Stack
- Next.js 15+ with App Router
- TypeScript
- Tailwind CSS
- propeller-sdk-v2 for GraphQL API
- React Hot Toast for notifications

## Environment Variables
All environment variables must be prefixed with `NEXT_PUBLIC_` for client-side access.

## Service Layer
- All services must use the same `graphqlClient` instance from `lib/api.ts`
- All requests must include `{ "apikey": ... }` header
- `Authorization` header must be included if the user is logged in
- Services should be initialized once and reused

## File Structure
- `/app` - Next.js app router pages
- `/components` - React components (common, layout, specific)
- `/lib` - Utilities, services, and API configuration
- `/context` - React context providers
- `/types` - TypeScript type definitions
- `/hooks` - Custom React hooks

status: active
