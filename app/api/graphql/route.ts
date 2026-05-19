import { NextRequest, NextResponse } from 'next/server';

const GRAPHQL_ENDPOINT = process.env.BOILERPLATE_GRAPHQL_ENDPOINT || '';
const API_KEY = process.env.BOILERPLATE_API_KEY || '';

const isDev = process.env.NODE_ENV !== 'production';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (isDev) {
      // Dev-only: query/variables can contain PII (cart contents, contact data).
      // Never log them in production.
      console.log('📤 GraphQL Proxy Request:', {
        endpoint: GRAPHQL_ENDPOINT,
        hasApiKey: !!API_KEY,
        query: body.query?.substring(0, 100) + '...',
        variables: body.variables,
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': API_KEY,
    };

    // Auth precedence:
    // 1. httpOnly `access_token` cookie (the secure path — token never exposed
    //    to client JS; survives page reloads).
    // 2. Client `Authorization` header — transitional fallback only, so the
    //    same-session in-memory SDK token keeps working during the cookie
    //    migration. Remove once all callers rely on the cookie.
    const cookieToken = request.cookies.get('access_token')?.value;
    const authHeader = request.headers.get('authorization');

    if (cookieToken) {
      headers['Authorization'] = `Bearer ${cookieToken}`;
    } else if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      if (isDev) {
        console.error('❌ GraphQL Error Response:', { status: response.status, data });
      } else {
        // Production: status only — `data` can echo back the query/variables.
        console.error(`❌ GraphQL upstream error (status ${response.status})`);
      }
      return NextResponse.json(
        { error: 'GraphQL request failed', details: data },
        { status: response.status }
      );
    }

    if (isDev) {
      console.log('✅ GraphQL Success');
    }
    return NextResponse.json(data);
  } catch (error) {
    if (isDev) {
      console.error('❌ GraphQL proxy error:', error);
    } else {
      console.error('❌ GraphQL proxy error');
    }
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
