const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const audit = require('../middleware/audit');
const {
  getAllRisks,
  getRiskById,
  createRisk,
  updateRisk,
  deleteRisk,
  createRiskReview,
  getRiskReviews,
  getNextSlNo,
  getNextId,
  resequenceRisks
} = require('../controllers/riskController');

router.get('/debug-data', getDebugData);
router.post('/resequence', authenticateToken, resequenceRisks);

router.get('/next-sl-no/:departmentId', authenticateToken, getNextSlNo);
router.get('/next-id', authenticateToken, getNextId);
router.get('/', authenticateToken, getAllRisks);
router.post('/', authenticateToken, audit('create', 'risk'), createRisk);
router.get('/:id', authenticateToken, getRiskById);
router.put('/:id', authenticateToken, audit('update', 'risk'), updateRisk);
router.delete('/:id', authenticateToken, audit('delete', 'risk'), deleteRisk);
router.post('/:id/reviews', authenticateToken, audit('create', 'review'), createRiskReview);
router.get('/:id/reviews', authenticateToken, getRiskReviews);

module.exports = router;
