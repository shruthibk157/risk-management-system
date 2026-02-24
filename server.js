const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

const db = new sqlite3.Database('./risk_management.db');

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
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

// Authorization middleware for admin-only routes
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Audit logging middleware
const auditLog = (userId, action, entityType, entityId, details, ipAddress) => {
  db.run(`INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ip_address)
    VALUES (?, ?, ?, ?, ?, ?)`, [userId, action, entityType, entityId, details, ipAddress]);
};

// Authentication routes
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  db.get('SELECT * FROM users WHERE username = ? AND is_active = 1', [username], (err, user) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    bcrypt.compare(password, user.password_hash, (err, isValid) => {
      if (err) {
        console.error('Password comparison error:', err);
        return res.status(500).json({ error: 'Authentication error' });
      }

      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role, departmentId: user.department_id },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      auditLog(user.id, 'login', 'user', user.id, 'User logged in', req.ip);

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          departmentId: user.department_id
        }
      });
    });
  });
});

app.post('/api/auth/logout', authenticateToken, (req, res) => {
  auditLog(req.user.id, 'logout', 'user', req.user.id, 'User logged out', req.ip);
  res.json({ message: 'Logged out successfully' });
});

// Department management routes (Admin only for create/update/delete)
app.get('/api/departments', authenticateToken, (req, res) => {
  db.all('SELECT * FROM departments ORDER BY name', (err, departments) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(departments);
  });
});

app.post('/api/departments', authenticateToken, requireAdmin, (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Department name is required' });
  }

  db.run('INSERT INTO departments (name, description) VALUES (?, ?)',
    [name, description], function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          return res.status(409).json({ error: 'Department name already exists' });
        }
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      auditLog(req.user.id, 'create', 'department', this.lastID, `Created department: ${name}`, req.ip);

      res.status(201).json({
        id: this.lastID,
        name,
        description,
        created_at: new Date().toISOString()
      });
    });
});

app.put('/api/departments/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Department name is required' });
  }

  db.run('UPDATE departments SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, description, id], function(err) {
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

      auditLog(req.user.id, 'update', 'department', id, `Updated department: ${name}`, req.ip);

      res.json({ id, name, description });
    });
});

app.delete('/api/departments/:id', authenticateToken, requireAdmin, (req, res) => {
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

      db.run('DELETE FROM departments WHERE id = ?', [id], function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Department not found' });
        }

        auditLog(req.user.id, 'delete', 'department', id, 'Deleted department', req.ip);

        res.json({ message: 'Department deleted successfully' });
      });
    });
  });
});

