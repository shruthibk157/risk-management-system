require('dotenv').config();
console.log('\n\n🚀🚀🚀 NUCLEAR STARTUP: WISDOM ENGINE V2.1 ACTIVATING 🚀🚀🚀\n\n');
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const multer = require('multer');
const pdf = require('pdf-parse');
const fs = require('fs');

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'risk-management-secret-key-2024';

app.use(cors());
app.use(express.json());

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const dbPath = path.join(__dirname, 'risk_management.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  console.log('Initializing SQLite database...');

  db.run(`CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    description TEXT,
    custom_instructions TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password_hash TEXT,
    full_name TEXT,
    email TEXT UNIQUE,
    role TEXT DEFAULT 'department_user',
    department_id INTEGER,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS risks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    risk_id TEXT UNIQUE,
    sl_no INTEGER,
    department_id INTEGER,
    requirement_process_area TEXT, -- Legacy name
    process_function TEXT,
    risk_description TEXT,
    potential_failure_mode TEXT,
    potential_effects TEXT,
    severity INTEGER,
    potential_causes TEXT,
    current_controls_prevention TEXT,
    occurrence INTEGER,
    current_controls_detection TEXT,
    detection INTEGER,
    rpn INTEGER,
    risk_classification TEXT,
    treatment_type TEXT,
    recommended_actions TEXT,
    responsibility_owner TEXT,
    target_completion_date DATE,
    action_status_results TEXT,
    actual_completion_date DATE,
    severity_after INTEGER,
    occurrence_after INTEGER,
    detection_after INTEGER,
    residual_rpn INTEGER,
    status TEXT DEFAULT 'Open',
    is_ai_assisted INTEGER DEFAULT 0,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`);

  // Department-tagged documents for AI knowledge
  db.run(`CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    department_id INTEGER,
    filename TEXT,
    stored_filename TEXT UNIQUE,
    file_path TEXT,
    file_size INTEGER,
    mime_type TEXT,
    extracted_text TEXT,
    uploaded_by INTEGER,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id),
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
  )`, (err) => {
    if (!err) {
      // Ensure missing columns are added for existing tables
      const columnsToAdd = [
        ['stored_filename', 'TEXT'],
        ['file_path', 'TEXT'],
        ['file_size', 'INTEGER'],
        ['mime_type', 'TEXT']
      ];
      columnsToAdd.forEach(([col, type]) => {
        db.run(`ALTER TABLE documents ADD COLUMN ${col} ${type}`, (alterErr) => {
          // Ignore errors like "duplicate column name"
        });
      });
      // Add index for uniqueness instead if needed
      db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_stored_filename ON documents(stored_filename)`);
    }
  });

  // Add index for risk_description within department (Non-unique to allow similar descriptions)
  db.serialize(() => {
    db.run(`DROP INDEX IF EXISTS idx_risk_dept_desc`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_risk_dept_desc
             ON risks(department_id, LOWER(risk_description))`, (err) => {
      // Migration for Section 3 columns
      const risksColumns = [
        ['residual_rpn', 'INTEGER'],
        ['review_date', 'DATE'],
        ['action_status_results', 'TEXT'],
        ['process_function', 'TEXT']
      ];
      risksColumns.forEach(([col, type]) => {
        db.run(`ALTER TABLE risks ADD COLUMN ${col} ${type}`, () => { });
      });

      // Migration: Move data from requirement_process_area to process_function if exists
      db.run(`UPDATE risks SET process_function = requirement_process_area WHERE process_function IS NULL AND requirement_process_area IS NOT NULL`, (err) => {
        if (!err) console.log('✓ Migration: Migrated requirement_process_area to process_function');
      });

      // Initialize AI Audit Logs Table
      db.run(`CREATE TABLE IF NOT EXISTS ai_audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        risk_id INTEGER,
        action_type TEXT,
        original_input TEXT,
        ai_suggestion TEXT,
        user_decision TEXT,
        final_value TEXT,
        justification TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (risk_id) REFERENCES risks(id)
      )`);

      if (err) {
        console.log('Index creation failed:', err.message);
      } else {
        console.log('✓ Index idx_risk_dept_desc (non-unique) established');
      }
    });
  });




  // Department-Specific SL No Index (Updated)
  db.run(`DROP INDEX IF EXISTS idx_risks_sl_no`, (err) => {
    db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_risks_dept_sl_no ON risks(department_id, sl_no)`, (err) => {
      if (err) {
        console.log('Department SL No index skipped or already exists:', err.message);
      } else {
        console.log('✓ Department Index idx_risks_dept_sl_no created');
      }
    });
  });

  // Migration: Add sl_no column if it doesn't exist
  db.run(`ALTER TABLE risks ADD COLUMN sl_no INTEGER`, (err) => {
    if (err) {
      if (!err.message.includes('duplicate column name')) {
        console.log('Migration note (sl_no):', err.message);
      }
    } else {
      console.log('✓ Migration: Added sl_no column');
    }
  });

  // Migration: Add date_raised column if it doesn't exist
  db.run(`ALTER TABLE risks ADD COLUMN date_raised DATE`, (err) => {
    if (err) {
      if (!err.message.includes('duplicate column name')) {
        console.log('Migration note (date_raised):', err.message);
      }
    } else {
      console.log('✓ Migration: Added date_raised column');
      // Set default for existing records
      db.run(`UPDATE risks SET date_raised = date('now') WHERE date_raised IS NULL`);
    }
  });
  // Cleanup and department-specific re-indexing
  db.run(`DELETE FROM risks WHERE risk_description IS NULL OR risk_description = '' OR department_id IS NULL OR department_id = ''`, (err) => {
    if (!err) {
      db.all("SELECT DISTINCT department_id FROM risks", (err, depts) => {
        if (!err && depts) {
          depts.forEach(dept => {
            db.all("SELECT id FROM risks WHERE department_id = ? ORDER BY created_at ASC, id ASC", [dept.department_id], (err, rows) => {
              if (!err && rows) {
                rows.forEach((row, index) => {
                  db.run("UPDATE risks SET sl_no = ? WHERE id = ?", [index + 1, row.id]);
                });
              }
            });
          });
          console.log('✓ Cleaned up and re-indexed risks per department');
        }
      });
    }
  });
});

db.run(`CREATE TABLE IF NOT EXISTS actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    risk_id INTEGER,
    action_type TEXT,
    action_description TEXT,
    action_owner TEXT,
    due_date DATE,
    status TEXT DEFAULT 'open',
    completion_date DATE,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (risk_id) REFERENCES risks(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`);

db.run(`CREATE TABLE IF NOT EXISTS risk_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    risk_id INTEGER,
    review_date DATE,
    severity INTEGER,
    occurrence INTEGER,
    detection INTEGER,
    rpn INTEGER,
    notes TEXT,
    reviewed_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (risk_id) REFERENCES risks(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id)
  )`);

// Ensure departments exist
const requiredDepts = [
  { name: 'HR', desc: 'Human Resources' },
  { name: 'IT', desc: 'Information Technology' },
  { name: 'Finance', desc: 'Finance and Accounting' },
  { name: 'Quality', desc: 'Quality Assurance' },
  { name: 'Delivery', desc: 'Delivery and Operations' },
  { name: 'Admin', desc: 'Administrative Services' },
  { name: 'ITE’s', desc: 'IT Enabled Services' }
];

requiredDepts.forEach(dept => {
  db.run(`INSERT OR IGNORE INTO departments (name, description) VALUES (?, ?)`, [dept.name, dept.desc]);
});

// Strict cleanup: Remove legacy departments if they exist
const approvedNames = requiredDepts.map(d => d.name);
const placeholders = approvedNames.map(() => '?').join(',');
db.run(`DELETE FROM departments WHERE name NOT IN (${placeholders})`, approvedNames, (err) => {
  if (err) console.error('Cleanup failed:', err.message);
  else console.log('✓ Department synchronization complete');
});

db.get("SELECT count(*) as count FROM users", (err, row) => {
  if (row.count === 0) {
    console.log('Seeding initial users...');
    const salt = bcrypt.genSaltSync(10);
    const adminPass = bcrypt.hashSync('admin123', salt);
    const userPass = bcrypt.hashSync('password123', salt);

    // Admin user
    db.run(`INSERT INTO users (username, password_hash, full_name, email, role, department_id) VALUES
        ('admin', ?, 'System Administrator', 'admin@company.com', 'admin', NULL)`, [adminPass]);

    // Department users - fetch department IDs first
    db.all("SELECT id, name FROM departments", (err, depts) => {
      const deptMap = {};
      depts.forEach(d => deptMap[d.name] = d.id);

      const users = [
        { un: 'it_user', fn: 'John Smith', em: 'rohith@company.com', dn: 'IT' },
        { un: 'finance_user', fn: 'Sarah Johnson', em: 'sarah.johnson@company.com', dn: 'Finance' },
        { un: 'hr_user', fn: 'Michael Brown', em: 'michael.brown@company.com', dn: 'HR' },
        { un: 'quality_user', fn: 'Emily Davis', em: 'emily.davis@company.com', dn: 'Quality' },
        { un: 'delivery_user', fn: 'David Wilson', em: 'david.wilson@company.com', dn: 'Delivery' }
      ];

      users.forEach(u => {
        if (deptMap[u.dn]) {
          db.run(`INSERT INTO users (username, password_hash, full_name, email, role, department_id) VALUES (?, ?, ?, ?, 'department_user', ?)`,
            [u.un, userPass, u.fn, u.em, deptMap[u.dn]]);
        }
      });

      // Sample risks
      if (deptMap['IT']) {
        db.run(`INSERT INTO risks (risk_id, sl_no, department_id, process_function, risk_description, potential_failure_mode, potential_effects, severity, occurrence, detection, rpn, risk_classification, status, created_by) VALUES
            ('RISK-0001', 1, ?, 'Data Center Operations', 'Server hardware failure', 'Hardware component failure', 'Business disruption', 4, 3, 2, 24, 'Acceptable (A)', 'Open', 1)`, [deptMap['IT']]);
      }
    });
    console.log('✓ Database seeded with sample data');
  }
});

console.log('✓ Database ready');

// Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ? AND is_active = 1', [username], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user || !await bcrypt.compare(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, department_id: user.department_id },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        department_id: user.department_id
      }
    });
  });
});

// Get current user
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    db.get('SELECT id, username, full_name, email, role, department_id FROM users WHERE id = ?', [decoded.id], (err, user) => {
      if (err || !user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(user);
    });
  });
});

// User Management Routes
app.get('/api/users', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }

  db.all(`
    SELECT u.id, u.username, u.email, u.full_name, u.role, u.department_id, u.is_active, d.name as department_name
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    ORDER BY u.username
  `, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    // Convert is_active to boolean for frontend
    const users = rows.map(u => ({ ...u, is_active: !!u.is_active }));
    res.json(users);
  });
});

app.post('/api/users', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { username, email, password, role, departmentId, isActive } = req.body;

  if (!username || !email || !password || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  db.run(`INSERT INTO users (username, email, password_hash, full_name, role, department_id, is_active) 
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [username, email, passwordHash, username, role, departmentId || null, isActive ? 1 : 0],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Username or email already exists' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID, message: 'User created successfully' });
    }
  );
});

