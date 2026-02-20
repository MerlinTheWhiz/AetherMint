import { Router } from 'express';
import { saveProgress, getProgress, getAnalytics } from '../controllers/progressController';
// Assuming auth middleware is available
// @ts-ignore
import { authenticate } from '../middleware/auth'; 

const router = Router();

router.use(authenticate);

router.post('/', saveProgress);
router.get('/analytics', getAnalytics);
router.get('/:courseId', getProgress);

export default router;