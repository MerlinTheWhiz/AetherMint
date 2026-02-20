import { Pool } from 'pg';
// Assuming db connection is exported from utils/db or similar
// @ts-ignore
import pool from '../utils/db';

export interface IProgress {
  user_id: string;
  course_id: string;
  lesson_id: string;
  progress: number;
  completed: boolean;
  last_updated?: Date;
}

export class Progress {
  static async save(data: IProgress): Promise<IProgress> {
    const query = `
      INSERT INTO user_progress (user_id, course_id, lesson_id, progress, completed, last_updated)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (user_id, course_id, lesson_id)
      DO UPDATE SET 
        progress = $4, 
        completed = $5, 
        last_updated = NOW()
      RETURNING *;
    `;
    const values = [
      data.user_id,
      data.course_id,
      data.lesson_id,
      data.progress,
      data.completed
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByUserAndCourse(userId: string, courseId: string): Promise<IProgress[]> {
    const query = `
      SELECT * FROM user_progress 
      WHERE user_id = $1 AND course_id = $2
      ORDER BY lesson_id ASC;
    `;
    const result = await pool.query(query, [userId, courseId]);
    return result.rows;
  }

  static async getUserAnalytics(userId: string) {
    const query = `
      SELECT 
        course_id,
        COUNT(*) as total_lessons_started,
        SUM(CASE WHEN completed THEN 1 ELSE 0 END) as completed_lessons,
        AVG(progress) as avg_progress
      FROM user_progress
      WHERE user_id = $1
      GROUP BY course_id;
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }
}