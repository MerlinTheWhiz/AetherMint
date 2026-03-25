import { DataAggregationService } from './dataAggregation';
import { TrendAnalysisService } from './trendAnalysis';

export class ReportService {
  static async generateCoursePerformanceReport(courseId: string) {
    const stats = await DataAggregationService.getCourseCompletionStats(courseId);
    
    return {
      reportType: 'COURSE_PERFORMANCE',
      generatedAt: new Date().toISOString(),
      courseId,
      metrics: {
        totalEnrolled: parseInt(stats.total_enrolled || '0'),
        completionCount: parseInt(stats.completed_count || '0'),
        averageProgress: parseFloat(stats.average_progress || '0').toFixed(2) + '%'
      },
      summary: `Course ${courseId} has ${stats.total_enrolled} students with a ${parseFloat(stats.average_progress || '0').toFixed(1)}% average progress.`
    };
  }

  static async generateUserProgressReport(userId: string) {
    const activity = await DataAggregationService.getUserDailyActivity(userId, 30);
    const patterns = TrendAnalysisService.analyzeActivityPatterns(activity);

    return {
      reportType: 'USER_PROGRESS',
      generatedAt: new Date().toISOString(),
      userId,
      activitySummary: patterns,
      detailedActivity: activity
    };
  }
}