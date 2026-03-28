const express = require('express');
const router = express.Router();
const AnalyticsController = require('../controllers/analyticsController');

// Initialize controller
const analyticsController = new AnalyticsController();

// Middleware for validation
const validateAnalyticsRequest = (req, res, next) => {
  const { timeframe, reportType } = req.query;
  
  const validTimeframes = ['day', 'week', 'month', 'quarter', 'year', 'semester'];
  const validReportTypes = ['studentProgress', 'instructorPerformance', 'platformAnalytics', 'custom'];
  
  if (timeframe && !validTimeframes.includes(timeframe)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid timeframe. Valid options: ' + validTimeframes.join(', ')
    });
  }
  
  if (reportType && !validReportTypes.includes(reportType)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid report type. Valid options: ' + validReportTypes.join(', ')
    });
  }
  
  next();
};

// Student Analytics Routes
router.get('/students/:studentId',
  validateAnalyticsRequest,
  analyticsController.getStudentAnalytics.bind(analyticsController)
);

router.post('/students/batch',
  validateAnalyticsRequest,
  analyticsController.getBatchStudentAnalytics.bind(analyticsController)
);

router.get('/students/:studentId/dashboard',
  analyticsController.getStudentDashboard.bind(analyticsController)
);

// Instructor Analytics Routes
router.get('/instructors/:instructorId',
  validateAnalyticsRequest,
  analyticsController.getInstructorAnalytics.bind(analyticsController)
);

router.get('/courses/:courseId/performance',
  validateAnalyticsRequest,
  analyticsController.getCoursePerformanceMetrics.bind(analyticsController)
);

router.get('/courses/:courseId/engagement',
  validateAnalyticsRequest,
  analyticsController.getStudentEngagementData.bind(analyticsController)
);

router.get('/courses/:courseId/completion-rates',
  validateAnalyticsRequest,
  analyticsController.getAssignmentCompletionRates.bind(analyticsController)
);

router.get('/courses/:courseId/grade-distribution',
  validateAnalyticsRequest,
  analyticsController.getGradeDistribution.bind(analyticsController)
);

router.get('/courses/:courseId/content-effectiveness',
  validateAnalyticsRequest,
  analyticsController.getContentEffectiveness.bind(analyticsController)
);

router.get('/instructors/:instructorId/comparisons',
  validateAnalyticsRequest,
  analyticsController.getClassComparisons.bind(analyticsController)
);

router.get('/courses/:courseId',
  validateAnalyticsRequest,
  analyticsController.getCourseAnalytics.bind(analyticsController)
);

router.get('/instructors/:instructorId/dashboard',
  analyticsController.getInstructorDashboard.bind(analyticsController)
);

// Platform Analytics Routes
router.get('/platform',
  validateAnalyticsRequest,
  analyticsController.getPlatformAnalytics.bind(analyticsController)
);

router.get('/platform/engagement',
  validateAnalyticsRequest,
  analyticsController.getUserEngagementMetrics.bind(analyticsController)
);

router.get('/platform/course-popularity',
  validateAnalyticsRequest,
  analyticsController.getCoursePopularityTrends.bind(analyticsController)
);

router.get('/platform/revenue',
  validateAnalyticsRequest,
  analyticsController.getRevenueAnalytics.bind(analyticsController)
);

router.get('/platform/performance',
  validateAnalyticsRequest,
  analyticsController.getSystemPerformanceMetrics.bind(analyticsController)
);

router.get('/platform/behavior-patterns',
  validateAnalyticsRequest,
  analyticsController.getUserBehaviorPatterns.bind(analyticsController)
);

router.get('/platform/growth-retention',
  validateAnalyticsRequest,
  analyticsController.getGrowthAndRetentionAnalytics.bind(analyticsController)
);

router.get('/platform/overview',
  analyticsController.getPlatformOverview.bind(analyticsController)
);

router.get('/platform/dashboard',
  analyticsController.getPlatformDashboard.bind(analyticsController)
);

// Data Visualization Routes
router.post('/charts/generate',
  analyticsController.generateChart.bind(analyticsController)
);

router.post('/dashboards/generate',
  analyticsController.generateDashboard.bind(analyticsController)
);

// Export Routes
router.get('/charts/:chartId/export/:format',
  analyticsController.exportChart.bind(analyticsController)
);

router.get('/dashboards/:dashboardId/export/:format',
  analyticsController.exportDashboard.bind(analyticsController)
);

// Report Generation Routes
router.post('/reports/generate',
  analyticsController.generateReport.bind(analyticsController)
);

router.get('/reports/:reportId',
  analyticsController.getReport.bind(analyticsController)
);

router.post('/reports/schedule',
  analyticsController.scheduleReport.bind(analyticsController)
);

// Real-time Data Routes
router.get('/realtime/metrics',
  analyticsController.getRealTimeMetrics.bind(analyticsController)
);

router.get('/live',
  analyticsController.getLiveAnalytics.bind(analyticsController)
);

// Configuration Routes
router.get('/config',
  analyticsController.getAnalyticsConfig.bind(analyticsController)
);

router.put('/config',
  analyticsController.updateAnalyticsConfig.bind(analyticsController)
);

// Health check
router.get('/health',
  analyticsController.healthCheck.bind(analyticsController)
);

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Analytics route error:', error);
  
  res.status(500).json({
    success: false,
    message: 'Internal server error in analytics service',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

module.exports = router;
