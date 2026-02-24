const pool = require('../config/database');

const getActionsByRisk = async (req, res) => {
  try {
    const { risk_id } = req.params;

    const [risks] = await pool.query('SELECT * FROM risks WHERE id = ?', [risk_id]);
    if (risks.length === 0) {
      return res.status(404).json({ error: 'Risk not found' });
    }

    const risk = risks[0];

    if (req.user.role !== 'admin' && risk.department_id != req.user.department_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [actions] = await pool.query(
      `SELECT a.*, u1.full_name as created_by_name, u2.full_name as updated_by_name
       FROM actions a
       LEFT JOIN users u1 ON a.created_by = u1.id
       LEFT JOIN users u2 ON a.updated_by = u2.id
       WHERE a.risk_id = ?
       ORDER BY a.due_date ASC`,
      [risk_id]
    );

    res.json(actions);
  } catch (error) {
    console.error('Get actions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createAction = async (req, res) => {
  try {
    const { risk_id } = req.params;
    const { action_type, action_description, action_owner, due_date } = req.body;

    const [risks] = await pool.query('SELECT * FROM risks WHERE id = ?', [risk_id]);
    if (risks.length === 0) {
      return res.status(404).json({ error: 'Risk not found' });
    }

    const risk = risks[0];

    if (req.user.role !== 'admin' && risk.department_id != req.user.department_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!['preventive', 'mitigation'].includes(action_type)) {
      return res.status(400).json({ error: 'Invalid action type' });
    }

    const [result] = await pool.query(
      `INSERT INTO actions (risk_id, action_type, action_description, action_owner, due_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [risk_id, action_type, action_description, action_owner, due_date, req.user.id]
    );

    const [newAction] = await pool.query('SELECT * FROM actions WHERE id = ?', [result.insertId]);
    res.status(201).json(newAction[0]);
  } catch (error) {
    console.error('Create action error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { action_description, action_owner, due_date, status, completion_date } = req.body;

    const [actions] = await pool.query(
      `SELECT a.*, r.department_id 
       FROM actions a
       JOIN risks r ON a.risk_id = r.id
       WHERE a.id = ?`,
      [id]
    );

    if (actions.length === 0) {
      return res.status(404).json({ error: 'Action not found' });
    }

    const action = actions[0];

    if (req.user.role !== 'admin' && action.department_id != req.user.department_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await pool.query(
      `UPDATE actions SET
        action_description = ?,
        action_owner = ?,
        due_date = ?,
        status = ?,
        completion_date = ?,
        updated_by = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [action_description, action_owner, due_date, status, completion_date, req.user.id, id]
    );

    const [updatedAction] = await pool.query('SELECT * FROM actions WHERE id = ?', [id]);
    res.json(updatedAction[0]);
  } catch (error) {
    console.error('Update action error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteAction = async (req, res) => {
  try {
    const { id } = req.params;

    const [actions] = await pool.query(
      `SELECT a.*, r.department_id
       FROM actions a
       JOIN risks r ON a.risk_id = r.id
       WHERE a.id = ?`,
      [id]
    );

    if (actions.length === 0) {
      return res.status(404).json({ error: 'Action not found' });
    }

    const action = actions[0];

    if (req.user.role !== 'admin' && action.department_id != req.user.department_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await pool.query('DELETE FROM actions WHERE id = ?', [id]);
    res.json({ message: 'Action deleted successfully' });
  } catch (error) {
    console.error('Delete action error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getOverdueActions = async (req, res) => {
  try {
    let query = `
      SELECT a.*, r.risk_id, r.risk_description, d.name as department_name
      FROM actions a
      JOIN risks r ON a.risk_id = r.id
      JOIN departments d ON r.department_id = d.id
      WHERE a.due_date < CURDATE() AND a.status IN ('open', 'in_progress')
    `;
    const params = [];

    if (req.user.role !== 'admin' && req.user.department_id) {
      query += ' AND r.department_id = ?';
      params.push(req.user.department_id);
    }

    query += ' ORDER BY a.due_date ASC';

    const [actions] = await pool.query(query, params);
    res.json(actions);
  } catch (error) {
    console.error('Get overdue actions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getActionsByRisk,
  createAction,
  updateAction,
  deleteAction,
  getOverdueActions
};
