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
          exportData = await generatePDF(data);
          filename = `analytics_${userId}_${timeRange}_${Date.now()}.pdf`;
          mimeType = 'application/pdf';
          break;
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
    if (data.timeData && data.timeData.length > 0) {
      csv += 'Time Analysis\n';
      csv += 'Date,Hours Spent,Lessons,Quizzes\n';
      data.timeData.forEach((row: any) => {
        csv += `${row.date},${row.hours},${row.lessons},${row.quizzes}\n`;
      });
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

  const generatePDF = async (data: any): Promise<ArrayBuffer> {
    // This would typically use a library like jsPDF or PDFKit
    // For now, return a simple text-based PDF as placeholder
    const textContent = generateCSV(data);
    const encoder = new TextEncoder();
    return encoder.encode(textContent).buffer;
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
