import { NextRequest, NextResponse } from 'next/server';

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || '';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('📤 GraphQL Proxy Request:', {
      endpoint: GRAPHQL_ENDPOINT,
      hasApiKey: !!API_KEY,
      query: body.query?.substring(0, 100) + '...',
      variables: body.variables
    });
    
    // Get authorization header from request if present
    const authHeader = request.headers.get('authorization');
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': API_KEY,
    };
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ GraphQL Error Response:', {
        status: response.status,
        data
      });
      return NextResponse.json(
        { error: 'GraphQL request failed', details: data },
        { status: response.status }
      );
    }

    console.log('✅ GraphQL Success');
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ GraphQL proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