// User management routes (Admin only)
app.get('/api/users', authenticateToken, requireAdmin, (req, res) => {
  const query = `
    SELECT u.id, u.username, u.email, u.role, u.department_id, u.is_active, u.created_at,
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

app.post('/api/users', authenticateToken, requireAdmin, (req, res) => {
  const { username, email, password, role, departmentId } = req.body;

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

      db.run(`INSERT INTO users (username, email, password_hash, role, department_id)
        VALUES (?, ?, ?, ?, ?)`, [username, email, hash, role, departmentId], function(err) {
          if (err) {
            if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
              return res.status(409).json({ error: 'Username or email already exists' });
            }
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
          }

          auditLog(req.user.id, 'create', 'user', this.lastID, `Created user: ${username}`, req.ip);

          res.status(201).json({
            id: this.lastID,
            username,
            email,
            role,
            departmentId,
            is_active: true
          });
        });
    });
  }
});

app.put('/api/users/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { username, email, role, departmentId, isActive, password } = req.body;

  if (!username || !email || !role) {
    return res.status(400).json({ error: 'Username, email, and role are required' });
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

      updateUser();
    });
  } else {
    updateUser();
  }

  function updateUser() {
    let query = 'UPDATE users SET username = ?, email = ?, role = ?, department_id = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    let params = [username, email, role, departmentId, isActive ? 1 : 0, id];

    if (password) {
      const saltRounds = 10;
      bcrypt.hash(password, saltRounds, (err, hash) => {
        if (err) {
          console.error('Password hashing error:', err);
          return res.status(500).json({ error: 'Password hashing error' });
        }

        query = 'UPDATE users SET username = ?, email = ?, password_hash = ?, role = ?, department_id = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        params = [username, email, hash, role, departmentId, isActive ? 1 : 0, id];

        executeUpdate(query, params);
      });
    } else {
      executeUpdate(query, params);
    }

    function executeUpdate(query, params) {
      db.run(query, params, function(err) {
        if (err) {
          if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(409).json({ error: 'Username or email already exists' });
          }
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'User not found' });
        }

        auditLog(req.user.id, 'update', 'user', id, `Updated user: ${username}`, req.ip);

        res.json({ id, username, email, role, departmentId, is_active: isActive });
      });
    }
  }
});

app.delete('/api/users/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;

  // Prevent deleting the current admin user
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  // Check if user has associated risks
  db.get('SELECT COUNT(*) as riskCount FROM risks WHERE created_by = ?', [id], (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (result.riskCount > 0) {
      return res.status(409).json({
        error: 'Cannot delete user with associated risks. Please reassign or delete the risks first.'
      });
    }

    db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      auditLog(req.user.id, 'delete', 'user', id, 'Deleted user', req.ip);

      res.json({ message: 'User deleted successfully' });
    });
  });
});

// Risk management routes
app.get('/api/risks', authenticateToken, (req, res) => {
  const { departmentId, status, page = 1, limit = 10 } = req.query;
  let query = `
    SELECT r.*, d.name as department_name, u.username as created_by_username
    FROM risks r
    LEFT JOIN departments d ON r.department_id = d.id
    LEFT JOIN users u ON r.created_by = u.id
    WHERE 1=1
  `;
  const params = [];

  // Filter by department (users can only see their department's risks, admins see all)
  if (req.user.role !== 'admin') {
    query += ' AND r.department_id = ?';
    params.push(req.user.departmentId);
  } else if (departmentId) {
    query += ' AND r.department_id = ?';
    params.push(departmentId);
  }

  if (status) {
    query += ' AND r.status = ?';
    params.push(status);
  }

  query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

  db.all(query, params, (err, risks) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM risks WHERE 1=1';
    const countParams = [];

    if (req.user.role !== 'admin') {
      countQuery += ' AND department_id = ?';
      countParams.push(req.user.departmentId);
    } else if (departmentId) {
      countQuery += ' AND department_id = ?';
      countParams.push(departmentId);
    }

    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    db.get(countQuery, countParams, (err, countResult) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        risks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult.total,
          pages: Math.ceil(countResult.total / parseInt(limit))
        }
      });
    });
  });
});

app.post('/api/risks', authenticateToken, (req, res) => {
  const {
    departmentId,
    riskDescription,
    severity,
    occurrence,
    detection,
    mitigationPlan,
    riskOwner,
    reviewDate,
    status = 'open'
  } = req.body;

  // Validate required fields
  if (!departmentId || !riskDescription || !severity || !occurrence || !detection) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Validate department access (users can only create risks for their department)
  if (req.user.role !== 'admin' && parseInt(departmentId) !== req.user.departmentId) {
    return res.status(403).json({ error: 'Cannot create risks for other departments' });
  }

  // Validate ranges
  if (severity < 1 || severity > 10 || occurrence < 1 || occurrence > 10 || detection < 1 || detection > 10) {
    return res.status(400).json({ error: 'Severity, occurrence, and detection must be between 1 and 10' });
  }

  const rpn = severity * occurrence * detection;

  db.run(`INSERT INTO risks (department_id, risk_description, severity, occurrence, detection, rpn, mitigation_plan, risk_owner, review_date, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [departmentId, riskDescription, severity, occurrence, detection, rpn, mitigationPlan, riskOwner, reviewDate, status, req.user.id],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      auditLog(req.user.id, 'create', 'risk', this.lastID, `Created risk: ${riskDescription.substring(0, 100)}...`, req.ip);

      res.status(201).json({
        id: this.lastID,
        departmentId,
        riskDescription,
        severity,
        occurrence,
        detection,
        rpn,
        mitigationPlan,
        riskOwner,
        reviewDate,
        status,
        createdBy: req.user.id
      });
    });
});

