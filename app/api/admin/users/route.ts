import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const sort = JSON.parse(searchParams.get('sort') || '["id", "DESC"]');
        const range = JSON.parse(searchParams.get('range') || '[0, 9]');
        const filter = JSON.parse(searchParams.get('filter') || '{}');

        const [field, order] = sort;
        const [start, end] = range;
        const limit = end - start + 1;
        const offset = start;

        let query = 'SELECT id, first_name, middle_name, last_name, email, telephone, created_at, updated_at FROM admin_users';
        let countQuery = 'SELECT COUNT(*) as total FROM admin_users';
        const params: any[] = [];

        if (Object.keys(filter).length > 0) {
            const conditions = [];
            if (filter.q) {
                conditions.push('(first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)');
                const search = `%${filter.q}%`;
                params.push(search, search, search);
            }
            if (filter.id) {
                conditions.push('id = ?');
                params.push(filter.id);
            }
            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
                countQuery += ' WHERE ' + conditions.join(' AND ');
            }
        }

        query += ` ORDER BY ${field} ${order} LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const [rows]: any = await pool.execute(query, params);
        const [countRows]: any = await pool.execute(countQuery, params.slice(0, params.length - 2));

        const total = countRows[0].total;
        const response = NextResponse.json(rows);
        response.headers.set('X-Total-Count', total.toString());
        response.headers.set('Content-Range', `users ${start}-${Math.min(end, total - 1)}/${total}`);
        response.headers.set('Access-Control-Expose-Headers', 'X-Total-Count, Content-Range');

        return response;
    } catch (error) {
        console.error('List users error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { first_name, middle_name, last_name, email, password, telephone } = body;

        if (!first_name || !last_name || !email || !password) {
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result]: any = await pool.execute(
            'INSERT INTO admin_users (first_name, middle_name, last_name, email, password, telephone) VALUES (?, ?, ?, ?, ?, ?)',
            [first_name, middle_name || null, last_name, email, hashedPassword, telephone || null]
        );

        const id = result.insertId;

        return NextResponse.json({ id, ...body, password: undefined }, { status: 201 });
    } catch (error: any) {
        if (error.code === 'ER_DUP_ENTRY') {
            return NextResponse.json({ message: 'Email already exists' }, { status: 400 });
        }
        console.error('Create user error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
