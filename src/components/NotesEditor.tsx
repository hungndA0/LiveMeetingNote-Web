import React, { useEffect, useRef, useState } from 'react';
import { Input } from 'antd';

const { TextArea } = Input;

interface Props {
  isRecording: boolean;
  notes: string;
  onNotesChange: (notes: string) => void;
  timestampMap: Map<number, number>;
  onTimestampMapChange: (map: Map<number, number>) => void;
}

export const NotesEditor: React.FC<Props> = ({
  isRecording,
  notes,
  onNotesChange,
  timestampMap,
  onTimestampMapChange
}) => {
  const recordingStartTime = useRef<number>(0);
  const [showTimestamps, setShowTimestamps] = useState(true);
  const TIME_OFFSET_MS = 2000;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isRecording) {
      recordingStartTime.current = Date.now();
    }
  }, [isRecording]);

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleLineChange = (index: number, value: string) => {
    const lines = notes.split('\n');
    lines[index] = value;
    
    // Auto-create timestamp if this is first character on this line
    if (isRecording && value.trim().length > 0) {
      const lineStartPos = lines.slice(0, index).join('\n').length + (index > 0 ? 1 : 0);
      
      if (!timestampMap.has(lineStartPos)) {
        const currentDuration = Date.now() - recordingStartTime.current;
        const adjustedDuration = Math.max(0, currentDuration - TIME_OFFSET_MS);
        
        const newMap = new Map(timestampMap);
        newMap.set(lineStartPos, adjustedDuration);
        onTimestampMapChange(newMap);
      }
    }
    
    onNotesChange(lines.join('\n'));
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const lines = notes.split('\n');
    const currentLine = lines[index];
    const target = e.target as HTMLTextAreaElement;
    const cursorPos = target.selectionStart;

    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Split current line at cursor
      const beforeCursor = currentLine.substring(0, cursorPos);
      const afterCursor = currentLine.substring(cursorPos);
      
      lines[index] = beforeCursor;
      lines.splice(index + 1, 0, afterCursor);
      
      onNotesChange(lines.join('\n'));
      
      // Focus next line after React re-renders
      setTimeout(() => {
        const nextInput = containerRef.current?.querySelectorAll('textarea')[index + 1] as HTMLTextAreaElement;
        if (nextInput) {
          nextInput.focus();
          nextInput.setSelectionRange(0, 0);
        }
      }, 10);
    } else if (e.key === 'Backspace' && cursorPos === 0 && index > 0) {
      // Merge with previous line
      e.preventDefault();
      const prevLine = lines[index - 1];
      const prevLength = prevLine.length;
      
      lines[index - 1] = prevLine + currentLine;
      lines.splice(index, 1);
      
      // Remove timestamp for this line
      const lineStartPos = notes.split('\n').slice(0, index).join('\n').length + (index > 0 ? 1 : 0);
      if (timestampMap.has(lineStartPos)) {
        const newMap = new Map(timestampMap);
        newMap.delete(lineStartPos);
        onTimestampMapChange(newMap);
      }
      
      onNotesChange(lines.join('\n'));
      
      // Focus previous line
      setTimeout(() => {
        const prevInput = containerRef.current?.querySelectorAll('textarea')[index - 1] as HTMLTextAreaElement;
        if (prevInput) {
          prevInput.focus();
          prevInput.setSelectionRange(prevLength, prevLength);
        }
      }, 10);
    }
  };

  const handleDoubleClick = (lineStartPos: number) => {
    const timeMs = timestampMap.get(lineStartPos);
    if (timeMs !== undefined) {
      window.dispatchEvent(
        new CustomEvent('seek-audio', {
          detail: { time: timeMs / 1000 }
        })
      );
    }
  };

  const lines = notes.split('\n');
  if (lines.length === 0 || (lines.length === 1 && lines[0] === '')) {
    lines[0] = '';
  }

  return (
    <div className="notes-editor-container">
      <div className="editor-header">
        <h3>📝 Notes Editor</h3>
        <div className="editor-controls">
          {isRecording && (
            <span className="recording-hint">
              💡 Type to auto-create timestamp • Enter for new line
            </span>
          )}
          <button
            className="toggle-timestamps-btn"
            onClick={() => setShowTimestamps(!showTimestamps)}
            title={showTimestamps ? 'Hide timestamps' : 'Show timestamps'}
          >
            {showTimestamps ? '👁️ Hide Timestamps' : '👁️‍🗨️ Show Timestamps'}
          </button>
        </div>
      </div>
      
      <div 
        ref={containerRef}
        style={{ 
          border: '1px solid #434343',
          borderRadius: '6px',
          backgroundColor: '#1e1e1e',
          maxHeight: '500px',
          overflowY: 'auto'
        }}
      >
        {lines.map((line, index) => {
          const lineStartPos = notes.split('\n').slice(0, index).join('\n').length + (index > 0 ? 1 : 0);
          const timeMs = timestampMap.get(lineStartPos);

          return (
            <div
              key={index}
              style={{
                display: 'flex',
                borderBottom: index < lines.length - 1 ? '1px solid #2d2d2d' : 'none'
              }}
            >
              {/* Timestamp Column */}
              <div
                onClick={() => handleDoubleClick(lineStartPos)}
                style={{
                  width: '100px',
                  backgroundColor: '#252526',
                  borderRight: '1px solid #434343',
                  padding: '8px',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  color: timeMs !== undefined ? '#1890ff' : 'transparent',
                  textAlign: 'right',
                  cursor: timeMs !== undefined ? 'pointer' : 'default',
                  userSelect: 'none',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'flex-start',
                  paddingTop: '8px'
                }}
              >
                {timeMs !== undefined && showTimestamps ? formatTime(timeMs) : '\u00A0'}
              </div>

              {/* Text Input */}
              <TextArea
                value={line}
                onChange={(e) => handleLineChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                placeholder={index === 0 ? "Start typing..." : ""}
                autoSize={{ minRows: 1, maxRows: 10 }}
                style={{
                  flex: 1,
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  border: 'none',
                  backgroundColor: 'transparent',
                  resize: 'none',
                  padding: '8px'
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