app.put('/api/users/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { id } = req.params;
  const { username, email, password, role, departmentId, isActive } = req.body;

  if (!username || !email || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Check uniqueness for other users
  db.get('SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?', [username, email, id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) return res.status(400).json({ error: 'Username or email already used by another account' });

    let query = 'UPDATE users SET username = ?, email = ?, role = ?, department_id = ?, is_active = ?';
    let params = [username, email, role, departmentId || null, isActive ? 1 : 0];

    if (password) {
      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(password, salt);
      query += ', password_hash = ?';
      params.push(passwordHash);
    }

    query += ' WHERE id = ?';
    params.push(id);

    db.run(query, params, function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'User updated successfully' });
    });
  });
});

app.delete('/api/users/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { id } = req.params;
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  db.run('DELETE FROM users WHERE id = ?', [id], function (err) {
    if (err) {
      // Logic to check FK constraints in SQLite if enabled, otherwise it might just delete or fail silently depending on config
      // SQLite default FK support is off unless 'PRAGMA foreign_keys = ON' is set. 
      // Assuming it's on or we handle error.
      return res.status(500).json({ error: 'Failed to delete user. They may have related records.' });
    }
    res.json({ message: 'User deleted successfully' });
  });
});

// Departments
app.get('/api/dashboard/departments', (req, res) => {
  db.all('SELECT id, name, description, custom_instructions FROM departments', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.put('/api/departments/:id/instructions', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { custom_instructions } = req.body;

  if (req.user.role !== 'admin' && parseInt(id) !== req.user.department_id) {
    return res.status(403).json({ error: 'Unauthorized to update departmental instructions' });
  }

  db.run('UPDATE departments SET custom_instructions = ? WHERE id = ?', [custom_instructions, id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Departmental knowledge updated' });
  });
});

// GET /api/dashboard/admin/stats - System-wide overview for Admins
app.get('/api/dashboard/admin/stats', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { department_id } = req.query;
  const filter = department_id ? ' WHERE department_id = ?' : '';
  const params = department_id ? [department_id] : [];

  const results = {
    totalDepartments: 0,
    totalUsers: 0,
    activeRisks: 0,
    inactiveUsers: 0,
    departmentSummary: []
  };

  db.serialize(() => {
    db.get('SELECT COUNT(*) as count FROM departments', (err, row) => {
      if (row) results.totalDepartments = row.count;
    });

    db.get(`SELECT COUNT(*) as count FROM users${filter}`, params, (err, row) => {
      if (row) results.totalUsers = row.count;
    });

    // Unified Active Risks: non-closed risks
    const statusFilter = department_id ? " AND status != 'Closed'" : " WHERE status != 'Closed'";
    db.get(`SELECT COUNT(*) as count FROM risks${filter}${statusFilter}`, params, (err, row) => {
      if (row) results.activeRisks = row.count;
    });

    const inactiveFilter = department_id ? " AND is_active = 0" : " WHERE is_active = 0";
    db.get(`SELECT COUNT(*) as count FROM users${filter}${inactiveFilter}`, params, (err, row) => {
      if (row) results.inactiveUsers = row.count;
    });

    db.all(`
      SELECT 
        d.id,
        d.name,
        1 as is_active,
        (SELECT full_name FROM users WHERE department_id = d.id AND role = 'department_user' LIMIT 1) as head_name,
        (SELECT COUNT(*) FROM users WHERE department_id = d.id) as total_users,
        (SELECT COUNT(*) FROM risks WHERE department_id = d.id AND status != 'Closed') as active_risks
      FROM departments d
      ORDER BY d.name
    `, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      results.departmentSummary = rows || [];
      res.json(results);
    });
  });
});

