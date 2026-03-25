/**
 * Export Button Component
 * Handles data export functionality for analytics dashboard
 */

import React, { useState } from 'react';
import { Download, FileText, Table, Calendar } from 'lucide-react';

interface ExportButtonProps {
  userId: string;
  data: any;
  timeRange: string;
  onExport?: (format: 'csv' | 'pdf' | 'excel', data: any) => void;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  userId,
  data,
  timeRange,
  onExport
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleExport = async (format: 'csv' | 'pdf' | 'excel') => {
    try {
      setIsExporting(true);
      setShowMenu(false);

      let exportData;
      let filename;
      let mimeType;

      switch (format) {
        case 'csv':
          exportData = generateCSV(data);
          filename = `analytics_${userId}_${timeRange}_${Date.now()}.csv`;
          mimeType = 'text/csv';
          break;
        case 'excel':
          exportData = generateExcel(data);
          filename = `analytics_${userId}_${timeRange}_${Date.now()}.xlsx`;
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;
        case 'pdf':
          // PDF handled via print window
          await generatePDF(data);
          return;
        default:
          throw new Error('Unsupported export format');
      }

      // Create download link
      const blob = new Blob([exportData], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (onExport) {
        onExport(format, data);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const generateCSV = (data: any): string => {
    if (!data || Object.keys(data).length === 0) {
      return 'No data available';
    }

    let csv = '';
    
    // Add metadata
    csv += 'Analytics Export\n';
    csv += `User ID,${userId}\n`;
    csv += `Time Range,${timeRange}\n`;
    csv += `Export Date,${new Date().toISOString()}\n\n`;

    // Add progress data if available
    if (data.progressData && data.progressData.length > 0) {
      csv += 'Progress Data\n';
      csv += 'Date,Completed Lessons,Total Time (min),Quiz Scores,Streak\n';
      data.progressData.forEach((row: any) => {
        csv += `${row.date},${row.completedLessons},${row.totalTime},${row.quizScores},${row.streak}\n`;
      });
      csv += '\n';
    }

    // Add completion stats if available
    if (data.completionStats && data.completionStats.length > 0) {
      csv += 'Course Completion Stats\n';
      csv += 'Course Title,Completed Lessons,Total Lessons,Completion %,Time Spent (min),Status\n';
      data.completionStats.forEach((course: any) => {
        csv += `"${course.title}",${course.completedLessons},${course.totalLessons},${course.completionPercentage},${course.timeSpent},${course.status}\n`;
      });
      csv += '\n';
    }

    // Add time analysis if available
    if (data.timeData) {
      csv += 'Time Analysis - Daily Activity\n';
      csv += 'Day,Minutes\n';
      if (Array.isArray(data.timeData.timeByDay)) {
        data.timeData.timeByDay.forEach((row: any) => {
          csv += `${row.day},${row.minutes}\n`;
        });
      }
      
      csv += '\nTime Analysis - By Course\n';
      csv += 'Course,Minutes\n';
      if (Array.isArray(data.timeData.timeByCourse)) {
        data.timeData.timeByCourse.forEach((row: any) => {
          csv += `${row.name},${row.value}\n`;
        });
      }
      csv += '\n';
    }

    return csv;
  };

  const generateExcel = (data: any): ArrayBuffer => {
    // This would typically use a library like xlsx or exceljs
    // For now, return CSV data as placeholder
    const csvData = generateCSV(data);
    const encoder = new TextEncoder();
    return encoder.encode(csvData).buffer as ArrayBuffer;
  };

  const generatePDF = async (data: any): Promise<void> => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to export PDF');
      return;
    }

    const generateHTMLTables = (data: any) => {
      let html = '';
      
      if (data.completionStats) {
        html += '<h2>Course Completion</h2><table><thead><tr><th>Course</th><th>Progress</th><th>Status</th></tr></thead><tbody>';
        data.completionStats.forEach((c: any) => {
          html += `<tr><td>${c.title}</td><td>${c.completionPercentage}%</td><td>${c.status}</td></tr>`;
        });
        html += '</tbody></table>';
      }

      if (data.progressData) {
        html += '<h2>Recent Progress</h2><table><thead><tr><th>Date</th><th>Lessons</th><th>Time (min)</th></tr></thead><tbody>';
        data.progressData.forEach((p: any) => {
          html += `<tr><td>${p.date}</td><td>${p.completedLessons}</td><td>${p.totalTime}</td></tr>`;
        });
        html += '</tbody></table>';
      }

      if (data.timeData) {
        html += '<h2>Time Analysis</h2>';
        if (data.timeData.timeByDay) {
          html += '<h3>Daily Activity</h3><table><thead><tr><th>Day</th><th>Minutes</th></tr></thead><tbody>';
          data.timeData.timeByDay.forEach((d: any) => {
            html += `<tr><td>${d.day}</td><td>${d.minutes}</td></tr>`;
          });
          html += '</tbody></table>';
        }
        if (data.timeData.timeByCourse) {
          html += '<h3>Time by Course</h3><table><thead><tr><th>Course</th><th>Minutes</th></tr></thead><tbody>';
          data.timeData.timeByCourse.forEach((c: any) => {
            html += `<tr><td>${c.name}</td><td>${c.value}</td></tr>`;
          });
          html += '</tbody></table>';
        }
      }

      return html;
    };

    const html = `
      <html>
        <head>
          <title>Analytics Report - ${userId}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 40px; color: #333; }
            h1 { color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
            h2 { margin-top: 30px; color: #4b5563; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
            th { background-color: #f9fafb; font-weight: 600; }
            tr:nth-child(even) { background-color: #f9fafb; }
          </style>
        </head>
        <body>
          <h1>Learning Analytics Report</h1>
          <p><strong>User ID:</strong> ${userId}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          ${generateHTMLTables(data)}
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isExporting}
        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isExporting ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Exporting...
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            Export
          </>
        )}
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="py-1">
            <button
              onClick={() => handleExport('csv')}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Table className="w-4 h-4" />
              Export as CSV
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Export as Excel
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Export as PDF
            </button>
          </div>
        </div>
      )}

      {/* Close menu when clicking outside */}
      {showMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
};
