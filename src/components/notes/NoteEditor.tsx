import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as Y from 'yjs';
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { updateNote, Note } from '../../api/notes';
import { fetchProjects, createQuickTask, searchTasks, Project, TaskSearchResult } from '../../api/projects';
import { cn } from "@/lib/utils";
import { Loader2, CheckCircle2, CheckSquare, Sparkles, Link as LinkIcon, Search } from 'lucide-react';
import { SocketIOProvider } from '@/lib/SocketIOProvider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface NoteEditorProps {
  note: Note;
  user: { uid: string; displayName?: string; email?: string };
  onUpdate: (note: Note) => void;
  className?: string;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({ note, user, onUpdate, className }) => {
  const [title, setTitle] = useState(note.title);
  const [status, setStatus] = useState<'Saved' | 'Saving...'>('Saved');

  // Smart Feature States
  const [projects, setProjects] = useState<Project[]>([]);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskLinkDialogOpen, setTaskLinkDialogOpen] = useState(false);
  const [selectedTaskText, setSelectedTaskText] = useState("");
  
  // Create Yjs Doc and Provider
  const doc = useMemo(() => new Y.Doc(), []); 

  const provider = useMemo(() => {
    return new SocketIOProvider(note._id, doc, {
      name: user.displayName || user.email || 'Anonymous',
      color: '#' + Math.floor(Math.random()*16777215).toString(16)
    });
  }, [note._id, doc, user]); 

  useEffect(() => {
    return () => {
      provider.destroy();
      doc.destroy();
    }
  }, [provider, doc]);

  // Initialize editor with collaboration
  const editor = useCreateBlockNote({
    collaboration: {
      fragment: doc.getXmlFragment("document-store"),
      user: {
        name: user.displayName || user.email || 'Anonymous',
        color: provider.awareness.getLocalState()?.user.color || '#3b82f6',
      },
      provider: provider,
    },
    initialContent: note.content && Array.isArray(note.content) && note.content.length > 0 
      ? note.content 
      : undefined,
  });

  useEffect(() => {
    setTitle(note.title);
  }, [note.title]);
  
  // Load projects for smart features
  useEffect(() => {
      if (user.uid) {
          fetchProjects(user.uid).then(setProjects).catch(e => console.error(e));
      }
  }, [user.uid]);

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

  // Debounced Save for Content
  const handleContentChange = useCallback(async () => {
    setStatus('Saving...');
    try {
      const blocks = editor.document;
      await updateNote(note._id, { content: blocks });
      setStatus('Saved');
    } catch (error) {
      console.error("Failed to save content", error);
    }
  }, [editor, note._id]);

  // Smart Feature Handlers
  const openTaskCreation = () => {
    if (!editor) return;
    
    // Get text from current selection or current block
    const selection = editor.getTextCursorPosition();
    const block = selection.block;
    let text = "";
    
    // If we have content in the block, use it. 
    // Simplified: Just use the text content of the block where cursor is.
    if (block && block.content) {
        // Block content is array of InlineContent. Join text.
        // @ts-ignore
        text = block.content.map(c => c.text || "").join("");
    }
    
    if (!text) {
        toast.error("Please put cursor on a line with text");
        return;
    }
    
    setSelectedTaskText(text);
    setTaskDialogOpen(true);
  };
  
  const handleCreateTask = async (projectId: string) => {
      try {
          const result = await createQuickTask(projectId, selectedTaskText);
          toast.success("Task created in project!");
          setTaskDialogOpen(false);
          
          // Optional: Replace text with link or add badge
          // For now, simpler to just notify.
      } catch (e) {
          toast.error("Failed to create task");
      }
  };

  const handleInsertTaskLink = async (task: TaskSearchResult) => {
      if (!editor) return;
      
      const markdownLink = `[${task.title} (Task)](/projects/${task.projectId}?task=${task.id})`;
      // Insert at cursor
      editor.insertBlocks([
          {
            content: [
                {
                    type: "text",
                    text: task.title + " ",
                    styles: { bold: true }
                },
                 {
                    type: "link",
                    href: `/projects/${task.projectId}?task=${task.id}`,
                    content: [{ type: "text", text: "🔗", styles: {} }]
                }
            ]
          }
      ], editor.getTextCursorPosition().block, "after");
      
      setTaskLinkDialogOpen(false);
  };

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
          <div className="flex items-center space-x-2 mr-4 border-r border-border pr-4">
             <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={openTaskCreation}>
                <CheckSquare size={12} />
                To Task
             </Button>
             <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => setTaskLinkDialogOpen(true)}>
                <LinkIcon size={12} />
                Link Task
             </Button>
          </div>
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
         <div className="h-20" /> 
      </div>
      
      {/* Create Task Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to Task</DialogTitle>
            <DialogDescription>
              Create a new task in Zync Project Management from this line.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-3 bg-muted/30 rounded-md text-sm italic mb-4 border border-border/50">
               "{selectedTaskText}"
            </div>
            <label className="text-sm font-medium mb-2 block">Select Project</label>
            <Command className="border rounded-md">
                <CommandInput placeholder="Search projects..." />
                <CommandList>
                    <CommandEmpty>No projects found.</CommandEmpty>
                    <CommandGroup>
                        {projects.map(p => (
                            <CommandItem key={p._id} onSelect={() => handleCreateTask(p._id)}>
                                {p.name}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </CommandList>
            </Command>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Link Task Dialog */}
      <Dialog open={taskLinkDialogOpen} onOpenChange={setTaskLinkDialogOpen}>
        <DialogContent>
           <DialogHeader>
             <DialogTitle>Link Exisiting Task</DialogTitle>
           </DialogHeader>
           <TaskSearch user={user} onSelect={handleInsertTaskLink} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

const TaskSearch = ({ user, onSelect }: { user: any, onSelect: (task: TaskSearchResult) => void }) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<TaskSearchResult[]>([]);
    
    useEffect(() => {
        if (query.length > 2) {
            const timer = setTimeout(async () => {
                const res = await searchTasks(query, user.uid);
                setResults(res);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [query, user.uid]);
    
    return (
        <Command className="border rounded-md">
            <CommandInput placeholder="Search tasks by title..." onValueChange={setQuery} />
            <CommandList>
                <CommandEmpty>No tasks found.</CommandEmpty>
                <CommandGroup heading="Tasks">
                    {results.map(task => (
                        <CommandItem key={task.id} onSelect={() => onSelect(task)}>
                            <div className="flex flex-col">
                                <span>{task.title}</span>
                                <span className="text-xs text-muted-foreground">{task.projectName} • {task.status}</span>
                            </div>
                        </CommandItem>
                    ))}
                </CommandGroup>
            </CommandList>
        </Command>
    )
}