// GET /api/dashboard/stats - Department-specific statistics
app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
  const { department_id } = req.query;
  let deptFilter = '';
  let params = [];

  if (req.user.role !== 'admin' && req.user.department_id) {
    deptFilter = 'WHERE department_id = ?';
    params.push(req.user.department_id);
  } else if (department_id) {
    deptFilter = 'WHERE department_id = ?';
    params.push(department_id);
  }

  const results = {
    totalRisks: 0,
    highRisks: 0,
    riskClassifications: [],
    departmentStats: [],
    actionStats: [],
    rpnTrend: [],
    reviewTrend: []
  };

  db.serialize(() => {
    // Total Risks
    db.get(`SELECT COUNT(*) as count FROM risks ${deptFilter}`, params, (err, row) => {
      if (row) results.totalRisks = row.count;
    });

    // High Risks (RPN >= 25)
    db.get(`SELECT COUNT(*) as count FROM risks ${deptFilter ? deptFilter + ' AND' : 'WHERE'} rpn >= 25`, params, (err, row) => {
      if (row) results.highRisks = row.count;
    });

    // Classifications
    db.all(`SELECT risk_classification, COUNT(*) as count FROM risks ${deptFilter} GROUP BY risk_classification`, params, (err, rows) => {
      if (rows) results.riskClassifications = rows;
    });

    // Department Stats
    db.all(`
      SELECT 
        d.id, d.name, 
        COUNT(r.id) as total_risks,
        SUM(CASE WHEN r.rpn >= 25 THEN 1 ELSE 0 END) as high_risks
      FROM departments d
      LEFT JOIN risks r ON d.id = r.department_id
      GROUP BY d.id, d.name
      ORDER BY d.name
    `, (err, rows) => {
      if (rows) results.departmentStats = rows;
    });

    // RPN Trend
    db.all(`
      SELECT 
        strftime('%Y-%m', created_at) as month,
        AVG(rpn) as avg_rpn,
        MAX(rpn) as max_rpn,
        COUNT(*) as count
      FROM risks ${deptFilter}
      GROUP BY month
      ORDER BY month DESC
      LIMIT 6
    `, params, (err, rows) => {
      if (rows) results.rpnTrend = rows.reverse();
      res.json(results);
    });
  });
});

