import { Router } from 'express';
import quizController from '../controllers/quizController';

const router = Router();

// Quiz CRUD endpoints
router.post('/', quizController.createQuiz);
router.get('/', quizController.getQuizzes);
router.get('/:id', quizController.getQuizById);
router.put('/:id', quizController.updateQuiz);
router.delete('/:id', quizController.deleteQuiz);

// Quiz publishing
router.post('/:id/publish', quizController.toggleQuizPublish);

// Quiz submission and grading
router.post('/:id/submit', quizController.submitQuiz);
router.get('/:id/submission', quizController.getUserSubmission);
router.get('/:id/results', quizController.getQuizResults);
router.get('/:id/statistics', quizController.getQuizStatistics);
router.get('/:id/grading-statistics', quizController.getGradingStatistics);

// Submission management
router.get('/submissions/:submissionId', quizController.getSubmissionById);
router.post('/submissions/:submissionId/regrade', quizController.regradeSubmission);

// Health check
router.get('/health', quizController.healthCheck);

export default router;
