/**
 * Preview Mode Component
 * Displays a preview of the rich text editor content
 */

import React, { useState, useEffect } from 'react';
import { Eye, Edit3, Maximize2, Minimize2, Download, Share2 } from 'lucide-react';

interface PreviewModeProps {
  content: string;
  onEdit?: () => void;
  className?: string;
  title?: string;
  showControls?: boolean;
}

export const PreviewMode: React.FC<PreviewModeProps> = ({
  content,
  onEdit,
  className = '',
  title = 'Content Preview',
  showControls = true
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);
  const [isPrinting, setIsPrinting] = useState(false);

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Handle scale change
  const handleScaleChange = (scale: number) => {
    setPreviewScale(scale);
  };

  // Handle print
  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  // Handle download
  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'content.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle share
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: content.replace(/<[^>]*>/g, ''), // Strip HTML tags for text sharing
          url: window.location.href
        });
      } catch (error) {
        console.error('Share failed:', error);
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(content.replace(/<[^>]*>/g, ''));
      } catch (error) {
        console.error('Copy to clipboard failed:', error);
      }
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        toggleFullscreen();
      } else if (e.key === '+' || (e.key === '=' && e.shiftKey)) {
        e.preventDefault();
        handleScaleChange(Math.min(previewScale + 0.1, 2));
      } else if (e.key === '-' || (e.key === '_' && e.shiftKey)) {
        e.preventDefault();
        handleScaleChange(Math.max(previewScale - 0.1, 0.5));
      } else if (e.key === '0') {
        e.preventDefault();
        handleScaleChange(1);
      } else if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'p':
            e.preventDefault();
            handlePrint();
            break;
          case 's':
            e.preventDefault();
            handleDownload();
            break;
          case 'd':
            e.preventDefault();
            handleDownload();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen, previewScale]);

  // Clean up print styles after printing
  useEffect(() => {
    if (isPrinting) {
      const handleAfterPrint = () => {
        setIsPrinting(false);
        document.body.classList.remove('print-mode');
      };
      
      window.addEventListener('afterprint', handleAfterPrint);
      return () => {
        window.removeEventListener('afterprint', handleAfterPrint);
      };
    }
  }, [isPrinting]);

  return (
    <div className={`preview-mode ${className} ${isFullscreen ? 'fullscreen' : ''} ${isPrinting ? 'printing' : ''}`}>
      {/* Header Controls */}
      {showControls && (
        <div className="preview-controls bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={onEdit}
                className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Scale Controls */}
            <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
              <button
                onClick={() => handleScaleChange(0.5)}
                className="p-1 hover:bg-gray-100 rounded"
                title="Zoom Out (50%)"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleScaleChange(0.75)}
                className="p-1 hover:bg-gray-100 rounded"
                title="Zoom Out (75%)"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleScaleChange(1)}
                className="p-1 hover:bg-gray-100 rounded"
                title="Actual Size (100%)"
              >
                <div className="w-4 h-4 text-xs text-center">100%</div>
              </button>
              <button
                onClick={() => handleScaleChange(1.25)}
                className="p-1 hover:bg-gray-100 rounded"
                title="Zoom In (125%)"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleScaleChange(1.5)}
                className="p-1 hover:bg-gray-100 rounded"
                title="Zoom In (150%)"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            {/* Action Controls */}
            <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
              <button
                onClick={handlePrint}
                className="p-1 hover:bg-gray-100 rounded"
                title="Print (Ctrl+P)"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={handleDownload}
                className="p-1 hover:bg-gray-100 rounded"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={handleShare}
                className="p-1 hover:bg-gray-100 rounded"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>

            {/* View Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={toggleFullscreen}
                className="p-1 hover:bg-gray-100 rounded"
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Content */}
      <div className="preview-container flex-1 overflow-auto">
        <div 
          className="preview-content bg-white mx-auto"
          style={{ 
            transform: `scale(${previewScale})`,
            transformOrigin: 'top center',
            width: isFullscreen ? '100%' : 'auto',
            maxWidth: isFullscreen ? '100%' : '800px',
            minHeight: '600px',
            transition: 'transform 0.3s ease',
            boxShadow: isFullscreen ? '0 4px 6px rgba(0, 0, 0, 0.1)' : 'none',
            borderRadius: isFullscreen ? '8px' : '0',
            backgroundColor: isFullscreen ? '#f9f9f9' : 'white'
          }}
        >
          <div 
            className="preview-html"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      </div>

      {/* Footer Info */}
      <div className="preview-footer bg-gray-50 border-t border-gray-200 px-4 py-2">
        <div className="flex justify-between items-center text-sm text-gray-600">
          <div>
            Scale: {Math.round(previewScale * 100)}%
          </div>
          <div>
            {isFullscreen ? 'Press ESC to exit fullscreen' : 'Click fullscreen for better view'}
          </div>
        </div>
      </div>

      <style jsx>{`
        .preview-mode {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          height: 100vh;
          display: flex;
          flex-direction: column;
        }
        
        .preview-controls {
          flex-shrink: 0;
        }
        
        .preview-container {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
          background: #f5f5f5;
        }
        
        .preview-content {
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .preview-html {
          padding: 20px;
          line-height: 1.6;
          font-size: 16px;
          color: #333;
          overflow: auto;
          max-height: 100%;
        }
        
        .preview-html h1 {
          font-size: 2em;
          margin-bottom: 0.5em;
          color: #1a1a1a;
        }
        
        .preview-html h2 {
          font-size: 1.5em;
          margin-bottom: 0.4em;
          color: #1a1a1a;
        }
        
        .preview-html h3 {
          font-size: 1.25em;
          margin-bottom: 0.3em;
          color: #1a1a1a;
        }
        
        .preview-html p {
          margin-bottom: 1em;
        }
        
        .preview-html img {
          max-width: 100%;
          height: auto;
          border-radius: 4px;
          margin: 8px 0;
        }
        
        .preview-html pre {
          background-color: #f4f4f4;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 12px;
          margin: 8px 0;
          overflow-x: auto;
          font-family: 'Courier New', monospace;
        }
        
        .preview-html blockquote {
          border-left: 4px solid #ddd;
          margin: 16px 0;
          padding-left: 16px;
          font-style: italic;
          color: #666;
        }
        
        .preview-html a {
          color: #3b82f6;
          text-decoration: underline;
        }
        
        .preview-html a:hover {
          color: #2563eb;
        }
        
        .preview-html ul, .preview-html ol {
          margin: 1em 0;
          padding-left: 2em;
        }
        
        .preview-html li {
          margin-bottom: 0.5em;
        }
        
        .preview-html table {
          border-collapse: collapse;
          width: 100%;
          margin: 1em 0;
        }
        
        .preview-html th, .preview-html td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        
        .preview-html th {
          background-color: #f8f9fa;
          font-weight: 600;
        }
        
        .preview-footer {
          flex-shrink: 0;
        }
        
        .preview-mode.fullscreen {
          background: #000;
        }
        
        .preview-mode.fullscreen .preview-container {
          padding: 0;
          background: #000;
        }
        
        .preview-mode.fullscreen .preview-content {
          border: none;
          border-radius: 0;
          box-shadow: none;
        }
        
        .preview-mode.printing .preview-container {
          padding: 0;
          background: white;
        }
        
        .preview-mode.printing .preview-content {
          border: none;
        }
        
        @media print {
          .preview-mode {
            height: auto;
          }
          
          .preview-controls {
            display: none;
          }
          
          .preview-footer {
            display: none;
          }
        }
        
        @media screen and (max-width: 768px) {
          .preview-content {
            max-width: 100%;
            max-height: 100%;
          }
        }
      `}</style>
    </div>
  );
};
