/**
 * @openapi
 * tags:
 *   - name: Analytics
 *     description: Platform analytics and reporting
 */

const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const analyticsController = require("../controllers/analyticsController");

router.use(authenticate, authorize("admin"));

/**
 * @openapi
 * /api/analytics/overview:
 *   get:
 *     tags: [Analytics]
 *     summary: Get analytics overview
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Overview retrieved
 */
router.get("/overview", analyticsController.getOverview);

/**
 * @openapi
 * /api/analytics/users:
 *   get:
 *     tags: [Analytics]
 *     summary: Get user analytics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: User analytics retrieved
 */
router.get("/users", analyticsController.getUserAnalytics);

/**
 * @openapi
 * /api/analytics/courses:
 *   get:
 *     tags: [Analytics]
 *     summary: Get course analytics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Course analytics retrieved
 */
router.get("/courses", analyticsController.getCourseAnalytics);

/**
 * @openapi
 * /api/analytics/engagement:
 *   get:
 *     tags: [Analytics]
 *     summary: Get engagement metrics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Engagement metrics retrieved
 */
router.get("/engagement", analyticsController.getEngagementMetrics);

/**
 * @openapi
 * /api/analytics/revenue:
 *   get:
 *     tags: [Analytics]
 *     summary: Get revenue analytics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Revenue analytics retrieved
 */
router.get("/revenue", analyticsController.getRevenueAnalytics);

/**
 * @openapi
 * /api/analytics/performance:
 *   get:
 *     tags: [Analytics]
 *     summary: Get system performance metrics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Performance metrics retrieved
 */
router.get("/performance", analyticsController.getPerformanceMetrics);

/**
 * @openapi
 * /api/analytics/custom:
 *   post:
 *     tags: [Analytics]
 *     summary: Run custom analytics query
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Query results
 */
router.post("/custom", analyticsController.runCustomQuery);

/**
 * @openapi
 * /api/analytics/export:
 *   post:
 *     tags: [Analytics]
 *     summary: Export analytics report
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Report exported
 */
router.post("/export", analyticsController.exportReport);

module.exports = router;
