const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function diagnose() {
  console.log('='.repeat(60));
  console.log('Risk Management System - Login Diagnostics');
  console.log('='.repeat(60));
  console.log();

  let connection;
  
  try {
    // Test 1: Connect to MySQL
    console.log('1. Testing MySQL connection...');
    try {
      connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'YOUR_PASSWORD_HERE'  // Replace with your MySQL password
      });
      console.log('   ✓ Connected to MySQL server');
    } catch (err) {
      console.log('   ✗ Failed to connect to MySQL');
      console.log('   Error:', err.message);
      console.log('   \nMake sure MySQL is running (XAMPP/WAMP/MySQL Service)');
      process.exit(1);
    }

    // Test 2: Check database exists
    console.log('\n2. Checking database...');
    const [dbs] = await connection.query("SHOW DATABASES LIKE 'risk_management'");
    if (dbs.length === 0) {
      console.log('   Database "risk_management" does not exist');
      console.log('   Creating it now...');
      await connection.query('CREATE DATABASE risk_management');
      console.log('   ✓ Database created');
    } else {
      console.log('   ✓ Database exists');
    }

    await connection.query('USE risk_management');

    // Test 3: Check tables
    console.log('\n3. Checking tables...');
    const [tables] = await connection.query("SHOW TABLES");
    console.log(`   Found ${tables.length} tables`);
    
    const tableNames = tables.map(t => Object.values(t)[0]);
    if (!tableNames.includes('users')) {
      console.log('   ⚠ Users table does not exist, will create...');
    } else {
      console.log('   ✓ Users table exists');
    }

    // Test 4: Check users
    console.log('\n4. Checking users...');
    const [users] = await connection.query('SELECT id, username, role FROM users');
    
    if (users.length === 0) {
      console.log('   ⚠ No users found, seeding now...');
      
      const salt = await bcrypt.genSalt(10);
      const adminPassword = await bcrypt.hash('admin123', salt);
      const userPassword = await bcrypt.hash('password123', salt);
      
      // Create tables first
      await connection.query(`
        CREATE TABLE IF NOT EXISTS departments (
          id INT PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(100) NOT NULL UNIQUE,
          description TEXT
        )
      `);
      
      await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT PRIMARY KEY AUTO_INCREMENT,
          username VARCHAR(50) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          full_name VARCHAR(100) NOT NULL,
          email VARCHAR(100) NOT NULL UNIQUE,
          role ENUM('admin', 'department_user') NOT NULL DEFAULT 'department_user',
          department_id INT,
          is_active BOOLEAN DEFAULT TRUE
        )
      `);
      
      // Seed departments
      await connection.query(`
        INSERT IGNORE INTO departments (id, name, description) VALUES
          (1, 'IT', 'Information Technology'),
          (2, 'Finance', 'Finance and Accounting'),
          (3, 'HR', 'Human Resources'),
          (4, 'Operations', 'Operations'),
          (5, 'Compliance', 'Compliance'),
          (6, 'Sales', 'Sales')
      `);
      
      // Seed users
      await connection.query(`
        INSERT INTO users (id, username, password_hash, full_name, email, role, department_id) VALUES
          (1, 'admin', ?, 'System Administrator', 'admin@company.com', 'admin', NULL),
          (2, 'it_user', ?, 'John Smith', 'john.smith@company.com', 'department_user', 1),
          (3, 'finance_user', ?, 'Sarah Johnson', 'sarah.johnson@company.com', 'department_user', 2)
      `, [adminPassword, userPassword, userPassword]);
      
      console.log('   ✓ Users created');
      
      const [newUsers] = await connection.query('SELECT id, username, role FROM users');
      console.log(`   ${newUsers.length} users now in database`);
    } else {
      console.log(`   ✓ ${users.length} users found`);
      users.forEach(u => console.log(`     - ${u.username} (${u.role})`));
    }

    // Test 5: Verify password
    console.log('\n5. Verifying admin password...');
    const [adminUser] = await connection.query("SELECT * FROM users WHERE username = 'admin'");
    
    if (adminUser.length > 0) {
      const isValid = await bcrypt.compare('admin123', adminUser[0].password_hash);
      if (isValid) {
        console.log('   ✓ Admin password is valid');
      } else {
        console.log('   ⚠ Admin password hash mismatch, resetting...');
        const newHash = await bcrypt.hash('admin123', await bcrypt.genSalt(10));
        await connection.query("UPDATE users SET password_hash = ? WHERE username = 'admin'", [newHash]);
        console.log('   ✓ Admin password reset');
      }
    } else {
      console.log('   ⚠ Admin user not found');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✓ Diagnostics completed successfully!');
    console.log('='.repeat(60));
    console.log('\nTest Credentials:');
    console.log('  Username: admin');
    console.log('  Password: admin123');
    console.log('\nTry logging in again with: admin / admin123');
    console.log();

  } catch (error) {
    console.error('\n✗ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

diagnose();
