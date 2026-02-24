const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getDashboardStats, getDepartments, getAdminStats } = require('../controllers/dashboardController');

router.get('/stats', authenticateToken, getDashboardStats);
router.get('/admin/stats', authenticateToken, getAdminStats);
router.get('/departments', authenticateToken, getDepartments);

module.exports = router;