// Risks
app.get('/api/risks', authenticateToken, (req, res) => {
  let departmentFilter = '';
  let params = [];

  // Apply department filter for non-admin users
  if (req.user.role !== 'admin' && req.user.department_id) {
    departmentFilter = 'WHERE r.department_id = ?';
    params = [req.user.department_id];
  }

  if (req.query.department_id && req.query.department_id !== 'undefined') {
    departmentFilter = departmentFilter ? `${departmentFilter} AND r.department_id = ?` : 'WHERE r.department_id = ?';
    params.push(req.query.department_id);
  }

  if (req.query.status) {
    departmentFilter = departmentFilter ? `${departmentFilter} AND r.status = ?` : 'WHERE r.status = ?';
    params.push(req.query.status);
  }

  if (req.query.search) {
    departmentFilter = departmentFilter ? `${departmentFilter} AND (r.risk_description LIKE ? OR r.process_function LIKE ? OR r.potential_failure_mode LIKE ?)` : 'WHERE (r.risk_description LIKE ? OR r.process_function LIKE ? OR r.potential_failure_mode LIKE ?)';
    params.push(`%${req.query.search}%`, `%${req.query.search}%`, `%${req.query.search}%`);
  }

  const query = `SELECT r.*, d.name as department_name FROM risks r JOIN departments d ON r.department_id = d.id ${departmentFilter} ORDER BY r.sl_no ASC`;

  console.log('GET /api/risks query:', query, 'params:', params);

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Database error in GET /risks:', err);
      return res.status(500).json({ error: err.message });
    }
    console.log('GET /api/risks returned', rows.length, 'risks');
    res.json(rows);
  });
});

// Next SL No (Department Specific)
app.get('/api/risks/next-sl-no/:departmentId?', authenticateToken, (req, res) => {
  const departmentId = req.params.departmentId || req.query.department_id;

  if (!departmentId) {
    return res.status(400).json({ error: 'Department ID is required' });
  }

  db.get('SELECT MAX(sl_no) as max_sl FROM risks WHERE department_id = ?', [departmentId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    const nextSlNo = (row?.max_sl || 0) + 1;
    res.json({ next_sl_no: nextSlNo });
  });
});

// Global Next Risk ID
app.get('/api/risks/next-id', authenticateToken, (req, res) => {
  // Try to find the max numeric suffix if format is RISK-NNNN
  db.get(`SELECT risk_id FROM risks WHERE risk_id LIKE 'RISK-%' ORDER BY risk_id DESC LIMIT 1`, [], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });

    let nextId;
    if (row && row.risk_id) {
      const match = row.risk_id.match(/RISK-(\d+)/);
      if (match) {
        const nextNum = parseInt(match[1]) + 1;
        nextId = `RISK-${String(nextNum).padStart(4, '0')}`;
      } else {
        nextId = 'RISK-0001';
      }
    } else {
      // Fallback to purely numeric check if no RISK- prefix found
      db.get(`SELECT MAX(CAST(risk_id AS INTEGER)) as max_id FROM risks WHERE risk_id GLOB '[0-9]*'`, [], (err, numericRow) => {
        if (err) return res.status(500).json({ error: err.message });
        const currentMax = numericRow && numericRow.max_id ? numericRow.max_id : 0;
        nextId = String(currentMax + 1);
        res.json({ next_risk_id: nextId });
      });
      return;
    }
    res.json({ next_risk_id: nextId });
  });
});

app.get('/api/risks/:id', (req, res) => {
  db.get('SELECT r.*, d.name as department_name FROM risks r JOIN departments d ON r.department_id = d.id WHERE r.id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Risk not found' });
    res.json(row);
  });
});

