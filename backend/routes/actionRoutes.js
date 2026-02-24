const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const audit = require('../middleware/audit');
const {
  getActionsByRisk,
  createAction,
  updateAction,
  deleteAction,
  getOverdueActions
} = require('../controllers/actionController');

router.get('/risk/:risk_id', authenticateToken, getActionsByRisk);
router.get('/overdue', authenticateToken, getOverdueActions);
router.post('/risk/:risk_id', authenticateToken, audit('create', 'action'), createAction);
router.put('/:id', authenticateToken, audit('update', 'action'), updateAction);
router.delete('/:id', authenticateToken, audit('delete', 'action'), deleteAction);

module.exports = router;
