'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StickyNote, Check } from 'lucide-react';

interface ProfileNotesProps {
  profileId: string;
  initialContent: string;
}

export function ProfileNotes({ profileId, initialContent }: ProfileNotesProps) {
  const [noteContent, setNoteContent] = useState(initialContent);
  const [originalNoteContent, setOriginalNoteContent] = useState(initialContent);
  const [savingNote, setSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync if initial content changes (e.g. after refetch)
  useEffect(() => {
    setNoteContent(initialContent);
    setOriginalNoteContent(initialContent);
  }, [initialContent]);

  const saveNote = useCallback(async (content: string) => {
    setSavingNote(true);
    try {
      await fetch(`/api/profiles/${profileId}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      setOriginalNoteContent(content);
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2000);
    } finally {
      setSavingNote(false);
    }
  }, [profileId]);

  const handleNoteChange = (value: string) => {
    setNoteContent(value);
    setNoteSaved(false);

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save (1.5 seconds after typing stops)
    if (value !== originalNoteContent) {
      saveTimeoutRef.current = setTimeout(() => {
        saveNote(value);
      }, 1500);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <StickyNote className="w-5 h-5 text-teal-600" />
          My Notes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <textarea
          value={noteContent}
          onChange={(e) => handleNoteChange(e.target.value)}
          placeholder="Add private notes about this person..."
          className="w-full h-32 p-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-400">
            Private &middot; Auto-saved
          </p>
          {(savingNote || noteSaved || noteContent !== originalNoteContent) && (
            <span className="text-xs text-gray-400">
              {savingNote ? (
                'Saving...'
              ) : noteSaved ? (
                <span className="text-teal-600 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Saved
                </span>
              ) : (
                'Unsaved'
              )}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