// AI Articulation endpoint
app.post('/api/ai/articulate-risk', authenticateToken, (req, res) => {
  const { department_id, context_text, file_content } = req.body;

  if (!context_text && !file_content) {
    return res.status(400).json({ error: 'Context text or file content is required' });
  }

  // Validate department access
  if (req.user.role !== 'admin' && parseInt(department_id) !== req.user.departmentId) {
    return res.status(403).json({ error: 'Cannot articulate risks for other departments' });
  }

  // Simple AI-like logic for risk articulation
  const context = (context_text + ' ' + (file_content || '')).toLowerCase();

  // Department-specific patterns
  const patterns = {
    1: { // IT Department
      keywords: ['server', 'database', 'network', 'cybersecurity', 'data breach', 'system failure', 'software', 'hardware'],
      risks: [
        'System downtime affecting business operations',
        'Data loss or corruption from system failures',
        'Unauthorized access to sensitive information',
        'Network security vulnerabilities',
        'Software bugs causing operational issues',
        'Hardware failure leading to service disruption'
      ]
    },
    2: { // HR Department
      keywords: ['employee', 'staff', 'personnel', 'recruitment', 'training', 'compliance', 'labor'],
      risks: [
        'Staff turnover affecting project timelines',
        'Compliance violations with labor regulations',
        'Inadequate training leading to operational errors',
        'Recruitment delays for critical positions',
        'Employee safety incidents',
        'Confidentiality breaches with employee data'
      ]
    },
    3: { // Finance Department
      keywords: ['financial', 'budget', 'accounting', 'audit', 'fraud', 'regulatory', 'payment'],
      risks: [
        'Financial reporting errors',
        'Fraudulent activities affecting financial integrity',
        'Regulatory compliance violations',
        'Budget overruns impacting operations',
        'Payment processing delays',
        'Audit findings requiring remediation'
      ]
    },
    4: { // Operations Department
      keywords: ['process', 'efficiency', 'supply chain', 'quality', 'production', 'logistics'],
      risks: [
        'Process inefficiencies reducing productivity',
        'Supply chain disruptions',
        'Quality control failures',
        'Production delays affecting delivery',
        'Resource allocation issues',
        'Operational bottlenecks'
      ]
    },
    5: { // Compliance Department
      keywords: ['regulatory', 'compliance', 'legal', 'audit', 'policy', 'governance'],
      risks: [
        'Regulatory compliance violations',
        'Policy non-adherence',
        'Legal risks from non-compliance',
        'Audit findings requiring action',
        'Governance framework weaknesses',
        'Risk management process failures'
      ]
    }
  };

  const deptPatterns = patterns[department_id] || patterns[1];
  const matchedKeywords = deptPatterns.keywords.filter(keyword => context.includes(keyword));

  // Generate risk based on context
  let articulatedRisk = '';

  if (matchedKeywords.length > 0) {
    // Use matched keywords to generate relevant risk
    const primaryKeyword = matchedKeywords[0];
    const relevantRisks = deptPatterns.risks.filter(risk =>
      risk.toLowerCase().includes(primaryKeyword) ||
      context.includes(risk.toLowerCase().split(' ')[0])
    );

    articulatedRisk = relevantRisks.length > 0 ? relevantRisks[0] : deptPatterns.risks[0];
  } else {
    // Fallback to general risk
    articulatedRisk = deptPatterns.risks[Math.floor(Math.random() * deptPatterns.risks.length)];
  }

  // Calculate FMEA parameters based on context
  let severity = 5, occurrence = 4, detection = 3;

  if (context.includes('critical') || context.includes('severe') || context.includes('major')) severity = 8;
  if (context.includes('frequent') || context.includes('often') || context.includes('regular')) occurrence = 7;
  if (context.includes('undetected') || context.includes('hidden') || context.includes('invisible')) detection = 8;

  const rpn = severity * occurrence * detection;

  // Generate mitigation plan
  const mitigationPlans = [
    'Implement regular monitoring and review processes',
    'Develop contingency plans and backup procedures',
    'Enhance training and awareness programs',
    'Conduct regular audits and assessments',
    'Implement automated controls and safeguards',
    'Establish clear policies and procedures'
  ];

  const mitigationPlan = mitigationPlans[Math.floor(Math.random() * mitigationPlans.length)];

  auditLog(req.user.id, 'articulate', 'risk', null, `AI articulated risk for department ${department_id}`, req.ip);

  res.json({
    riskDescription: articulatedRisk,
    severity,
    occurrence,
    detection,
    rpn,
    mitigationPlan,
    riskOwner: req.user.username,
    reviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days from now
    status: 'open'
  });
});