app.post('/api/risks', authenticateToken, (req, res) => {
  const {
    date_raised, department_id, process_function, risk_description,
    potential_failure_mode, potential_effects, severity,
    potential_causes, current_controls_prevention, occurrence,
    current_controls_detection, detection, recommended_actions,
    treatment_type, responsibility_owner, target_completion_date,
    severity_after, occurrence_after, detection_after, is_ai_assisted
  } = req.body;

  // FMEA Model: RPN = Severity (1-5) * Occurrence (1-5) * Detection (1-5)
  const s = parseInt(severity) || 1;
  const o = parseInt(occurrence) || 1;
  const d = parseInt(detection) || 1;
  const rpn = s * o * d;
  const risk_classification = rpn >= 25 ? 'Significant (S)' : 'Acceptable (A)';

  let residual_rpn = null;
  if (severity_after && occurrence_after && detection_after) {
    const resS = parseInt(severity_after) || 1;
    const resO = parseInt(occurrence_after) || 1;
    const resD = parseInt(detection_after) || 1;
    residual_rpn = resS * resO * resD;
  }

  // Global Sequential Risk ID Logic
  db.get(`SELECT MAX(CAST(risk_id AS INTEGER)) as max_id FROM risks WHERE risk_id GLOB '[0-9]*'`, [], (err, row) => {
    const currentMax = row && row.max_id ? row.max_id : 0;
    let nextNum = currentMax + 1;

    // Handle manual override if risk_id provided in body (and valid)
    let finalRiskId = req.body.risk_id;
    if (!finalRiskId) {
      finalRiskId = String(nextNum);
    }

    // Department Specific SL No Logic: MAX(sl_no) + 1
    db.get('SELECT MAX(sl_no) as max_sl FROM risks WHERE department_id = ?', [department_id], (err, slRow) => {
      const nextSlNo = (slRow?.max_sl || 0) + 1;

      const query = `INSERT INTO risks (
    risk_id, sl_no, department_id, date_raised, process_function,
    risk_description, potential_failure_mode, potential_effects,
    severity, potential_causes, current_controls_prevention,
    occurrence, current_controls_detection, detection,
    rpn, risk_classification, recommended_actions,
    treatment_type, responsibility_owner, target_completion_date,
    severity_after, occurrence_after, detection_after,
    residual_rpn, status, is_ai_assisted, created_by
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const params = [
        finalRiskId, nextSlNo, department_id, date_raised || new Date().toISOString().split('T')[0], process_function,
        risk_description, potential_failure_mode, potential_effects,
        s, potential_causes, current_controls_prevention,
        o, current_controls_detection, d,
        rpn, risk_classification, recommended_actions,
        treatment_type, responsibility_owner, target_completion_date,
        severity_after, occurrence_after, detection_after,
        residual_rpn, 'Open', is_ai_assisted ? 1 : 0, req.user.id
      ];
      db.run(query, params,
        function (err) {
          if (err) {
            console.error('Insert Risk Error:', err);
            return res.status(500).json({ error: err.message });
          }
          res.json({ id: this.lastID, risk_id: finalRiskId, sl_no: nextSlNo, rpn, risk_classification });
        });
    });
  });
});


app.put('/api/risks/:id', authenticateToken, (req, res) => {
  const {
    date_raised, process_function, risk_description, potential_failure_mode,
    potential_effects, severity, potential_causes,
    current_controls_prevention, occurrence, current_controls_detection,
    detection, recommended_actions, action_status_results,
    treatment_type, responsibility_owner, target_completion_date,
    actual_completion_date, status,
    severity_after, occurrence_after, detection_after
  } = req.body;

  // FMEA Model: RPN = Severity (1-5) * Occurrence (1-5) * Detection (1-5)
  const s = parseInt(severity) || 1;
  const o = parseInt(occurrence) || 1;
  const d = parseInt(detection) || 1;
  const rpn = s * o * d;
  const risk_classification = rpn >= 25 ? 'Significant (S)' : 'Acceptable (A)';

  let residual_rpn = null;
  if (severity_after && occurrence_after && detection_after) {
    const resS = parseInt(severity_after) || 1;
    const resO = parseInt(occurrence_after) || 1;
    const resD = parseInt(detection_after) || 1;
    residual_rpn = resS * resO * resD;
  }

  // Governance: Prevent closing without actual completion date
  if (status === 'Closed' && !actual_completion_date) {
    return res.status(400).json({ error: 'Cannot close risk without an actual completion date for actions.' });
  }

  db.run(`UPDATE risks SET 
      date_raised = ?, process_function = ?, risk_description = ?, 
      potential_failure_mode = ?, potential_effects = ?, severity = ?, 
      potential_causes = ?, current_controls_prevention = ?, occurrence = ?, 
      current_controls_detection = ?, detection = ?, rpn = ?, 
      risk_classification = ?, recommended_actions = ?, action_status_results = ?,
      treatment_type = ?, responsibility_owner = ?, target_completion_date = ?,
      actual_completion_date = ?, status = ?,
      severity_after = ?, occurrence_after = ?, detection_after = ?, residual_rpn = ?
    WHERE id = ?`,
    [
      date_raised, process_function, risk_description, potential_failure_mode,
      potential_effects, severity, potential_causes,
      current_controls_prevention, occurrence, current_controls_detection,
      detection, rpn, risk_classification, // Changed from risk_index to rpn
      recommended_actions, action_status_results,
      treatment_type, responsibility_owner, target_completion_date,
      actual_completion_date, status,
      severity_after, occurrence_after, detection_after, residual_rpn,
      req.params.id
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Risk updated successfully' });
    }
  );
});

app.delete('/api/risks/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  // Security: Non-admins can only delete risks from their own department
  let query = 'SELECT department_id FROM risks WHERE id = ?';
  db.get(query, [id], (err, risk) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!risk) return res.status(404).json({ error: 'Risk not found' });

    if (req.user.role !== 'admin' && risk.department_id !== req.user.department_id) {
      return res.status(403).json({ error: 'Unauthorized to delete this risk' });
    }

    // Deletion sequence to avoid orphan records in relevant tables
    db.serialize(() => {
      db.run('DELETE FROM actions WHERE risk_id = ?', [id]);
      db.run('DELETE FROM risk_reviews WHERE risk_id = ?', [id]);
      db.run('DELETE FROM risks WHERE id = ?', [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Risk and associated records deleted successfully' });
      });
    });
  });
});


// AI Routes Integration
app.use('/api/ai', require('./routes/aiRoutes'));

// Dashboard Departments
app.get('/api/dashboard/departments', authenticateToken, (req, res) => {
  db.all('SELECT id, name, description FROM departments ORDER BY name', [], (err, rows) => {
    if (err) {
      console.error('Error fetching departments:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Dashboard Stats
app.get('/api/dashboard/stats', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  let deptFilter = '';
  let params = [];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.role !== 'admin' && decoded.department_id) {
        deptFilter = 'WHERE r.department_id = ?';
        params = [decoded.department_id];
      }
    } catch (err) {
      console.error('Token verification failed:', err.message);
    }
  }

  if (req.query.department_id && req.query.department_id !== 'undefined') {
    deptFilter = deptFilter ? `${deptFilter} AND r.department_id = ?` : 'WHERE r.department_id = ?';
    params.push(req.query.department_id);
  }

  db.get(`SELECT COUNT(*) as total FROM risks r ${deptFilter}`, params, (err, totalRow) => {
    db.get(`SELECT COUNT(*) as high FROM risks r ${deptFilter} AND r.rpn >= 25`, params, (err, highRow) => {
      db.all(`SELECT risk_classification, COUNT(*) as count FROM risks r ${deptFilter} GROUP BY risk_classification`, params, (err, classifications) => {
        db.all(`SELECT status, COUNT(*) as count FROM actions a JOIN risks r ON a.risk_id = r.id ${deptFilter} GROUP BY status`, params, (err, actionStats) => {
          db.all(`SELECT d.id, d.name, COUNT(r.id) as total_risks, SUM(CASE WHEN r.rpn >= 25 THEN 1 ELSE 0 END) as high_risks FROM departments d LEFT JOIN risks r ON d.id = r.department_id GROUP BY d.id, d.name`, [], (err, deptStats) => {
            db.all(`SELECT strftime('%Y-%m', created_at) as month, AVG(rpn) as avg_rpn, MAX(rpn) as max_rpn FROM risks r ${deptFilter} GROUP BY strftime('%Y-%m', created_at) ORDER BY month DESC LIMIT 12`, params, (err, rpnTrend) => {
              res.json({
                totalRisks: totalRow?.total || 0,
                highRisks: highRow?.high || 0,
                riskClassifications: classifications || [],
                actionStats: actionStats || [],
                departmentStats: deptStats || [],
                rpnTrend: (rpnTrend || []).reverse()
              });
            });
          });
        });
      });
    });
  });
});

// Actions
app.get('/api/actions/risk/:risk_id', (req, res) => {
  db.all('SELECT * FROM actions WHERE risk_id = ? ORDER BY due_date ASC', [req.params.risk_id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/actions/risk/:risk_id', (req, res) => {
  const { action_type, action_description, action_owner, due_date } = req.body;
  db.run('INSERT INTO actions (risk_id, action_type, action_description, action_owner, due_date, created_by) VALUES (?, ?, ?, ?, ?, ?)',
    [req.params.risk_id, action_type, action_description, action_owner, due_date, 1],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

app.put('/api/actions/:id', (req, res) => {
  const { action_description, action_owner, due_date, status, completion_date } = req.body;
  db.run('UPDATE actions SET action_description = ?, action_owner = ?, due_date = ?, status = ?, completion_date = ? WHERE id = ?',
    [action_description, action_owner, due_date, status, completion_date, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Action updated' });
    }
  );
});

app.delete('/api/actions/:id', (req, res) => {
  db.run('DELETE FROM actions WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Action deleted' });
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Risk Management API is running' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Department management endpoints
app.get('/api/departments', authenticateToken, (req, res) => {
  db.all('SELECT * FROM departments ORDER BY name', (err, departments) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(departments);
  });
});

// Department overview generation for dashboard
app.get('/api/departments/:id/overview', authenticateToken, (req, res) => {
  const departmentId = req.params.id;

  db.get('SELECT id, name FROM departments WHERE id = ?', [departmentId], (err, department) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Generate department overview based on department name
    const overview = generateDepartmentOverview(department.id, department.name);

    res.json({
      department_id: department.id,
      department_name: department.name,
      overview: overview,
      generated_at: new Date().toISOString()
    });
  });
});

// AI Routes Integration
app.use('/api/ai', require('./routes/aiRoutes'));

// AI Department overview generation endpoint
app.post('/api/ai/department-overview', authenticateToken, (req, res) => {
  const { department_id, department_name } = req.body;

  if (!department_id) {
    return res.status(400).json({ error: 'department_id is required' });
  }

  // Get department name if not provided
  let deptName = department_name;
  if (!deptName) {
    db.get('SELECT name FROM departments WHERE id = ?', [department_id], (err, department) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (!department) {
        return res.status(404).json({ error: 'Department not found' });
      }

      deptName = department.name;
      const overview = generateDepartmentOverview(department_id, deptName);

      res.json({
        overview: overview,
        department_id: department_id,
        department_name: deptName
      });
    });
  } else {
    const overview = generateDepartmentOverview(department_id, deptName);

    res.json({
      overview: overview,
      department_id: department_id,
      department_name: deptName
    });
  }
});

// Department overview generation function
function generateDepartmentOverview(departmentId, departmentName) {
  const overviews = {
    'HR': 'Human Resources manages employee hiring, compliance, performance, and workforce well-being while addressing people-related and policy risks.',
    'Finance': 'Finance oversees budgeting, financial controls, reporting, and cash flow while managing financial, audit, and regulatory risks.',
    'IT': 'IT ensures secure and reliable systems, data protection, and technology operations while mitigating cyber and infrastructure risks.',
    'Operations': 'Operations manages day-to-day business processes, efficiency, and continuity while controlling operational and safety risks.',
    'Sales': 'Sales focuses on revenue generation, customer relationships, and market growth while managing pricing, contract, and credit risks.'
  };

  // Return specific overview or generate a generic one
  return overviews[departmentName] || `${departmentName} department manages specialized functions and processes while identifying and mitigating department-specific risks to ensure operational excellence.`;
}

app.post('/api/departments', authenticateToken, (req, res) => {
  // Only admin can create departments
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Department name is required' });
  }

  db.run('INSERT INTO departments (name, description) VALUES (?, ?)',
    [name, description], function (err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          return res.status(409).json({ error: 'Department name already exists' });
        }
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      console.log('Department created:', this.lastID, name);
      res.status(201).json({
        id: this.lastID,
        name,
        description,
        created_at: new Date().toISOString()
      });
    });
});

app.put('/api/departments/:id', authenticateToken, (req, res) => {
  // Only admin can update departments
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { id } = req.params;
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Department name is required' });
  }

  db.run('UPDATE departments SET name = ?, description = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, description, id], function (err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          return res.status(409).json({ error: 'Department name already exists' });
        }
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Department not found' });
      }

      console.log('Department updated:', id, name);
      res.json({ id, name, description });
    });
});

app.delete('/api/departments/:id', authenticateToken, (req, res) => {
  // Only admin can delete departments
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { id } = req.params;

  // Check if department has users or risks
  db.get('SELECT COUNT(*) as userCount FROM users WHERE department_id = ?', [id], (err, userResult) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    db.get('SELECT COUNT(*) as riskCount FROM risks WHERE department_id = ?', [id], (err, riskResult) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (userResult.userCount > 0 || riskResult.riskCount > 0) {
        return res.status(409).json({
          error: 'Cannot delete department with associated users or risks. Please reassign or delete them first.'
        });
      }

      db.run('DELETE FROM departments WHERE id = ?', [id], function (err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Department not found' });
        }

        console.log('Department deleted:', id);
        res.json({ message: 'Department deleted successfully' });
      });
    });
  });
});

// User management endpoints
app.get('/api/users', authenticateToken, (req, res) => {
  // Only admin can list all users
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const query = `
    SELECT u.id, u.username, u.email, u.role, u.department_id, u.full_name,
           d.name as department_name
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    ORDER BY u.username
  `;

  db.all(query, (err, users) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(users);
  });
});

app.post('/api/users', authenticateToken, (req, res) => {
  // Only admin can create users
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { username, email, password, role, departmentId, full_name } = req.body;

  if (!username || !email || !password || !role) {
    return res.status(400).json({ error: 'Username, email, password, and role are required' });
  }

  if (!['admin', 'user'].includes(role)) {
    return res.status(400).json({ error: 'Role must be admin or user' });
  }

  // Validate department exists if departmentId is provided
  if (departmentId) {
    db.get('SELECT id FROM departments WHERE id = ?', [departmentId], (err, dept) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (!dept) {
        return res.status(400).json({ error: 'Invalid department ID' });
      }

      createUser();
    });
  } else {
    createUser();
  }

  function createUser() {
    const saltRounds = 10;
    bcrypt.hash(password, saltRounds, (err, hash) => {
      if (err) {
        console.error('Password hashing error:', err);
        return res.status(500).json({ error: 'Password hashing error' });
      }

      db.run(`INSERT INTO users (username, email, password_hash, role, department_id, full_name)
        VALUES (?, ?, ?, ?, ?, ?)`, [username, email, hash, role, departmentId, full_name], function (err) {
        if (err) {
          if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(409).json({ error: 'Username or email already exists' });
          }
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        console.log('User created:', this.lastID, username);
        res.status(201).json({
          id: this.lastID,
          username,
          email,
          role,
          departmentId,
          full_name,
          created_at: new Date().toISOString()
        });
      });
    });
  }
});

// ==================== DOCUMENT MANAGEMENT ENDPOINTS ====================

// Configure multer for document uploads
const crypto = require('crypto');
const documentStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads/documents');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uniqueSuffix}${ext}`);
  }
});

const documentUpload = multer({
  storage: documentStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/json',
      'text/markdown'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, TXT, JSON, and MD files are allowed.'));
    }
  }
});

