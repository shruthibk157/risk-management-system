const mysql = require('mysql2/promise');

async function diagnose() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'risk_management'
        });

        console.log('\n--- Users ---');
        const [users] = await connection.query('SELECT id, username, email, role, department_id, is_active FROM users');
        console.table(users);

        console.log('\n--- Departments ---');
        const [departments] = await connection.query('SELECT * FROM departments');
        console.table(departments);

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

diagnose();
