import mysql from 'mysql2/promise';

async function initDb() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: '',
        database: 'boilerplate',
    });

    console.log('Connected to MySQL');

    await connection.execute(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      first_name VARCHAR(255) NOT NULL,
      middle_name VARCHAR(255),
      last_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      telephone VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_VALUE,
      updated_at TIMESTAMP DEFAULT CURRENT_VALUE ON UPDATE CURRENT_VALUE
    )
  `).catch(async (err) => {
        // If table creation fails because of CURRENT_VALUE (MariaDB/MySQL version diff), try with CURRENT_TIMESTAMP
        if (err.message.includes('CURRENT_VALUE')) {
            await connection.execute(`
        CREATE TABLE IF NOT EXISTS admin_users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          first_name VARCHAR(255) NOT NULL,
          middle_name VARCHAR(255),
          last_name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          telephone VARCHAR(20),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
        } else {
            throw err;
        }
    });

    console.log('Table admin_users checked/created');
    await connection.end();
}

initDb().catch(console.error);
