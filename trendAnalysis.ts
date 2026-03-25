export class TrendAnalysisService {
  /**
   * Calculates the trend direction and percentage change between two values
   */
  static calculateTrend(current: number, previous: number) {
    if (previous === 0) {
      return {
        direction: current > 0 ? 'up' : 'flat',
        percentage: current > 0 ? 100 : 0
      };
    }

    const change = ((current - previous) / previous) * 100;
    return {
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat',
      percentage: Math.abs(change)
    };
  }

  /**
   * Analyzes activity data to find learning streaks and patterns
   */
  static analyzeActivityPatterns(dailyActivity: any[]) {
    let currentStreak = 0;
    let maxStreak = 0;
    let totalLessons = 0;

    // Assuming dailyActivity is sorted by date ASC
    for (const day of dailyActivity) {
      if (parseInt(day.lessons_completed) > 0) {
        currentStreak++;
        totalLessons += parseInt(day.lessons_completed);
      } else {
        maxStreak = Math.max(maxStreak, currentStreak);
        currentStreak = 0;
      }
    }
    maxStreak = Math.max(maxStreak, currentStreak);

    return {
      currentStreak,
      maxStreak,
      totalLessons,
      averageDailyLessons: dailyActivity.length > 0 ? totalLessons / dailyActivity.length : 0
    };
  }
}