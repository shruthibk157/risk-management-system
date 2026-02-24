const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'risk_management',
  multipleStatements: true
};

async function setup() {
  let connection;

  try {
    console.log('Connecting to MySQL...');

    // Try to connect first
    try {
      connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: ''
      });
      console.log('✓ Connected to MySQL');
    } catch (err) {
      console.error('✗ Cannot connect to MySQL:', err.message);
      console.log('\nMake sure:');
      console.log('1. MySQL server is running');
      console.log('2. You have created the database: CREATE DATABASE risk_management;');
      console.log('3. MySQL credentials are correct (default: root with empty password)');
      process.exit(1);
    }

    // Create database if not exists
    console.log('\nCreating database...');
    await connection.query('CREATE DATABASE IF NOT EXISTS risk_management');
    console.log('✓ Database "risk_management" ready');

    // Switch to the database
    await connection.query('USE risk_management');

    console.log('\nCreating tables...');

    // Create departments table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        head_user_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Departments table');

    // Create users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        role ENUM('admin', 'department_head', 'risk_owner') NOT NULL DEFAULT 'risk_owner',
        department_id INT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
      )
    `);
    console.log('✓ Users table');

    // Add head_user_id foreign key after both tables are created
    try {
      await connection.query('ALTER TABLE departments ADD CONSTRAINT fk_head_user FOREIGN KEY (head_user_id) REFERENCES users(id) ON DELETE SET NULL');
    } catch (err) {
      // Ignore if constraint already exists
    }

    // Create risks table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS risks (
        id INT PRIMARY KEY AUTO_INCREMENT,
        risk_id VARCHAR(20) NOT NULL UNIQUE,
        sl_no INT NOT NULL,
        department_id INT NOT NULL,
        process_function VARCHAR(200),
        risk_description TEXT NOT NULL,
        potential_failure_mode TEXT,
        potential_effects TEXT,
        severity INT NOT NULL,
        potential_causes TEXT,
        current_controls_prevention TEXT,
        occurrence INT NOT NULL,
        current_controls_detection TEXT,
        detection INT NOT NULL,
        rpn INT,
        risk_classification VARCHAR(50),
        recommended_actions TEXT,
        action_status_results TEXT,
        created_by INT NOT NULL,
        updated_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE (department_id, sl_no),
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT,
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (updated_by) REFERENCES users(id)
      )
    `);
    console.log('✓ Risks table');

    // Create other tables...
    await connection.query(`
      CREATE TABLE IF NOT EXISTS risk_reviews (
        id INT PRIMARY KEY AUTO_INCREMENT,
        risk_id INT NOT NULL,
        review_date DATE NOT NULL,
        severity INT,
        occurrence INT,
        detection INT,
        rpn INT,
        notes TEXT,
        reviewed_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (risk_id) REFERENCES risks(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewed_by) REFERENCES users(id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS actions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        risk_id INT NOT NULL,
        action_type ENUM('preventive', 'mitigation') NOT NULL,
        action_description TEXT NOT NULL,
        action_owner VARCHAR(100) NOT NULL,
        due_date DATE NOT NULL,
        status ENUM('open', 'in_progress', 'completed', 'overdue') DEFAULT 'open',
        completion_date DATE,
        created_by INT NOT NULL,
        updated_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (risk_id) REFERENCES risks(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (updated_by) REFERENCES users(id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT,
        action VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INT,
        old_values JSON,
        new_values JSON,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id INT PRIMARY KEY AUTO_INCREMENT,
        filename VARCHAR(255) NOT NULL,
        stored_filename VARCHAR(255) NOT NULL UNIQUE,
        file_path VARCHAR(500) NOT NULL,
        file_size BIGINT NOT NULL,
        mime_type VARCHAR(100),
        department_id INT NOT NULL,
        uploaded_by INT NOT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_department (department_id),
        INDEX idx_uploaded_at (uploaded_at)
      )
    `);
    console.log('✓ Reviews, Actions, Audit, and Documents tables');

    console.log('\nSeeding departments...');
    await connection.query(`
      INSERT IGNORE INTO departments (id, name, description) VALUES
        (1, 'IT', 'Information Technology Department'),
        (2, 'Finance', 'Finance and Accounting Department'),
        (3, 'HR', 'Human Resources Department'),
        (4, 'Operations', 'Operations Department'),
        (5, 'Compliance', 'Compliance Department'),
        (6, 'Sales', 'Sales Department')
    `);
    console.log('✓ Departments seeded');

    console.log('\nSeeding users...');
    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash('admin123', salt);
    const userPassword = await bcrypt.hash('password123', salt);

    await connection.query(`
      INSERT IGNORE INTO users (id, username, password_hash, full_name, email, role, department_id) VALUES
        (1, 'admin', ?, 'System Administrator', 'admin@company.com', 'admin', NULL),
        (2, 'it_head', ?, 'John Smith', 'john.smith@company.com', 'department_head', 1),
        (3, 'finance_head', ?, 'Sarah Johnson', 'sarah.johnson@company.com', 'department_head', 2),
        (4, 'hr_owner', ?, 'Michael Brown', 'michael.brown@company.com', 'risk_owner', 3),
        (5, 'ops_owner', ?, 'Emily Davis', 'emily.davis@company.com', 'risk_owner', 4),
        (6, 'comp_head', ?, 'David Wilson', 'david.wilson@company.com', 'department_head', 5),
        (7, 'sales_owner', ?, 'Jennifer Lee', 'jennifer.lee@company.com', 'risk_owner', 6)
    `, [adminPassword, userPassword, userPassword, userPassword, userPassword, userPassword, userPassword]);
    
    // Update department heads
    await connection.query('UPDATE departments SET head_user_id = 2 WHERE id = 1');
    await connection.query('UPDATE departments SET head_user_id = 3 WHERE id = 2');
    await connection.query('UPDATE departments SET head_user_id = 6 WHERE id = 5');
    
    console.log('✓ Users seeded');

    console.log('\nSeeding sample risks...');
    await connection.query(`
      INSERT IGNORE INTO risks (risk_id, sl_no, department_id, process_function, risk_description, potential_failure_mode, potential_effects, severity, potential_causes, current_controls_prevention, occurrence, current_controls_detection, detection, rpn, risk_classification, recommended_actions, created_by) VALUES
        ('RISK-0001', 1, 1, 'Data Center', 'Server hardware failure', 'Hardware component failure', 'Business disruption', 8, 'Aging hardware', 'Redundant power', 3, 'Monitoring systems', 4, 96, 'Tracked / Monitored', 'Implement clustering', 2),
        ('RISK-0002', 2, 1, 'Cybersecurity', 'Ransomware attack', 'Malware encryption', 'Complete shutdown', 9, 'Phishing attacks', 'Email filtering', 4, 'SIEM monitoring', 3, 108, 'Tracked / Monitored', 'Zero-trust architecture', 2),
        ('RISK-0003', 1, 2, 'Financial Reporting', 'Material misstatement', 'Accounting errors', 'Regulatory penalties', 8, 'Complex transactions', 'Internal controls', 2, 'External audit', 4, 64, 'Tracked / Monitored', 'Automated validation', 3),
        ('RISK-0004', 1, 3, 'Employee Safety', 'Workplace injury', 'Slips, trips, falls', 'Employee harm', 9, 'Unsafe conditions', 'Safety protocols', 3, 'Safety inspections', 4, 108, 'Tracked / Monitored', 'Safety management system', 4),
        ('RISK-0005', 1, 4, 'Production', 'Equipment breakdown', 'Mechanical failure', 'Production delays', 7, 'Poor maintenance', 'Preventive maintenance', 3, 'Condition monitoring', 4, 84, 'Tracked / Monitored', 'Upgrade equipment', 5)
    `);
    console.log('✓ Sample risks seeded');

    console.log('\n' + '='.repeat(50));
    console.log('✓ Database setup completed successfully!');
    console.log('='.repeat(50));
    console.log('\nTest Credentials:');
    console.log('-----------------');
    console.log('Admin:     admin / admin123');
    console.log('IT User:   it_user / password123');
    console.log('Finance:   finance_user / password123');
    console.log('HR User:   hr_user / password123');
    console.log('Operations: ops_user / password123');
    console.log('Compliance: comp_user / password123');
    console.log('Sales:     sales_user / password123');
    console.log('\nNow start the backend: pnpm run dev');
    console.log('Then start the frontend and login!\n');

  } catch (error) {
    console.error('\n✗ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setup();