// Dashboard analytics
app.get('/api/dashboard', authenticateToken, (req, res) => {
  const queries = [];

  // Total risks count
  if (req.user.role === 'admin') {
    queries.push(new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as total FROM risks', (err, result) => {
        if (err) reject(err);
        else resolve({ totalRisks: result.total });
      });
    }));
  } else {
    queries.push(new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as total FROM risks WHERE department_id = ?', [req.user.departmentId], (err, result) => {
        if (err) reject(err);
        else resolve({ totalRisks: result.total });
      });
    }));
  }

  // Risks by status
  const statusQuery = req.user.role === 'admin'
    ? 'SELECT status, COUNT(*) as count FROM risks GROUP BY status'
    : 'SELECT status, COUNT(*) as count FROM risks WHERE department_id = ? GROUP BY status';

  queries.push(new Promise((resolve, reject) => {
    db.all(statusQuery, req.user.role === 'admin' ? [] : [req.user.departmentId], (err, results) => {
      if (err) reject(err);
      else {
        const statusCounts = {};
        results.forEach(row => {
          statusCounts[row.status] = row.count;
        });
        resolve({ risksByStatus: statusCounts });
      }
    });
  }));

  // Average RPN
  const rpnQuery = req.user.role === 'admin'
    ? 'SELECT AVG(rpn) as avgRpn FROM risks'
    : 'SELECT AVG(rpn) as avgRpn FROM risks WHERE department_id = ?';

  queries.push(new Promise((resolve, reject) => {
    db.get(rpnQuery, req.user.role === 'admin' ? [] : [req.user.departmentId], (err, result) => {
      if (err) reject(err);
      else resolve({ averageRpn: Math.round(result.avgRpn || 0) });
    });
  }));

  // High priority risks (RPN > 100)
  const highPriorityQuery = req.user.role === 'admin'
    ? 'SELECT COUNT(*) as count FROM risks WHERE rpn > 100'
    : 'SELECT COUNT(*) as count FROM risks WHERE rpn > 100 AND department_id = ?';

  queries.push(new Promise((resolve, reject) => {
    db.get(highPriorityQuery, req.user.role === 'admin' ? [] : [req.user.departmentId], (err, result) => {
      if (err) reject(err);
      else resolve({ highPriorityRisks: result.count });
    });
  }));

  Promise.all(queries).then(results => {
    const analytics = Object.assign({}, ...results);
    res.json(analytics);
  }).catch(err => {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Database error' });
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Database initialized with sample data');
  console.log('Default login: admin/admin123');
});
