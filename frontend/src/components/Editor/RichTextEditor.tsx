/**
 * Rich Text Editor Component
 * WYSIWYG editor for creating and editing course content
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  Link,
  Image,
  Video,
  Code,
  Quote,
  Undo,
  Redo,
  Eye,
  Edit3
} from 'lucide-react';

interface EditorContent {
  html: string;
  text: string;
  plainText: string;
}

interface RichTextEditorProps {
  initialContent?: string;
  placeholder?: string;
  readOnly?: boolean;
  autoSave?: boolean;
  onSave?: (content: EditorContent) => void;
  onChange?: (content: EditorContent) => void;
  className?: string;
  minHeight?: number;
  maxHeight?: number;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  initialContent = '',
  placeholder = 'Start writing your content...',
  readOnly = false,
  autoSave = true,
  onSave,
  onChange,
  className = '',
  minHeight = 300,
  maxHeight = 600
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState(initialContent);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [history, setHistory] = useState<string[]>([initialContent]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selection, setSelection] = useState<Range | null>(null);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showMediaDialog, setShowMediaDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');

  // Initialize editor content
  useEffect(() => {
    if (editorRef.current && content) {
      editorRef.current.innerHTML = content;
    }
  }, [content]);

  // Save content to history
  const saveToHistory = useCallback((newContent: string) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newContent);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  // Get current content
  const getCurrentContent = useCallback((): EditorContent => {
    if (!editorRef.current) {
      return { html: '', text: '', plainText: '' };
    }

    const html = editorRef.current.innerHTML;
    const text = editorRef.current.innerText || '';
    const plainText = editorRef.current.textContent || '';

    return { html, text, plainText };
  }, []);

  // Handle content changes
  const handleContentChange = useCallback(() => {
    if (readOnly) return;

    const currentContent = getCurrentContent();
    setContent(currentContent.html);
    saveToHistory(currentContent.html);
    
    onChange?.(currentContent);
    
    if (autoSave && onSave) {
      // Debounce auto-save
      setTimeout(() => {
        onSave(currentContent);
      }, 1000);
    }
  }, [readOnly, getCurrentContent, saveToHistory, onChange, autoSave, onSave]);

  // Format commands
  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    handleContentChange();
    editorRef.current?.focus();
  }, [handleContentChange]);

  // Text formatting commands
  const formatBold = () => execCommand('bold');
  const formatItalic = () => execCommand('italic');
  const formatUnderline = () => execCommand('underline');
  const formatStrikeThrough = () => execCommand('strikeThrough');
  const formatCode = () => execCommand('formatBlock', '<pre>');
  const formatQuote = () => execCommand('formatBlock', '<blockquote>');
  const formatHeading = (level: number) => execCommand('formatBlock', `<h${level}>`);
  const formatParagraph = () => execCommand('formatBlock', '<p>');
  const formatUnorderedList = () => execCommand('insertUnorderedList');
  const formatOrderedList = () => execCommand('insertOrderedList');
  const alignText = (alignment: 'left' | 'center' | 'right') => execCommand(`justify${alignment}`);
  const insertHorizontalRule = () => execCommand('insertHorizontalRule');
  const clearFormatting = () => execCommand('removeFormat');

  // Link handling
  const createLink = () => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      setLinkText(selection.toString());
      setLinkUrl('');
      setShowLinkDialog(true);
    } else {
      setLinkText('');
      setLinkUrl('');
      setShowLinkDialog(true);
    }
  };

  const insertLink = () => {
    if (linkUrl) {
      const text = linkText || linkUrl;
      const linkHtml = `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${text}</a>`;
      execCommand('insertHTML', linkHtml);
    }
    setShowLinkDialog(false);
    setLinkUrl('');
    setLinkText('');
  };

  const removeLink = () => {
    execCommand('unlink');
  };

  // Media handling
  const insertImage = () => {
    setShowMediaDialog(true);
  };

  const insertVideo = () => {
    const videoHtml = `
      <div contenteditable="false" class="video-placeholder">
        <p>📹 Video URL or embed code</p>
        <input type="text" placeholder="Enter video URL or embed code" 
               style="width: 100%; padding: 8px; margin: 8px 0; border: 1px solid #ddd; border-radius: 4px;"
               onchange="if(this.value) { this.parentElement.innerHTML = this.value.includes('<iframe') ? this.value : '<video controls style=\\"width: 100%; max-width: 600px;\\"><source src=\\"' + this.value + '\\" type=\\"video/mp4\\"></video>'; } }" />
      </div>
    `;
    execCommand('insertHTML', videoHtml);
  };

  const insertCodeBlock = () => {
    const codeHtml = `
      <pre contenteditable="false" class="code-block">
        <code contenteditable="true" style="font-family: 'Courier New', monospace; background: #f4f4f4; padding: 12px; border-radius: 4px; display: block; white-space: pre-wrap;">// Your code here</code>
      </pre>
    `;
    execCommand('insertHTML', codeHtml);
  };

  // Undo/Redo functionality
  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const newContent = history[newIndex];
      setHistoryIndex(newIndex);
      setContent(newContent);
      if (editorRef.current) {
        editorRef.current.innerHTML = newContent;
      }
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const newContent = history[newIndex];
      setHistoryIndex(newIndex);
      setContent(newContent);
      if (editorRef.current) {
        editorRef.current.innerHTML = newContent;
      }
    }
  };

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (readOnly) return;

    // Common shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          formatBold();
          break;
        case 'i':
          e.preventDefault();
          formatItalic();
          break;
        case 'u':
          e.preventDefault();
          formatUnderline();
          break;
        case 'k':
          e.preventDefault();
          createLink();
          break;
        case 'z':
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
          break;
        case 'y':
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            redo();
          }
          break;
      }
    }
  }, [readOnly, formatBold, formatItalic, formatUnderline, createLink, undo, redo]);

  // Toggle preview mode
  const togglePreview = () => {
    setIsPreviewMode(!isPreviewMode);
  };

  // Save content
  const saveContent = () => {
    const currentContent = getCurrentContent();
    onSave?.(currentContent);
  };

  return (
    <div className={`rich-text-editor border border-gray-300 rounded-lg overflow-hidden ${className}`}>
      {/* Toolbar */}
      {!readOnly && !isPreviewMode && (
        <div className="toolbar bg-gray-50 border-b border-gray-300 p-2 flex flex-wrap gap-1">
          {/* Undo/Redo */}
          <div className="toolbar-group flex gap-1 border-r border-gray-300 pr-2">
            <button
              onClick={undo}
              disabled={historyIndex === 0}
              className="toolbar-btn p-2 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              title="Undo (Ctrl+Z)"
            >
              <Undo className="w-4 h-4" />
            </button>
            <button
              onClick={redo}
              disabled={historyIndex === history.length - 1}
              className="toolbar-btn p-2 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              title="Redo (Ctrl+Y)"
            >
              <Redo className="w-4 h-4" />
            </button>
          </div>

          {/* Text Formatting */}
          <div className="toolbar-group flex gap-1 border-r border-gray-300 pr-2">
            <button
              onClick={formatBold}
              className="toolbar-btn p-2 hover:bg-gray-200 rounded font-bold"
              title="Bold (Ctrl+B)"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              onClick={formatItalic}
              className="toolbar-btn p-2 hover:bg-gray-200 rounded italic"
              title="Italic (Ctrl+I)"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              onClick={formatUnderline}
              className="toolbar-btn p-2 hover:bg-gray-200 rounded underline"
              title="Underline (Ctrl+U)"
            >
              <Underline className="w-4 h-4" />
            </button>
            <button
              onClick={formatStrikeThrough}
              className="toolbar-btn p-2 hover:bg-gray-200 rounded line-through"
              title="Strikethrough"
            >
              <span className="w-4 h-4 flex items-center justify-center text-sm">S</span>
            </button>
          </div>

          {/* Text Alignment */}
          <div className="toolbar-group flex gap-1 border-r border-gray-300 pr-2">
            <button
              onClick={() => alignText('left')}
              className="toolbar-btn p-2 hover:bg-gray-200 rounded"
              title="Align Left"
            >
              <AlignLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => alignText('center')}
              className="toolbar-btn p-2 hover:bg-gray-200 rounded"
              title="Align Center"
            >
              <AlignCenter className="w-4 h-4" />
            </button>
            <button
              onClick={() => alignText('right')}
              className="toolbar-btn p-2 hover:bg-gray-200 rounded"
              title="Align Right"
            >
              <AlignRight className="w-4 h-4" />
            </button>
          </div>

          {/* Lists */}
          <div className="toolbar-group flex gap-1 border-r border-gray-300 pr-2">
            <button
              onClick={formatUnorderedList}
              className="toolbar-btn p-2 hover:bg-gray-200 rounded"
              title="Bullet List"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={formatOrderedList}
              className="toolbar-btn p-2 hover:bg-gray-200 rounded"
              title="Numbered List"
            >
              <ListOrdered className="w-4 h-4" />
            </button>
          </div>

          {/* Insert */}
          <div className="toolbar-group flex gap-1 border-r border-gray-300 pr-2">
            <button
              onClick={createLink}
              className="toolbar-btn p-2 hover:bg-gray-200 rounded"
              title="Insert Link (Ctrl+K)"
            >
              <Link className="w-4 h-4" />
            </button>
            <button
              onClick={insertImage}
              className="toolbar-btn p-2 hover:bg-gray-200 rounded"
              title="Insert Image"
            >
              <Image className="w-4 h-4" />
            </button>
            <button
              onClick={insertVideo}
              className="toolbar-btn p-2 hover:bg-gray-200 rounded"
              title="Insert Video"
            >
              <Video className="w-4 h-4" />
            </button>
            <button
              onClick={insertCodeBlock}
              className="toolbar-btn p-2 hover:bg-gray-200 rounded"
              title="Insert Code Block"
            >
              <Code className="w-4 h-4" />
            </button>
            <button
              onClick={formatQuote}
              className="toolbar-btn p-2 hover:bg-gray-200 rounded"
              title="Quote"
            >
              <Quote className="w-4 h-4" />
            </button>
          </div>

          {/* Clear & Headings */}
          <div className="toolbar-group flex gap-1">
            <select
              onChange={(e) => {
                const value = e.target.value;
                if (value === 'p') formatParagraph();
                else if (value.startsWith('h')) formatHeading(parseInt(value.charAt(1)));
              }}
              className="toolbar-select px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="p">Paragraph</option>
              <option value="h1">Heading 1</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
              <option value="h4">Heading 4</option>
              <option value="h5">Heading 5</option>
              <option value="h6">Heading 6</option>
            </select>
            <button
              onClick={clearFormatting}
              className="toolbar-btn p-2 hover:bg-gray-200 rounded"
              title="Clear Formatting"
            >
              <span className="w-4 h-4 flex items-center justify-center text-xs">T×</span>
            </button>
          </div>
        </div>
      )}

      {/* Editor/Preview Toggle */}
      <div className="flex justify-between items-center bg-gray-50 border-b border-gray-300 px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPreviewMode(false)}
            className={`flex items-center gap-2 px-3 py-1 rounded text-sm font-medium transition-colors ${
              !isPreviewMode ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={() => setIsPreviewMode(true)}
            className={`flex items-center gap-2 px-3 py-1 rounded text-sm font-medium transition-colors ${
              isPreviewMode ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
        </div>
        
        {autoSave && (
          <div className="text-xs text-gray-500">
            Auto-save enabled
          </div>
        )}
      </div>

      {/* Editor/Preview Area */}
      <div 
        ref={editorRef}
        contentEditable={!isPreviewMode}
        suppressContentEditableWarning
        className="editor-content p-4 focus:outline-none"
        style={{ 
          minHeight: `${minHeight}px`,
          maxHeight: `${maxHeight}px`,
          overflow: 'auto'
        }}
        onInput={handleContentChange}
        onKeyDown={handleKeyDown}
        dangerouslySetInnerHTML={{ 
          __html: isPreviewMode ? content : '' 
        }}
      />

      {/* Link Dialog */}
      {showLinkDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Insert Link</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link Text
                </label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter link text"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowLinkDialog(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={insertLink}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Dialog */}
      {showMediaDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Insert Media</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image URL
                </label>
                <input
                  type="url"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/image.jpg"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value) {
                      const imgHtml = `<img src="${e.currentTarget.value}" alt="Inserted image" style="max-width: 100%; height: auto;" />`;
                      execCommand('insertHTML', imgHtml);
                      setShowMediaDialog(false);
                    }
                  }}
                />
              </div>
              <div className="text-sm text-gray-600">
                Or drag and drop an image file here
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowMediaDialog(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .rich-text-editor {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .toolbar-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        
        .toolbar-btn:hover {
          transform: translateY(-1px);
        }
        
        .toolbar-select {
          cursor: pointer;
        }
        
        .editor-content {
          line-height: 1.6;
          font-size: 16px;
        }
        
        .editor-content:focus {
          background-color: #fafafa;
        }
        
        .editor-content img {
          max-width: 100%;
          height: auto;
          border-radius: 4px;
          margin: 8px 0;
        }
        
        .editor-content pre {
          background-color: #f4f4f4;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 12px;
          margin: 8px 0;
          overflow-x: auto;
        }
        
        .editor-content blockquote {
          border-left: 4px solid #ddd;
          margin: 16px 0;
          padding-left: 16px;
          font-style: italic;
          color: #666;
        }
        
        .editor-content a {
          color: #3b82f6;
          text-decoration: underline;
        }
        
        .editor-content a:hover {
          color: #2563eb;
        }
      `}</style>
    </div>
  );
};
