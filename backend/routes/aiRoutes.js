const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// POST /api/ai/generate-risk
router.post('/generate-risk', aiController.generateRisk);

// POST /api/ai/articulate-risk (for rephrasing/suggestions)
router.post('/articulate-risk', aiController.articulateRisk);

module.exports = router;
