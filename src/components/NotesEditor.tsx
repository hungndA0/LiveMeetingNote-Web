import React, { useEffect, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

interface Props {
  isRecording: boolean;
  notes: string;
  onNotesChange: (notes: string) => void;
  timestampMap: Map<number, number>;
  onTimestampMapChange: (map: Map<number, number>) => void;
  onNotesHtmlChange?: (html: string) => void;
}

export const NotesEditor: React.FC<Props> = ({
  isRecording,
  onNotesChange,
  timestampMap,
  onTimestampMapChange,
  onNotesHtmlChange
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const recordingStartTime = useRef<number>(0);
  const [showTimestamps, setShowTimestamps] = React.useState(true);
  const lastTextLength = useRef<number>(0);
  const TIME_OFFSET_MS = 2000; // Bù 2 giây cho thời gian nghe và gõ

  useEffect(() => {
    if (editorRef.current && !quillRef.current) {
      quillRef.current = new Quill(editorRef.current, {
        theme: 'snow',
        modules: {
          toolbar: [
            ['bold', 'italic', 'underline'],
            ['link'],
            [{ color: [] }, { background: [] }],
            ['clean']
          ]
        },
        placeholder: 'Start typing your notes here...\nPress ENTER during recording to insert timestamp'
      });

      // Listen to text changes
      quillRef.current.on('text-change', (_delta: any, _oldDelta: any, source: string) => {
        const currentText = quillRef.current!.getText();
        onNotesChange(currentText);
        
        // Also get HTML content if callback is provided
        if (onNotesHtmlChange && quillRef.current) {
          const container = quillRef.current.root as HTMLElement;
          onNotesHtmlChange(container.innerHTML);
        }
        
        // Auto-insert timestamp when starting new line during recording
        if (isRecording && source === 'user') {
          handleTextChange(_delta);
        }
      });

      // Double-click to seek
      editorRef.current.addEventListener('dblclick', handleDoubleClick);
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.removeEventListener('dblclick', handleDoubleClick);
      }
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      recordingStartTime.current = Date.now();
    }
  }, [isRecording]);

  useEffect(() => {
    if (isRecording) {
      recordingStartTime.current = Date.now();
      lastTextLength.current = quillRef.current?.getText().length || 0;
    }
  }, [isRecording]);

  // Detect Enter key and insert timestamp immediately
  useEffect(() => {
    if (!isRecording || !quillRef.current) return;

    const quill = quillRef.current;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        // Get current cursor position BEFORE Enter is processed
        const selection = quill.getSelection();
        if (selection) {
          // Use setTimeout to let Enter create the new line first
          setTimeout(() => {
            const newLinePos = selection.index + 1;
            insertTimestampAtPosition(newLinePos);
          }, 10);
        }
      }
    };

    const editorElement = quill.root;
    editorElement.addEventListener('keydown', handleKeyDown);
    return () => editorElement.removeEventListener('keydown', handleKeyDown);
  }, [isRecording]);

  const handleTextChange = (_delta: any) => {
    // This is now mainly for updating HTML content
    if (!quillRef.current) return;
    lastTextLength.current = quillRef.current.getText().length;
  };

  const insertTimestampAtPosition = (position: number) => {
    if (!quillRef.current) return;

    const currentDuration = Date.now() - recordingStartTime.current;
    // Subtract offset to account for listening and typing time
    const adjustedDuration = Math.max(0, currentDuration - TIME_OFFSET_MS);
    const timeStr = formatTime(adjustedDuration);

    // Insert timestamp at the beginning of the line (always blue, visibility controlled by CSS)
    quillRef.current.insertText(position, `[${timeStr}] `, {
      color: '#4096ff',
      bold: true
    });

    // Store timestamp mapping
    const newMap = new Map(timestampMap);
    newMap.set(position, adjustedDuration);
    onTimestampMapChange(newMap);
  };

  const handleDoubleClick = (_e: MouseEvent) => {
    if (!quillRef.current) return;

    const selection = quillRef.current.getSelection();
    if (!selection) return;

    const timestamp = findNearestTimestamp(selection.index);
    if (timestamp !== null) {
      // Dispatch event to AudioPlayer component
      window.dispatchEvent(
        new CustomEvent('seek-audio', {
          detail: { time: timestamp / 1000 }
        })
      );
    }
  };

  const findNearestTimestamp = (index: number): number | null => {
    let nearest: number | null = null;
    let minDist = Infinity;

    timestampMap.forEach((time, pos) => {
      const dist = Math.abs(pos - index);
      if (dist < minDist && dist < 20) {
        minDist = dist;
        nearest = time;
      }
    });

    return nearest;
  };

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Update timestamp visibility when toggle changes
  React.useEffect(() => {
    if (!editorRef.current) return;
    
    const editorElement = editorRef.current.querySelector('.ql-editor');
    if (!editorElement) return;
    
    if (showTimestamps) {
      editorElement.classList.remove('hide-timestamps');
    } else {
      editorElement.classList.add('hide-timestamps');
    }
  }, [showTimestamps]);

  return (
    <div className="notes-editor-container">
      <div className="editor-header">
        <h3>📝 Notes Editor</h3>
        <div className="editor-controls">
          {isRecording && (
            <span className="recording-hint">
              💡 Start typing on new line to insert timestamp
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
      <div ref={editorRef} className="editor" />
    </div>
  );
};
