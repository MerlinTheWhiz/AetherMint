/**
 * Time Analysis Component
 * Displays time spent analysis and learning patterns
 */

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Clock, Calendar, TrendingUp, Moon, Sun } from 'lucide-react';

interface TimeData {
  date: string;
  hours: number;
  lessons: number;
  quizzes: number;
}

interface HourlyData {
  hour: number;
  timeSpent: number;
  activity: string;
}

interface LearningPattern {
  dayOfWeek: string;
  averageTime: number;
  peakHour: number;
  totalSessions: number;
}

interface TimeAnalysisProps {
  userId: string;
  timeRange: 'week' | 'month' | 'quarter' | 'year';
  onTimeRangeChange: (range: 'week' | 'month' | 'quarter' | 'year') => void;
}

export const TimeAnalysis: React.FC<TimeAnalysisProps> = ({
  userId,
  timeRange,
  onTimeRangeChange
}) => {
  const [timeData, setTimeData] = useState<TimeData[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [learningPatterns, setLearningPatterns] = useState<LearningPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<'daily' | 'patterns' | 'distribution'>('daily');

  useEffect(() => {
    fetchTimeAnalysisData();
  }, [userId, timeRange]);

  const fetchTimeAnalysisData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/time/${userId}?range=${timeRange}`);
      if (!response.ok) throw new Error('Failed to fetch time analysis data');
      
      const data = await response.json();
      setTimeData(data.timeData || []);
      setHourlyData(data.hourlyData || []);
      setLearningPatterns(data.learningPatterns || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getTimeOfDay = (hour: number): string => {
    if (hour >= 6 && hour < 12) return 'Morning';
    if (hour >= 12 && hour < 18) return 'Afternoon';
    if (hour >= 18 && hour < 22) return 'Evening';
    return 'Night';
  };

  const getTimeIcon = (hour: number) => {
    if (hour >= 6 && hour < 18) return <Sun className="w-4 h-4" />;
    return <Moon className="w-4 h-4" />;
  };

  const getMostProductiveHour = () => {
    if (hourlyData.length === 0) return null;
    const maxActivity = hourlyData.reduce((max, curr) => 
      curr.timeSpent > max.timeSpent ? curr : max
    );
    return maxActivity;
  };

  const getAverageDailyTime = () => {
    if (timeData.length === 0) return 0;
    const totalHours = timeData.reduce((sum, d) => sum + d.hours, 0);
    return Math.round((totalHours / timeData.length) * 10) / 10;
  };

  const getWeeklyPattern = () => {
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return dayOrder.map(day => {
      const pattern = learningPatterns.find(p => p.dayOfWeek === day);
      return {
        day,
        time: pattern?.averageTime || 0,
        sessions: pattern?.totalSessions || 0
      };
    });
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-red-500 text-center">
          <p>Error loading time analysis: {error}</p>
          <button 
            onClick={fetchTimeAnalysisData}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const mostProductive = getMostProductiveHour();
  const weeklyPattern = getWeeklyPattern();

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-800">Time Analysis</h3>
        <div className="flex gap-2">
          {(['week', 'month', 'quarter', 'year'] as const).map((range) => (
            <button
              key={range}
              onClick={() => onTimeRangeChange(range)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Daily Average</span>
          </div>
          <p className="text-2xl font-bold text-blue-900">{getAverageDailyTime()}h</p>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">Total Time</span>
          </div>
          <p className="text-2xl font-bold text-green-900">
            {Math.round(timeData.reduce((sum, d) => sum + d.hours, 0))}h
          </p>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-800">Study Days</span>
          </div>
          <p className="text-2xl font-bold text-purple-900">{timeData.length}</p>
        </div>

        {mostProductive && (
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              {getTimeIcon(mostProductive.hour)}
              <span className="text-sm font-medium text-orange-800">Peak Hour</span>
            </div>
            <p className="text-2xl font-bold text-orange-900">
              {mostProductive.hour}:00
            </p>
          </div>
        )}
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {['daily', 'patterns', 'distribution'].map((view) => (
          <button
            key={view}
            onClick={() => setSelectedView(view as any)}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              selectedView === view
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            {view.charAt(0).toUpperCase() + view.slice(1)}
          </button>
        ))}
      </div>

      {/* Daily Time Chart */}
      {selectedView === 'daily' && (
        <div>
          <h4 className="text-sm font-medium text-gray-600 mb-4">Daily Study Time</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={timeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value: any, name: string) => [
                  `${value}h`, 
                  name === 'hours' ? 'Study Time' : name === 'lessons' ? 'Lessons' : 'Quizzes'
                ]}
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <Legend />
              <Bar dataKey="hours" fill="#3b82f6" name="Study Time" />
              <Bar dataKey="lessons" fill="#10b981" name="Lessons" />
              <Bar dataKey="quizzes" fill="#f59e0b" name="Quizzes" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Learning Patterns */}
      {selectedView === 'patterns' && (
        <div>
          <h4 className="text-sm font-medium text-gray-600 mb-4">Weekly Learning Patterns</h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h5 className="text-xs font-medium text-gray-500 mb-3">Average Time by Day</h5>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={weeklyPattern}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: any) => [`${value}h`, 'Avg Time']} />
                  <Bar dataKey="time" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div>
              <h5 className="text-xs font-medium text-gray-500 mb-3">Hourly Distribution</h5>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="hour" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${value}:00`}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: any) => [`${value}min`, 'Time Spent']}
                    labelFormatter={(value) => `${value}:00 - ${value + 1}:00`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="timeSpent" 
                    stroke="#06b6d4" 
                    strokeWidth={2}
                    dot={{ fill: '#06b6d4', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Time Distribution */}
      {selectedView === 'distribution' && (
        <div>
          <h4 className="text-sm font-medium text-gray-600 mb-4">Time Distribution</h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h5 className="text-xs font-medium text-gray-500 mb-3">Time of Day</h5>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={hourlyData.reduce((acc: any[], curr) => {
                      const timeOfDay = getTimeOfDay(curr.hour);
                      const existing = acc.find(item => item.name === timeOfDay);
                      if (existing) {
                        existing.value += curr.timeSpent;
                      } else {
                        acc.push({ name: timeOfDay, value: curr.timeSpent });
                      }
                      return acc;
                    }, [])}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {hourlyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`${value}min`, 'Time']} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h5 className="text-xs font-medium text-gray-500 mb-3">Activity Breakdown</h5>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-sm font-medium text-gray-700">Lessons</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ 
                          width: `${(timeData.reduce((sum, d) => sum + d.lessons, 0) / 
                            Math.max(timeData.reduce((sum, d) => sum + d.lessons + d.quizzes, 0), 1)) * 100}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600">
                      {timeData.reduce((sum, d) => sum + d.lessons, 0)}
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-sm font-medium text-gray-700">Quizzes</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ 
                          width: `${(timeData.reduce((sum, d) => sum + d.quizzes, 0) / 
                            Math.max(timeData.reduce((sum, d) => sum + d.lessons + d.quizzes, 0), 1)) * 100}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600">
                      {timeData.reduce((sum, d) => sum + d.quizzes, 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
