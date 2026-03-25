import { Pool } from 'pg';
// @ts-ignore
import pool from '../utils/db';

export class DataAggregationService {
  /**
   * Aggregates course completion statistics
   */
  static async getCourseCompletionStats(courseId: string) {
    const query = `
      SELECT 
        COUNT(DISTINCT user_id) as total_enrolled,
        COUNT(DISTINCT CASE WHEN completed = true THEN user_id END) as completed_count,
        AVG(progress) as average_progress
      FROM user_progress
      WHERE course_id = $1
    `;
    
    try {
      const result = await pool.query(query, [courseId]);
      return {
        courseId,
        ...result.rows[0]
      };
    } catch (error) {
      console.error('Error aggregating course stats:', error);
      throw error;
    }
  }

  /**
   * Aggregates user learning activity over time
   */
  static async getUserDailyActivity(userId: string, days: number = 30) {
    const query = `
      SELECT 
        DATE(last_updated) as activity_date,
        COUNT(*) as lessons_completed,
        AVG(progress) as daily_avg_progress
      FROM user_progress
      WHERE user_id = $1 
        AND last_updated >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(last_updated)
      ORDER BY activity_date ASC
    `;

    try {
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error('Error aggregating user activity:', error);
      throw error;
    }
  }
}