// POST /api/documents/upload - Upload document(s)
app.post('/api/documents/upload', authenticateToken, documentUpload.array('files', 10), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  let departmentParam = req.body.department || req.body.department_id;
  let departmentId = parseInt(departmentParam);

  // If departmentParam is a string name (e.g., "IT"), try to resolve it to an ID
  if (isNaN(departmentId) && typeof departmentParam === 'string') {
    console.log(`[DOC-UPLOAD] Received department name "${departmentParam}", attempting to resolve to ID...`);
    try {
      const row = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM departments WHERE LOWER(name) = LOWER(?)', [departmentParam], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      if (row) {
        departmentId = row.id;
        console.log(`[DOC-UPLOAD] Resolved "${departmentParam}" to ID: ${departmentId}`);
      } else {
        console.warn(`[DOC-UPLOAD] Could not resolve department name: "${departmentParam}"`);
      }
    } catch (err) {
      console.error('[DOC-UPLOAD] Error resolving department name:', err);
    }
  }

  if (!departmentId || isNaN(departmentId)) {
    console.error(`[DOC-UPLOAD] Missing or invalid Department ID. Received: "${departmentParam}"`);
    // Clean up uploaded files
    req.files.forEach(file => {
      try {
        fs.unlinkSync(file.path);
      } catch (err) {
        console.error('Error deleting file:', err);
      }
    });
    return res.status(400).json({ error: 'Valid Department ID is required' });
  }

  const uploadedDocs = [];
  let completed = 0;
  let hasError = false;

  console.log(`[DOC-UPLOAD] Starting processing of ${req.files.length} files...`);
  for (const file of req.files) {
    try {
      console.log(`[DOC-UPLOAD] Processing file: ${file.originalname} (${file.mimetype}, ${file.size} bytes)`);
      // Knowledge Extraction
      const filePath = file.path;
      const fileExt = path.extname(file.originalname).toLowerCase();
      let extractedText = '';

      try {
        if (fileExt === '.pdf') {
          console.log(`[DOC-UPLOAD] Extracting text from PDF: ${file.originalname}`);
          const dataBuffer = fs.readFileSync(filePath);
          const data = await pdf(dataBuffer);
          extractedText = data.text;
          console.log(`[DOC-UPLOAD] PDF extraction complete, length: ${extractedText?.length || 0}`);
        } else {
          console.log(`[DOC-UPLOAD] Reading text from file: ${file.originalname}`);
          extractedText = fs.readFileSync(filePath, 'utf8');
          console.log(`[DOC-UPLOAD] File reading complete, length: ${extractedText?.length || 0}`);
        }
      } catch (extErr) {
        console.error(`[DOC-UPLOAD] Extraction error for ${file.originalname}:`, extErr);
        // Continue without text if extraction fails, or handle as error?
        // For now, continue but log.
      }

      console.log(`[DOC-UPLOAD] Inserting into database for file: ${file.originalname}, dept: ${departmentId}, user: ${req.user.id}`);

      // Basic keyword tagging for internal AI context enrichment
      const keywords = extractKeywords(extractedText, 8).join(', ');

      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO documents (filename, stored_filename, file_path, file_size, mime_type, department_id, extracted_text, uploaded_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [file.originalname, file.filename, file.path, file.size, file.mimetype, departmentId, extractedText, req.user.id],
          function (err) {
            if (err) {
              console.error(`[DOC-UPLOAD] Database insert error for ${file.originalname}:`, err);
              hasError = true;
              try { fs.unlinkSync(file.path); } catch (e) { }
              reject(err);
            } else {
              console.log(`[DOC-UPLOAD] Successfully inserted into DB with ID: ${this.lastID} | Keywords: ${keywords}`);
              uploadedDocs.push({
                id: this.lastID,
                filename: file.originalname,
                size: file.size,
                keywords: keywords
              });
              resolve();
            }
          }
        );
      });
    } catch (err) {
      console.error(`[DOC-UPLOAD] Processing error for ${file.originalname}:`, err);
      hasError = true;
    } finally {
      completed++;
      console.log(`[DOC-UPLOAD] File ${completed}/${req.files.length} processed. Successes so far: ${uploadedDocs.length}`);
      if (completed === req.files.length) {
        if (uploadedDocs.length === 0) {
          console.error('[DOC-UPLOAD] Final result: 0 successes. Sending error response.');
          return res.status(500).json({ error: 'Failed to upload documents. Please check backend logs.' });
        }
        console.log(`[DOC-UPLOAD] Final result: ${uploadedDocs.length} successes. Sending success response.`);
        res.status(201).json({
          message: 'Documents uploaded and knowledge extracted successfully',
          documents: uploadedDocs,
          errors: hasError ? 'Some files failed to process' : null
        });
      }
    }
  }
});

