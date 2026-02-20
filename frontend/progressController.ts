import { Request, Response } from 'express';
import { ProgressService } from '../services/progressService';

// Interface for request with user attached by auth middleware
interface AuthRequest extends Request {
  user?: {
    id: string;
    [key: string]: any;
  };
}

export const saveProgress = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { courseId, lessonId, progress, completed } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!courseId || !lessonId || progress === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await ProgressService.updateProgress(
      userId,
      courseId,
      lessonId,
      Number(progress),
      Boolean(completed)
    );

    res.status(200).json({ message: 'Progress saved', data: result });
  } catch (error: any) {
    console.error('Error saving progress:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getProgress = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { courseId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const progress = await ProgressService.getCourseProgress(userId, courseId);
    res.status(200).json({ data: progress });
  } catch (error: any) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const analytics = await ProgressService.getUserAnalytics(userId);
    res.status(200).json({ data: analytics });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
};