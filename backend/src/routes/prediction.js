/**
 * @openapi
 * tags:
 *   - name: Prediction
 *     description: AI-powered predictions and forecasting
 */

const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const predictionController = require("../controllers/predictionController");

router.use(authenticate);

/**
 * @openapi
 * /api/prediction/student-performance:
 *   post:
 *     tags: [Prediction]
 *     summary: Predict student performance
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Performance prediction generated
 */
router.post("/student-performance", predictionController.predictStudentPerformance);

/**
 * @openapi
 * /api/prediction/dropout-risk:
 *   post:
 *     tags: [Prediction]
 *     summary: Predict dropout risk
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Dropout risk prediction generated
 */
router.post("/dropout-risk", predictionController.predictDropoutRisk);

/**
 * @openapi
 * /api/prediction/course-completion:
 *   post:
 *     tags: [Prediction]
 *     summary: Predict course completion probability
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Completion prediction generated
 */
router.post("/course-completion", predictionController.predictCourseCompletion);

/**
 * @openapi
 * /api/prediction/engagement:
 *   post:
 *     tags: [Prediction]
 *     summary: Predict student engagement levels
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Engagement prediction generated
 */
router.post("/engagement", predictionController.predictEngagement);

/**
 * @openapi
 * /api/prediction/learning-style:
 *   post:
 *     tags: [Prediction]
 *     summary: Predict learning style
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Learning style prediction generated
 */
router.post("/learning-style", predictionController.predictLearningStyle);

module.exports = router;
