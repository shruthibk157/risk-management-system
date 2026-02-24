const pool = require('../config/database');

const getDashboardStats = async (req, res) => {
  try {
    const { department_id } = req.query;

    let deptFilter = '';
    const params = [];

    if (req.user.role !== 'admin' && req.user.department_id) {
      deptFilter = 'WHERE r.department_id = ?';
      params.push(req.user.department_id);
    } else if (department_id) {
      deptFilter = 'WHERE r.department_id = ?';
      params.push(department_id);
    }

    const [totalRisks] = await pool.query(
      `SELECT COUNT(*) as count FROM risks r ${deptFilter}`,
      params
    );

    const [highRisks] = await pool.query(
      `SELECT COUNT(*) as count FROM risks r ${deptFilter} AND r.rpn >= 27`,
      params
    );

    const [riskClassifications] = await pool.query(
      `SELECT 
        risk_classification,
        COUNT(*) as count
       FROM risks r ${deptFilter}
       GROUP BY risk_classification`,
      params
    );

    const [departmentStats] = await pool.query(
      `SELECT 
        d.id,
        d.name,
        COUNT(r.id) as total_risks,
        SUM(CASE WHEN r.rpn >= 27 THEN 1 ELSE 0 END) as high_risks
       FROM departments d
       LEFT JOIN risks r ON d.id = r.department_id
       ${req.user.role === 'admin' ? '' : 'WHERE d.id = ?'}
       GROUP BY d.id, d.name
       ORDER BY d.name`,
      req.user.role === 'admin' ? [] : [req.user.department_id]
    );

    const [actionStats] = await pool.query(
      `SELECT 
        a.status,
        COUNT(*) as count
       FROM actions a
       JOIN risks r ON a.risk_id = r.id
       ${deptFilter}
       GROUP BY a.status`,
      params
    );

    const [rpnTrend] = await pool.query(
      `SELECT 
        DATE_FORMAT(r.created_at, '%Y-%m') as month,
        AVG(r.rpn) as avg_rpn,
        MAX(r.rpn) as max_rpn,
        COUNT(*) as count
       FROM risks r ${deptFilter}
       GROUP BY DATE_FORMAT(r.created_at, '%Y-%m')
       ORDER BY month DESC
       LIMIT 12`,
      params
    );

    const [reviewTrend] = await pool.query(
      `SELECT 
        DATE_FORMAT(rr.review_date, '%Y-%m') as month,
        AVG(rr.rpn) as avg_rpn,
        COUNT(*) as count
       FROM risk_reviews rr
       JOIN risks r ON rr.risk_id = r.id
       ${deptFilter}
       GROUP BY DATE_FORMAT(rr.review_date, '%Y-%m')
       ORDER BY month DESC
       LIMIT 12`,
      params
    );

    res.json({
      totalRisks: totalRisks[0].count,
      highRisks: highRisks[0].count,
      riskClassifications,
      departmentStats,
      actionStats,
      rpnTrend: rpnTrend.reverse(),
      reviewTrend: reviewTrend.reverse()
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getAdminStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [deptCount] = await pool.query('SELECT COUNT(*) as count FROM departments');
    const [userCount] = await pool.query('SELECT COUNT(*) as count FROM users');
    const [riskCount] = await pool.query('SELECT COUNT(*) as count FROM risks');
    const [inactiveUsers] = await pool.query('SELECT COUNT(*) as count FROM users WHERE is_active = 0');

    const [departmentSummary] = await pool.query(`
      SELECT 
        d.id,
        d.name,
        d.is_active,
        u.full_name as head_name,
        COUNT(DISTINCT users.id) as total_users,
        COUNT(DISTINCT r.id) as active_risks
      FROM departments d
      LEFT JOIN users u ON d.head_user_id = u.id
      LEFT JOIN users ON d.id = users.department_id
      LEFT JOIN risks r ON d.id = r.department_id
      GROUP BY d.id, d.name, d.is_active, u.full_name
      ORDER BY d.name
    `);

    res.json({
      totalDepartments: deptCount[0].count,
      totalUsers: userCount[0].count,
      activeRisks: riskCount[0].count,
      inactiveUsers: inactiveUsers[0].count,
      departmentSummary
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getDepartments = async (req, res) => {
  try {
    const [departments] = await pool.query(
      'SELECT id, name, description FROM departments ORDER BY name'
    );
    res.json(departments);
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getDashboardStats, getDepartments, getAdminStats };
