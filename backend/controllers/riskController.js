const pool = require('../config/database');

const getAllRisks = async (req, res) => {
  try {
    const { department_id, search } = req.query;

    let query = `
      SELECT r.*, d.name as department_name, u.full_name as created_by_name
      FROM risks r
      JOIN departments d ON r.department_id = d.id
      LEFT JOIN users u ON r.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role !== 'admin' && req.user.department_id) {
      query += ' AND r.department_id = ?';
      params.push(req.user.department_id);
    } else if (department_id) {
      query += ' AND r.department_id = ?';
      params.push(department_id);
    }

    if (search) {
      query += ' AND (r.risk_description LIKE ? OR r.process_function LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY r.rpn DESC, r.created_at DESC';

    const [risks] = await pool.query(query, params);
    res.json(risks);
  } catch (error) {
    console.error('Get risks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getRiskById = async (req, res) => {
  try {
    const { id } = req.params;

    const [risks] = await pool.query(
      `SELECT r.*, d.name as department_name, u1.full_name as created_by_name, u2.full_name as updated_by_name
       FROM risks r
       JOIN departments d ON r.department_id = d.id
       LEFT JOIN users u1 ON r.created_by = u1.id
       LEFT JOIN users u2 ON r.updated_by = u2.id
       WHERE r.id = ?`,
      [id]
    );

    if (risks.length === 0) {
      return res.status(404).json({ error: 'Risk not found' });
    }

    res.json(risks[0]);
  } catch (error) {
    console.error('Get risk error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createRisk = async (req, res) => {
  try {
    const {
      department_id,
      process_function,
      risk_description,
      potential_failure_mode,
      potential_effects,
      severity,
      potential_causes,
      current_controls_prevention,
      occurrence,
      current_controls_detection,
      detection,
      recommended_actions
    } = req.body;

    if (req.user.role !== 'admin' && department_id != req.user.department_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [departments] = await pool.query('SELECT id FROM departments WHERE id = ?', [department_id]);
    if (departments.length === 0) {
      return res.status(400).json({ error: 'Invalid department' });
    }

    let finalRiskId = req.body.risk_id;

    // Only auto-generate if no risk_id is provided
    if (!finalRiskId) {
      // Find the maximum numeric risk_id
      const [maxIdResult] = await pool.query(
        'SELECT MAX(CAST(risk_id AS UNSIGNED)) as max_id FROM risks'
      );

      const currentMax = maxIdResult[0].max_id || 0;
      finalRiskId = String(currentMax + 1).padStart(3, '0');
    }

    const [result] = await pool.query(
      `INSERT INTO risks (
        department_id, risk_id, sl_no, date_raised, process_function, risk_description,
        potential_failure_mode, potential_effects, severity, potential_causes,
        current_controls_prevention, occurrence, current_controls_detection, detection,
        rpn, risk_classification, recommended_actions, responsibility_owner,
        target_completion_date, actual_completion_date, status, severity_after,
        occurrence_after, detection_after, residual_rpn, residual_classification,
        review_date, is_ai_assisted, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        department_id, finalRiskId, req.body.sl_no, req.body.date_raised, process_function, risk_description,
        potential_failure_mode, potential_effects, severity, potential_causes,
        current_controls_prevention, occurrence, current_controls_detection, detection,
        req.body.rpn, req.body.risk_classification, recommended_actions, req.body.responsibility_owner,
        req.body.target_completion_date, req.body.actual_completion_date, req.body.status || 'Open',
        req.body.severity_after, req.body.occurrence_after, req.body.detection_after,
        req.body.residual_rpn, req.body.residual_classification, req.body.review_date,
        req.body.is_ai_assisted, req.user.id
      ]
    );
    const [newRisk] = await pool.query('SELECT * FROM risks WHERE id = ?', [result.insertId]);
    res.status(201).json(newRisk[0]);
  } catch (error) {
    console.error('Create risk error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getNextSlNo = async (req, res) => {
  try {
    const departmentId = req.params.departmentId || req.query.department_id;

    if (!departmentId) {
      return res.status(400).json({ error: 'Department ID is required' });
    }

    // Since we now re-sequence risks, the next SL No is simply count + 1
    const [countResult] = await pool.query(
      'SELECT COUNT(*) as count FROM risks WHERE department_id = ?',
      [departmentId]
    );

    const nextSlNo = countResult[0].count + 1;
    res.json({ next_sl_no: nextSlNo });
  } catch (error) {
    console.error('Get next sl_no error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getNextId = async (req, res) => {
  try {
    const [result] = await pool.query(
      'SELECT MAX(CAST(SUBSTRING(risk_id, 6) AS UNSIGNED)) as max_id FROM risks WHERE risk_id LIKE "RISK-%"'
    );

    // Fallback if the above doesn't work or if there are no risks
    const [altResult] = await pool.query(
      'SELECT MAX(id) as max_id FROM risks'
    );

    const nextIdNum = Math.max((result[0].max_id || 0), (altResult[0].max_id || 0)) + 1;
    const nextRiskId = `RISK-${String(nextIdNum).padStart(4, '0')}`;

    res.json({ next_risk_id: nextRiskId });
  } catch (error) {
    console.error('Get next ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateRisk = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      process_function,
      risk_description,
      potential_failure_mode,
      potential_effects,
      severity,
      potential_causes,
      current_controls_prevention,
      occurrence,
      current_controls_detection,
      detection,
      recommended_actions,
      action_status_results
    } = req.body;

    const [risks] = await pool.query('SELECT * FROM risks WHERE id = ?', [id]);
    if (risks.length === 0) {
      return res.status(404).json({ error: 'Risk not found' });
    }

    const risk = risks[0];

    if (req.user.role !== 'admin' && risk.department_id != req.user.department_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await pool.query(
      `UPDATE risks SET
        risk_id = ?,
        date_raised = ?,
        process_function = ?,
        risk_description = ?,
        potential_failure_mode = ?,
        potential_effects = ?,
        severity = ?,
        potential_causes = ?,
        current_controls_prevention = ?,
        occurrence = ?,
        current_controls_detection = ?,
        detection = ?,
        rpn = ?,
        risk_classification = ?,
        recommended_actions = ?,
        responsibility_owner = ?,
        target_completion_date = ?,
        actual_completion_date = ?,
        status = ?,
        severity_after = ?,
        occurrence_after = ?,
        detection_after = ?,
        residual_rpn = ?,
        residual_classification = ?,
        review_date = ?,
        is_ai_assisted = ?,
        action_status_results = ?,
        updated_by = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        req.body.risk_id, req.body.date_raised, process_function, risk_description,
        potential_failure_mode, potential_effects, severity, potential_causes,
        current_controls_prevention, occurrence, current_controls_detection, detection,
        req.body.rpn, req.body.risk_classification, recommended_actions,
        req.body.responsibility_owner, req.body.target_completion_date,
        req.body.actual_completion_date, req.body.status, req.body.severity_after,
        req.body.occurrence_after, req.body.detection_after, req.body.residual_rpn,
        req.body.residual_classification, req.body.review_date, req.body.is_ai_assisted,
        action_status_results, req.user.id, id
      ]
    );

    const [updatedRisk] = await pool.query('SELECT * FROM risks WHERE id = ?', [id]);
    res.json(updatedRisk[0]);
  } catch (error) {
    console.error('Update risk error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteRisk = async (req, res) => {
  try {
    const { id } = req.params;

    const [risks] = await pool.query('SELECT * FROM risks WHERE id = ?', [id]);
    if (risks.length === 0) {
      return res.status(404).json({ error: 'Risk not found' });
    }

    const risk = risks[0];

    if (req.user.role !== 'admin' && risk.department_id != req.user.department_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await pool.query('DELETE FROM risks WHERE id = ?', [id]);
    res.json({ message: 'Risk deleted successfully' });
  } catch (error) {
    console.error('Delete risk error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createRiskReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { review_date, severity, occurrence, detection, notes } = req.body;

    const [risks] = await pool.query('SELECT * FROM risks WHERE id = ?', [id]);
    if (risks.length === 0) {
      return res.status(404).json({ error: 'Risk not found' });
    }

    const risk = risks[0];

    if (req.user.role !== 'admin' && risk.department_id != req.user.department_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await pool.query(
      `INSERT INTO risk_reviews (risk_id, review_date, severity, occurrence, detection, notes, reviewed_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, review_date, severity, occurrence, detection, notes, req.user.id]
    );

    const rpn = severity * occurrence * detection;

    res.status(201).json({
      risk_id: id,
      review_date,
      severity,
      occurrence,
      detection,
      rpn,
      notes
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getRiskReviews = async (req, res) => {
  try {
    const { id } = req.params;

    const [risks] = await pool.query('SELECT * FROM risks WHERE id = ?', [id]);
    if (risks.length === 0) {
      return res.status(404).json({ error: 'Risk not found' });
    }

    const risk = risks[0];

    if (req.user.role !== 'admin' && risk.department_id != req.user.department_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [reviews] = await pool.query(
      `SELECT rr.*, u.full_name as reviewed_by_name
       FROM risk_reviews rr
       LEFT JOIN users u ON rr.reviewed_by = u.id
       WHERE rr.risk_id = ?
       ORDER BY rr.review_date DESC`,
      [id]
    );

    res.json(reviews);
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const resequenceRisks = async (req, res) => {
  try {
    const { departmentId } = req.body;
    if (!departmentId) return res.status(400).json({ error: 'Department ID required' });

    const [risks] = await pool.query(
      'SELECT id FROM risks WHERE department_id = ? ORDER BY created_at ASC',
      [departmentId]
    );

    for (let i = 0; i < risks.length; i++) {
      await pool.query('UPDATE risks SET sl_no = ? WHERE id = ?', [i + 1, risks[i].id]);
    }

    res.json({ message: `Resequenced ${risks.length} risks for department ${departmentId}` });
  } catch (error) {
    console.error('Resequence error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getDebugData = async (req, res) => {
  try {
    const [schema] = await pool.query('DESCRIBE risks');
    const [risks] = await pool.query('SELECT * FROM risks');
    const [departments] = await pool.query('SELECT * FROM departments');
    res.json({ schema, risks, departments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllRisks,
  getRiskById,
  createRisk,
  updateRisk,
  deleteRisk,
  createRiskReview,
  getRiskReviews,
  getNextSlNo,
  getNextId,
  resequenceRisks,
  getDebugData
};
