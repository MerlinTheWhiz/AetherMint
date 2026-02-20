import { Progress, IProgress } from '../models/Progress';

export class ProgressService {
  static async updateProgress(
    userId: string, 
    courseId: string, 
    lessonId: string, 
    progress: number, 
    completed: boolean
  ) {
    // Validate inputs
    if (progress < 0 || progress > 100) {
      throw new Error('Progress must be between 0 and 100');
    }

    const progressData: IProgress = {
      user_id: userId,
      course_id: courseId,
      lesson_id: lessonId,
      progress,
      completed
    };

    return await Progress.save(progressData);
  }

  static async getCourseProgress(userId: string, courseId: string) {
    const lessons = await Progress.findByUserAndCourse(userId, courseId);
    
    // Calculate basic stats based on tracked lessons
    const completedCount = lessons.filter(l => l.completed).length;
    const totalTracked = lessons.length;
    
    return {
      courseId,
      totalTrackedLessons: totalTracked,
      completedLessons: completedCount,
      lessons
    };
  }

  static async getUserAnalytics(userId: string) {
    return await Progress.getUserAnalytics(userId);
  }
}