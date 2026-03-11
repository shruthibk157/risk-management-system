const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticateToken } = require('../middleware/auth');

// POST /api/ai/generate-risk
router.post('/generate-risk', authenticateToken, aiController.generateRisk);

// POST /api/ai/articulate-risk (for rephrasing/suggestions)
router.post('/articulate-risk', authenticateToken, aiController.articulateRisk);

// POST /api/ai/validate-requirement
router.post('/validate-requirement', authenticateToken, aiController.validateRequirement);

// POST /api/ai/validate-description
router.post('/validate-description', authenticateToken, aiController.validateDescription);

// POST /api/ai/analyze-risk (unified requirement and description analysis)
router.post('/analyze-risk', authenticateToken, aiController.analyzeRisk);

// POST /api/ai/validate-scoring
router.post('/validate-scoring', authenticateToken, aiController.validateScoring);

// POST /api/ai/log-action (for audit logging)

// GET /api/ai/departments/:id/overview
router.get('/departments/:id/overview', authenticateToken, aiController.getDepartmentOverview);

// POST /api/ai/department-overview
router.post('/department-overview', authenticateToken, aiController.getAIOverview);

module.exports = router;
