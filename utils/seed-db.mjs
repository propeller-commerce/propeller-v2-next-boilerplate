import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

async function seedDb() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: '',
        database: 'boilerplate',
    });

    console.log('Connected to MySQL for seeding');

    const email = 'admin@example.com';
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const [rows] = await connection.execute('SELECT * FROM admin_users WHERE email = ?', [email]);

    if (rows.length === 0) {
        await connection.execute(
            'INSERT INTO admin_users (first_name, last_name, email, password, telephone) VALUES (?, ?, ?, ?, ?)',
            ['Admin', 'User', email, hashedPassword, '1234567890']
        );
        console.log('Initial admin user created');
    } else {
        console.log('Admin user already exists');
    }

    await connection.end();
}

seedDb().catch(console.error);
