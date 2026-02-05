import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const [rows]: any = await pool.execute(
            'SELECT id, first_name, middle_name, last_name, email, telephone, created_at, updated_at FROM admin_users WHERE id = ?',
            [id]
        );

        if (rows.length === 0) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(rows[0]);
    } catch (error) {
        console.error('Get user error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { first_name, middle_name, last_name, email, password, telephone } = body;

        let query = 'UPDATE admin_users SET first_name = ?, middle_name = ?, last_name = ?, email = ?, telephone = ?';
        const queryParams: any[] = [first_name, middle_name || null, last_name, email, telephone || null];

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            query += ', password = ?';
            queryParams.push(hashedPassword);
        }

        query += ' WHERE id = ?';
        queryParams.push(id);

        await pool.execute(query, queryParams);

        return NextResponse.json({ id, ...body, password: undefined });
    } catch (error: any) {
        if (error.code === 'ER_DUP_ENTRY') {
            return NextResponse.json({ message: 'Email already exists' }, { status: 400 });
        }
        console.error('Update user error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await pool.execute('DELETE FROM admin_users WHERE id = ?', [id]);
        return NextResponse.json({ id });
    } catch (error) {
        console.error('Delete user error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
