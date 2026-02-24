const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./risk_management.db');

db.serialize(() => {
  console.log('Seeding database...');

  // Drop existing tables
  db.run(`DROP TABLE IF EXISTS audit_log`);
  db.run(`DROP TABLE IF EXISTS risk_reviews`);
  db.run(`DROP TABLE IF EXISTS actions`);
  db.run(`DROP TABLE IF EXISTS risks`);
  db.run(`DROP TABLE IF EXISTS users`);
  db.run(`DROP TABLE IF EXISTS departments`);

  // Create departments table
  db.run(`CREATE TABLE departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Create users table
  db.run(`CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
    department_id INTEGER,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments (id)
  )`);

  // Create risks table
  db.run(`CREATE TABLE risks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    department_id INTEGER NOT NULL,
    risk_description TEXT NOT NULL,
    severity INTEGER NOT NULL CHECK (severity >= 1 AND severity <= 10),
    occurrence INTEGER NOT NULL CHECK (occurrence >= 1 AND occurrence <= 10),
    detection INTEGER NOT NULL CHECK (detection >= 1 AND detection <= 10),
    rpn INTEGER GENERATED ALWAYS AS (severity * occurrence * detection) STORED,
    mitigation_plan TEXT,
    risk_owner TEXT,
    review_date DATE,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'mitigated', 'accepted', 'closed')),
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments (id),
    FOREIGN KEY (created_by) REFERENCES users (id)
  )`);

  // Create actions table
  db.run(`CREATE TABLE actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    risk_id INTEGER NOT NULL,
    action_description TEXT NOT NULL,
    responsible_person TEXT,
    due_date DATE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (risk_id) REFERENCES risks (id)
  )`);

  // Create risk reviews table
  db.run(`CREATE TABLE risk_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    risk_id INTEGER NOT NULL,
    reviewer_id INTEGER NOT NULL,
    review_notes TEXT,
    new_rpn INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (risk_id) REFERENCES risks (id),
    FOREIGN KEY (reviewer_id) REFERENCES users (id)
  )`);

  // Create audit log table
  db.run(`CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    details TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Insert departments
  db.run(`INSERT INTO departments (name, description) VALUES
    ('IT', 'Information Technology Department'),
    ('HR', 'Human Resources Department'),
    ('Finance', 'Finance and Accounting Department'),
    ('Operations', 'Operations Department'),
    ('Compliance', 'Compliance and Risk Department')
  `);

  // Insert users (passwords hashed)
  const bcrypt = require('bcryptjs');
  const saltRounds = 10;
  const hash1 = bcrypt.hashSync('admin123', saltRounds);
  const hash2 = bcrypt.hashSync('user123', saltRounds);
  const hash3 = bcrypt.hashSync('user123', saltRounds);
  const hash4 = bcrypt.hashSync('user123', saltRounds);
  const hash5 = bcrypt.hashSync('user123', saltRounds);
  const hash6 = bcrypt.hashSync('user123', saltRounds);

  db.run(`INSERT INTO users (username, email, password_hash, role, department_id) VALUES
    ('admin', 'admin@company.com', ?, 'admin', NULL),
    ('it_user', 'it@company.com', ?, 'user', 1),
    ('hr_user', 'hr@company.com', ?, 'user', 2),
    ('finance_user', 'finance@company.com', ?, 'user', 3),
    ('ops_user', 'ops@company.com', ?, 'user', 4),
    ('compliance_user', 'compliance@company.com', ?, 'user', 5)
  `, [hash1, hash2, hash3, hash4, hash5, hash6]);

  // Insert sample risks
  db.run(`INSERT INTO risks (department_id, risk_description, severity, occurrence, detection, mitigation_plan, risk_owner, review_date, status, created_by) VALUES
    (1, 'Data breach from unauthorized access', 8, 6, 7, 'Implement multi-factor authentication and regular security audits', 'IT Security Team', '2024-02-15', 'open', 1),
    (1, 'System downtime affecting business operations', 7, 5, 6, 'Set up redundant systems and disaster recovery plan', 'IT Operations', '2024-03-01', 'open', 1),
    (2, 'Staff turnover impacting project timelines', 6, 7, 5, 'Improve employee engagement and retention programs', 'HR Manager', '2024-02-28', 'open', 1),
    (3, 'Financial reporting errors', 9, 4, 8, 'Implement automated validation checks and dual approval process', 'Finance Director', '2024-02-20', 'mitigated', 1),
    (4, 'Supply chain disruption', 8, 6, 6, 'Diversify suppliers and maintain safety stock levels', 'Operations Manager', '2024-03-15', 'open', 1),
    (5, 'Regulatory compliance violations', 10, 3, 9, 'Regular compliance training and automated monitoring systems', 'Compliance Officer', '2024-02-10', 'accepted', 1)
  `);

  console.log('✅ Database dropped, recreated, and seeded successfully');
});

db.close();
