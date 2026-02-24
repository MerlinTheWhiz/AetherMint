import { DataAggregationService } from './dataAggregation';
import { TrendAnalysisService } from './trendAnalysis';
import { ReportService } from './reportService';
// @ts-ignore
import { redisClient } from '../utils/redis';

export class AnalyticsService {
  private static CACHE_TTL = 3600; // 1 hour in seconds

  /**
   * Get cached or fresh analytics for a course
   */
  static async getCourseAnalytics(courseId: string) {
    const cacheKey = `analytics:course:${courseId}`;

    try {
      // Try to get from cache
      if (redisClient?.isOpen) {
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
          return JSON.parse(cachedData);
        }
      }
    } catch (error) {
      console.warn('Redis cache miss or error:', error);
    }

    // Calculate fresh data
    const stats = await DataAggregationService.getCourseCompletionStats(courseId);
    
    const result = {
      ...stats,
      lastUpdated: new Date().toISOString()
    };

    // Cache the result
    try {
      if (redisClient?.isOpen) {
        await redisClient.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(result));
      }
    } catch (error) {
      console.warn('Failed to cache analytics:', error);
    }

    return result;
  }

  /**
   * Get user learning insights
   */
  static async getUserInsights(userId: string) {
    const activity = await DataAggregationService.getUserDailyActivity(userId, 7);
    
    // Calculate simple trend based on last 2 days of activity if available
    let trend = { direction: 'flat', percentage: 0 };
    if (activity.length >= 2) {
      const current = activity[activity.length - 1].lessons_completed;
      const previous = activity[activity.length - 2].lessons_completed;
      trend = TrendAnalysisService.calculateTrend(current, previous);
    }

    return {
      userId,
      recentActivity: activity,
      learningTrend: trend
    };
  }

  /**
   * Get time analysis for user
   */
  static async getUserTimeAnalysis(userId: string) {
    const cacheKey = `analytics:time:${userId}`;
    
    try {
      if (redisClient?.isOpen) {
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) return JSON.parse(cachedData);
      }
    } catch (e) { /* ignore cache error */ }

    const data = await DataAggregationService.getUserTimeAnalysis(userId);

    try {
      if (redisClient?.isOpen) {
        await redisClient.setEx(cacheKey, 1800, JSON.stringify(data));
      }
    } catch (e) { /* ignore cache error */ }

    return data;
  }

  /**
   * Generate a downloadable report
   */
  static async generateReport(type: 'course' | 'user', id: string) {
    if (type === 'course') {
      return await ReportService.generateCoursePerformanceReport(id);
    } else if (type === 'user') {
      return await ReportService.generateUserProgressReport(id);
    } else {
      throw new Error('Invalid report type');
    }
  }
}