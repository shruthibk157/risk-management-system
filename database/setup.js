const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'risk_management',
  multipleStatements: true
};

const setupDatabase = async () => {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to MySQL database');
    
    console.log('Creating database schema...');
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        role ENUM('admin', 'department_user') NOT NULL DEFAULT 'department_user',
        department_id INT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS risks (
        id INT PRIMARY KEY AUTO_INCREMENT,
        risk_id VARCHAR(20) NOT NULL UNIQUE,
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
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT,
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (updated_by) REFERENCES users(id)
      );

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
      );

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
      );

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
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_entity (entity_type, entity_id),
        INDEX idx_user (user_id),
        INDEX idx_created_at (created_at)
      );

      CREATE TABLE IF NOT EXISTS documents (
        id INT PRIMARY KEY AUTO_INCREMENT,
        filename VARCHAR(255) NOT NULL,
        stored_filename VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INT,
        mime_type VARCHAR(100),
        department_id INT,
        uploaded_by INT,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_documents_department ON documents(department_id);
      CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
      CREATE INDEX IF NOT EXISTS idx_risks_department ON risks(department_id);
      CREATE INDEX IF NOT EXISTS idx_risks_rpn ON risks(rpn);
      CREATE INDEX IF NOT EXISTS idx_actions_risk ON actions(risk_id);
      CREATE INDEX IF NOT EXISTS idx_actions_status ON actions(status);
      CREATE INDEX IF NOT EXISTS idx_actions_due_date ON actions(due_date);
    `);
    
    console.log('Schema created successfully');
    
    console.log('Seeding departments...');
    await connection.query(`
      INSERT IGNORE INTO departments (id, name, description) VALUES
        (1, 'IT', 'Information Technology Department - Responsible for IT infrastructure, systems, and cybersecurity'),
        (2, 'Finance', 'Finance and Accounting Department - Responsible for financial operations and reporting'),
        (3, 'HR', 'Human Resources Department - Responsible for workforce management and employee relations'),
        (4, 'Operations', 'Operations Department - Responsible for core business operations and processes'),
        (5, 'Compliance', 'Compliance Department - Responsible for regulatory compliance and internal controls'),
        (6, 'Sales', 'Sales Department - Responsible for revenue generation and customer relationships')
    `);
    
    console.log('Seeding users...');
    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash('admin123', salt);
    const userPassword = await bcrypt.hash('password123', salt);
    
    await connection.query(`
      INSERT IGNORE INTO users (id, username, password_hash, full_name, email, role, department_id) VALUES
        (1, 'admin', ?, 'System Administrator', 'admin@company.com', 'admin', NULL),
        (2, 'it_user', ?, 'John Smith', 'john.smith@company.com', 'department_user', 1),
        (3, 'finance_user', ?, 'Sarah Johnson', 'sarah.johnson@company.com', 'department_user', 2),
        (4, 'hr_user', ?, 'Michael Brown', 'michael.brown@company.com', 'department_user', 3),
        (5, 'ops_user', ?, 'Emily Davis', 'emily.davis@company.com', 'department_user', 4),
        (6, 'comp_user', ?, 'David Wilson', 'david.wilson@company.com', 'department_user', 5),
        (7, 'sales_user', ?, 'Jennifer Lee', 'jennifer.lee@company.com', 'department_user', 6)
    `, [adminPassword, userPassword, userPassword, userPassword, userPassword, userPassword, userPassword]);
    
    console.log('Seeding risks...');
    await connection.query(`
      INSERT IGNORE INTO risks (risk_id, department_id, process_function, risk_description, potential_failure_mode, potential_effects, severity, potential_causes, current_controls_prevention, occurrence, current_controls_detection, detection, rpn, risk_classification, recommended_actions, created_by) VALUES
        ('RISK-0001', 1, 'Data Center Operations', 'Server hardware failure leading to system unavailability', 'Hardware component failure', 'Business operations disruption, revenue loss, customer dissatisfaction', 8, 'Aging hardware, power surges, thermal issues', 'Redundant power supplies, regular hardware maintenance', 3, 'Monitoring systems, automated alerts', 4, 96, 'Tracked / Monitored', 'Implement hypervisor clustering, establish disaster recovery site', 2),
        ('RISK-0002', 1, 'Cybersecurity', 'Ransomware attack on corporate systems', 'Malware encryption of critical data', 'Complete business shutdown, financial loss, reputational damage', 9, 'Phishing attacks, unpatched software, weak access controls', 'Email filtering, endpoint protection, regular patching', 4, 'Security operations center, SIEM monitoring', 3, 108, 'Tracked / Monitored', 'Conduct regular security awareness training, implement zero-trust architecture', 2),
        ('RISK-0003', 1, 'Cloud Infrastructure', 'Cloud service provider outage', 'Third-party service disruption', 'Application downtime, data inaccessibility', 7, 'Provider infrastructure failure, API issues', 'Multi-region deployment, data backup', 2, 'Service health dashboards, status monitoring', 3, 42, 'Tracked / Monitored', 'Implement multi-cloud strategy, develop cloud-agnostic architecture', 2),
        ('RISK-0004', 2, 'Financial Reporting', 'Material misstatement in financial statements', 'Accounting errors, fraud', 'Regulatory penalties, loss of investor confidence', 8, 'Complex transactions, inadequate review processes', 'Internal controls, segregation of duties', 2, 'External audit procedures', 4, 64, 'Tracked / Monitored', 'Enhance reconciliation processes, implement automated validation', 3),
        ('RISK-0005', 2, 'Treasury Management', 'Cash flow shortfall affecting operations', 'Insufficient liquidity', 'Unable to meet operational expenses, supplier relationships damaged', 7, 'Delayed receivables, unexpected expenses', 'Cash flow forecasting, credit facilities', 3, 'Daily cash position monitoring', 5, 105, 'Tracked / Monitored', 'Strengthen collections process, diversify funding sources', 3),
        ('RISK-0006', 3, 'Employee Safety', 'Workplace injury incident', 'Slips, trips, falls, equipment accidents', 'Employee harm, regulatory fines, litigation', 9, 'Unsafe conditions, inadequate training', 'Safety protocols, PPE requirements', 3, 'Safety inspections, incident reporting', 4, 108, 'Tracked / Monitored', 'Implement safety management system, enhance training programs', 4),
        ('RISK-0007', 3, 'Talent Management', 'Key personnel resignation', 'Loss of critical knowledge and expertise', 'Project delays, quality degradation', 6, 'Competitive job market, low engagement', 'Competitive compensation, development opportunities', 4, 'Stay interviews, engagement surveys', 5, 120, 'Tracked / Monitored', 'Implement succession planning, enhance employee value proposition', 4),
        ('RISK-0008', 4, 'Production Operations', 'Equipment breakdown causing production halt', 'Mechanical failure, wear and tear', 'Production delays, order cancellations, revenue loss', 7, 'Poor maintenance, aging equipment', 'Preventive maintenance schedule', 3, 'Condition monitoring, predictive maintenance', 4, 84, 'Tracked / Monitored', 'Invest in new equipment, optimize maintenance strategy', 5),
        ('RISK-0009', 4, 'Supply Chain', 'Critical supplier bankruptcy', 'Supply disruption', 'Production stoppage, customer impacts', 8, 'Supplier financial instability, market conditions', 'Supplier diversification, contract terms', 2, 'Supplier financial monitoring', 4, 64, 'Tracked / Monitored', 'Develop alternative suppliers, strategic inventory buffers', 5),
        ('RISK-0010', 5, 'Regulatory Compliance', 'GDPR data protection violation', 'Improper data handling, consent issues', 'Regulatory fines up to 4% of revenue, reputational damage', 9, 'Inadequate data governance, process gaps', 'Privacy policies, data mapping', 3, 'Data audits, access reviews', 3, 81, 'Tracked / Monitored', 'Implement comprehensive data governance framework', 6),
        ('RISK-0011', 5, 'Internal Controls', 'Fraudulent activity in expense reporting', 'Misappropriation of funds', 'Financial loss, policy violations', 5, 'Weak approval processes, lack of oversight', 'Expense policy, manager approval', 3, 'Periodic audits, exception reporting', 6, 90, 'Tracked / Monitored', 'Implement automated expense validation, enhance monitoring', 6),
        ('RISK-0012', 6, 'Sales Operations', 'Major account churn', 'Customer dissatisfaction, competitive losses', 'Revenue decline, market share loss', 7, 'Service quality issues, pricing concerns', 'Account management, regular reviews', 3, 'Customer satisfaction surveys', 4, 84, 'Tracked / Monitored', 'Enhance customer success program, competitive intelligence', 7),
        ('RISK-0013', 1, 'Data Management', 'Data breach exposing customer information', 'Unauthorized access, insider threat', 'Customer data compromise, regulatory action, reputation damage', 10, 'Weak access controls, social engineering', 'Access management, encryption', 3, 'Security monitoring, DLP tools', 3, 90, 'Tracked / Monitored', 'Implement data classification, enhance access governance', 2),
        ('RISK-0014', 2, 'Tax Compliance', 'Late or incorrect tax filings', 'Calculation errors, missed deadlines', 'Penalties, interest, regulatory scrutiny', 6, 'Complex regulations, process gaps', 'Tax calendar, review procedures', 2, 'External tax advice, filing verification', 5, 60, 'Tracked / Monitored', 'Automate tax calculations, enhance review process', 3),
        ('RISK-0015', 3, 'HR Compliance', 'Wrongful termination lawsuit', 'Improper documentation, biased decisions', 'Legal costs, settlements, reputational damage', 7, 'Inconsistent processes, poor documentation', 'HR policies, manager training', 2, 'HR audits, legal review', 5, 70, 'Tracked / Monitored', 'Enhance documentation practices, strengthen investigation process', 4)
    `);
    
    console.log('Seeding actions...');
    await connection.query(`
      INSERT IGNORE INTO actions (risk_id, action_type, action_description, action_owner, due_date, status, created_by) VALUES
        (1, 'preventive', 'Implement hypervisor clustering across all production servers', 'John Smith', '2026-03-31', 'in_progress', 2),
        (1, 'mitigation', 'Establish disaster recovery site with RTO < 4 hours', 'John Smith', '2026-06-30', 'open', 2),
        (2, 'preventive', 'Deploy zero-trust security architecture', 'IT Security Team', '2026-04-30', 'in_progress', 2),
        (2, 'mitigation', 'Develop incident response playbook for ransomware', 'IT Security Team', '2026-02-28', 'completed', 2),
        (3, 'preventive', 'Implement multi-cloud orchestration platform', 'Cloud Architect', '2026-05-31', 'open', 2),
        (4, 'preventive', 'Implement automated financial reconciliation system', 'Finance Manager', '2026-04-15', 'in_progress', 3),
        (5, 'mitigation', 'Accelerate collections on overdue receivables', 'AR Manager', '2026-02-15', 'in_progress', 3),
        (6, 'preventive', 'Deploy safety management system across all locations', 'HR Director', '2026-03-31', 'in_progress', 4),
        (7, 'mitigation', 'Implement succession planning for critical roles', 'HR Manager', '2026-04-30', 'open', 4),
        (8, 'preventive', 'Upgrade critical production equipment', 'Operations Director', '2026-06-30', 'open', 5),
        (9, 'mitigation', 'Qualify alternative suppliers for critical components', 'Procurement Manager', '2026-03-31', 'in_progress', 5),
        (10, 'preventive', 'Implement enterprise data governance framework', 'Compliance Officer', '2026-05-31', 'in_progress', 6),
        (11, 'mitigation', 'Deploy automated expense fraud detection', 'Internal Audit', '2026-03-15', 'open', 6),
        (12, 'mitigation', 'Launch customer success excellence program', 'Sales Director', '2026-04-30', 'in_progress', 7),
        (13, 'preventive', 'Implement enhanced access governance program', 'CISO', '2026-02-28', 'in_progress', 2),
        (14, 'mitigation', 'Automate tax calculation and filing processes', 'Tax Manager', '2026-03-31', 'open', 3),
        (15, 'preventive', 'Enhance HR documentation and investigation processes', 'HR Director', '2026-03-31', 'completed', 4)
    `);
    
    console.log('Seeding risk reviews...');
    await connection.query(`
      INSERT IGNORE INTO risk_reviews (risk_id, review_date, severity, occurrence, detection, rpn, notes, reviewed_by) VALUES
        (1, '2025-10-01', 8, 3, 4, 96, 'Quarterly review - no significant changes', 2),
        (1, '2025-07-01', 8, 3, 4, 96, 'Initial assessment complete', 2),
        (2, '2025-10-01', 9, 4, 3, 108, 'Increased threat landscape observed', 2),
        (2, '2025-07-01', 9, 3, 3, 81, 'Ongoing monitoring required', 2),
        (3, '2025-10-01', 7, 2, 3, 42, 'Multi-region deployment in progress', 2),
        (4, '2025-10-01', 8, 2, 4, 64, 'New controls implemented successfully', 3),
        (5, '2025-10-01', 7, 3, 5, 105, 'Cash flow improving', 3),
        (6, '2025-10-01', 9, 3, 4, 108, 'Safety training completed', 4),
        (7, '2025-10-01', 6, 4, 5, 120, 'Succession planning underway', 4),
        (8, '2025-10-01', 7, 3, 4, 84, 'Predictive maintenance pilot started', 5),
        (9, '2025-10-01', 8, 2, 4, 64, 'Two new suppliers qualified', 5),
        (10, '2025-10-01', 9, 3, 3, 81, 'Data mapping project complete', 6),
        (11, '2025-10-01', 5, 3, 6, 90, 'Monitoring enhanced', 6),
        (12, '2025-10-01', 7, 3, 4, 84, 'Customer satisfaction improving', 7),
        (13, '2025-10-01', 10, 3, 3, 90, 'Access review completed', 2)
    `);
    
    console.log('');
    console.log('========================================');
    console.log('Database setup completed successfully!');
    console.log('========================================');
    console.log('');
    console.log('Test Credentials:');
    console.log('-----------------');
    console.log('Admin: admin / admin123');
    console.log('IT User: it_user / password123');
    console.log('Finance User: finance_user / password123');
    console.log('HR User: hr_user / password123');
    console.log('Operations User: ops_user / password123');
    console.log('Compliance User: comp_user / password123');
    console.log('Sales User: sales_user / password123');
    console.log('');
    
  } catch (error) {
    console.error('Database setup error:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

setupDatabase()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