// GET /api/documents - List documents
app.get('/api/documents', authenticateToken, (req, res) => {
  const departmentId = req.query.department || req.query.department_id;

  let query = `
    SELECT d.*, u.full_name as uploaded_by_name
    FROM documents d
    LEFT JOIN users u ON d.uploaded_by = u.id
  `;

  const params = [];

  if (departmentId) {
    query += ' WHERE d.department_id = ?';
    params.push(departmentId);
  }

  query += ' ORDER BY d.uploaded_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Fetch documents error:', err);
      return res.status(500).json({ error: 'Failed to fetch documents' });
    }
    res.json(rows);
  });
});

// DELETE /api/documents/:id - Delete document
app.delete('/api/documents/:id', authenticateToken, (req, res) => {
  const documentId = req.params.id;

  db.get('SELECT * FROM documents WHERE id = ?', [documentId], (err, doc) => {
    if (err) {
      console.error('Fetch document error:', err);
      return res.status(500).json({ error: 'Failed to fetch document' });
    }

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete from database
    db.run('DELETE FROM documents WHERE id = ?', [documentId], (err) => {
      if (err) {
        console.error('Delete document error:', err);
        return res.status(500).json({ error: 'Failed to delete document' });
      }

      // Delete file from disk
      if (doc.file_path && fs.existsSync(doc.file_path)) {
        try {
          fs.unlinkSync(doc.file_path);
        } catch (err) {
          console.error('Error deleting file from disk:', err);
        }
      }

      res.json({ message: 'Document deleted successfully' });
    });
  });
});

// ==================== END DOCUMENT MANAGEMENT ====================

app.listen(PORT, () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  Risk Management System`);
  console.log(`${'='.repeat(50)}`);
  console.log(`\n✓ Server running on http://localhost:${PORT}`);
  console.log(`\nTest Credentials:`);
  console.log(`  Admin:     admin / admin123`);
  console.log(`  IT User:   it_user / password123`);
  console.log(`  Finance:   finance_user / password123`);
  console.log(`  HR User:   hr_user / password123`);
  console.log(`  Ops User:  ops_user / password123`);
  console.log(`\nOpen http://localhost:3000 in your browser\n`);
});
