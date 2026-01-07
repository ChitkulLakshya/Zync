import React, { useState, useEffect, useCallback } from 'react';
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { updateNote, Note } from '../../api/notes';
import { cn } from "@/lib/utils";
import { Loader2, CheckCircle2 } from 'lucide-react';

interface NoteEditorProps {
  note: Note;
  onUpdate: (note: Note) => void;
  className?: string;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({ note, onUpdate, className }) => {
  const [title, setTitle] = useState(note.title);
  const [status, setStatus] = useState<'Saved' | 'Saving...'>('Saved');

  // Initialize editor
  const editor = useCreateBlockNote({
    // Check if content is valid, otherwise undefined for empty doc
    initialContent: note.content && Array.isArray(note.content) && note.content.length > 0 
      ? note.content 
      : undefined,
  });

  // Handle title updates with debounce
  useEffect(() => {
    setTitle(note.title);
  }, [note.title]);

  const handleTitleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    setStatus('Saving...');
    try {
      await updateNote(note._id, { title: newTitle });
      setStatus('Saved');
      onUpdate({ ...note, title: newTitle });
    } catch (error) {
      console.error("Failed to save title", error);
    }
  };

  // Handle editor changes
  const handleContentChange = useCallback(async () => {
    setStatus('Saving...');
    try {
      // Create a snapshot of the blocks
      const blocks = editor.document;
      await updateNote(note._id, { content: blocks });
      setStatus('Saved');
    } catch (error) {
      console.error("Failed to save content", error);
    }
  }, [editor, note._id]);

  if (!editor) {
    return <div className="flex h-full items-center justify-center text-muted-foreground"><Loader2 className="animate-spin mr-2" /> Loading editor...</div>;
  }

  return (
    <div className={cn("flex flex-col h-full bg-background relative", className)}>
      <div className="px-12 py-8 border-b border-border/40 flex justify-between items-start bg-background/50 backdrop-blur-sm sticky top-0 z-10">
         <div className="flex-1 mr-4">
           <input 
             value={title}
             onChange={handleTitleChange}
             placeholder="Untitled"
             className="text-4xl font-bold font-sans outline-none bg-transparent w-full text-foreground placeholder:text-muted-foreground/30 leading-tight"
           />
         </div>
        <div className="flex items-center text-xs text-muted-foreground font-medium min-w-[80px] justify-end animate-in fade-in duration-300">
          {status === 'Saving...' ? (
             <><Loader2 size={12} className="animate-spin mr-1.5" /> Saving</>
          ) : (
             <><CheckCircle2 size={12} className="text-emerald-500 mr-1.5" /> Saved</>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
         <div className="max-w-4xl mx-auto py-8 pl-4 pr-12 min-h-[500px]">
           <BlockNoteView editor={editor} onChange={handleContentChange} theme="light" className="zync-editor-overrides" />
         </div>
         {/* Footer spacing */}
         <div className="h-20" /> 
      </div>
    </div>
  );
};
