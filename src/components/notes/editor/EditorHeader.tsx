import React from 'react';
import { Note } from '../../../services/notesService';
import { CollaboratorAvatars } from '../CollaboratorAvatars';
import { cn } from '@/lib/utils';
import { CheckCircle2, Calendar, Clock, User as UserIcon } from 'lucide-react';

interface EditorHeaderProps {
  note: Note;
  user: { uid: string; displayName?: string; email?: string };
  title: string;
  status: 'Saved' | 'Saving...';
  isEditable: boolean;
  activeUsers: any[];
  onTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  note,
  user,
  title,
  status,
  isEditable,
  activeUsers,
  onTitleChange,
}) => {
  return (
    <>
      <div className="flex items-center gap-3 mb-8 min-h-[28px]">
        <CollaboratorAvatars activeUsers={activeUsers} maxVisible={5} size="md" />

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
          {status === 'Saving...' ? (
            <>
              <Clock size={11} className="opacity-50" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={11} className="text-emerald-500" />
              <span className="text-emerald-500">Saved</span>
            </>
          )}
          {!isEditable && (
            <span className="ml-2 px-2 py-0.5 bg-secondary/20 text-foreground rounded text-[10px] uppercase font-bold tracking-wider border border-border/10">
              Read Only
            </span>
          )}
        </div>
      </div>

      {}
      <input
        id="note-title"
        name="title"
        value={title || ''}
        onChange={onTitleChange}
        placeholder="Untitled"
        disabled={!isEditable}
        className={cn(
          'text-4xl font-bold outline-none bg-transparent w-full text-foreground placeholder:text-muted-foreground/40 mb-4 tracking-tight leading-tight',
          !isEditable && 'cursor-default opacity-80'
        )}
      />

      {/* Metadata Row */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-8 pb-6 border-b border-border/10">
        <div className="flex items-center gap-1.5">
          <UserIcon size={11} />
          <span>{user.displayName || 'You'}</span>
        </div>
        <span className="text-zinc-700">·</span>
        <div className="flex items-center gap-1.5">
          <Calendar size={11} />
          <span>
            {note.createdAt
              ? (() => {
                  const date = new Date(note.createdAt);
                  return isNaN(date.getTime()) ? 'Just now' : date.toLocaleDateString();
                })()
              : 'Just now'}
          </span>
        </div>
      </div>
    </>
  );
};
