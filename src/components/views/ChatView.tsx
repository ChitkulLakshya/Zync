/**
 * @fileoverview ChatView.tsx
 * @module ChatView
 *
 * ============================================================================
 * ZYNC ENTERPRISE ARCHITECTURE DOCUMENTATION
 * ============================================================================
 *
 * 1. ARCHITECTURAL CONTEXT
 * ----------------------------------------------------------------------------
 * This module is a critical component of the Zync platform's Client-Side Presentation & Logic Layer.
 * It is designed to operate within a highly scalable, distributed micro-services
 * or monolithic-hybrid architecture. The logic contained within this file has 
 * been strictly organized to adhere to SOLID principles, ensuring maintainability,
 * scalability, and ease of testing.
 *
 * 2. SECURITY CONSIDERATIONS
 * ----------------------------------------------------------------------------
 * - Data Sanitization: All inputs processed by this module must be sanitized
 *   to prevent Cross-Site Scripting (XSS) and SQL/NoSQL Injection attacks.
 * - Authentication: If this module handles sensitive user data, it assumes
 *   that the calling context has already verified the user's JWT or session token.
 * - Rate Limiting: High-frequency operations triggered by this file should be
 *   subject to API rate limiting to prevent Denial of Service (DoS) attacks.
 * - PII Handling: Personally Identifiable Information (PII) must never be
 *   logged in plaintext by this module.
 *
 * 3. PERFORMANCE & OPTIMIZATION
 * ----------------------------------------------------------------------------
 * - Time Complexity: Operations within this file are optimized for O(1) or O(n)
 *   where possible. Nested iterations should be strictly reviewed.
 * - Memory Management: Variables and closures should be properly scoped to 
 *   prevent memory leaks, especially in long-running Node.js processes or
 *   React component lifecycles.
 * - Caching: Redundant data fetching or heavy computations should leverage
 *   Redis (backend) or React Query / local state (frontend) caching mechanisms.
 *
 * 4. TESTING GUIDELINES
 * ----------------------------------------------------------------------------
 * - Unit Tests: Every exported function or component in this file must have 
 *   accompanying unit tests covering at least 90% of the code paths.
 * - Mocking: External dependencies (APIs, databases, third-party libraries)
 *   must be mocked using Jest to ensure deterministic test results.
 * - Integration: This module should be tested in conjunction with its immediate
 *   dependencies to verify data flow integrity.
 *
 * 5. ERROR HANDLING STRATEGY
 * ----------------------------------------------------------------------------
 * - Graceful Degradation: If a non-critical subsystem fails, this module should
 *   catch the error and fallback to a safe default state rather than crashing.
 * - Logging: All unhandled exceptions must be logged to the central monitoring
 *   system (e.g., Sentry, Datadog) with full stack traces and context.
 * - User Feedback: Frontend components must provide clear, localized error
 *   messages to the user without exposing sensitive technical details.
 *
 * 6. STATE MANAGEMENT (FRONTEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - If this is a React component, avoid prop drilling by leveraging Context API
 *   or global state stores (Zustand/Redux) for deeply nested state.
 * - Side effects (useEffect) must carefully manage their dependency arrays to
 *   prevent infinite render loops.
 *
 * 7. DATABASE INTERACTIONS (BACKEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - Queries must be indexed and optimized. Avoid N+1 query problems by using
 *   Prisma's include/select capabilities effectively.
 * - Database transactions should be used for all multi-step write operations
 *   to ensure ACID compliance and data consistency.
 *
 * ============================================================================
 * @author Chitkul Lakshya <consolemaster.app@gmail.com>
 * @copyright Copyright (c) 2026 Zync Meet. All rights reserved.
 * @license Proprietary and Confidential
 * ============================================================================
 */
import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  sendMessage as socketSendMessage,
  markSeen,
  clearChat as socketClearChat,
} from '@/services/chatSocketService';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import {
  Send,
  Check,
  CheckCheck,
  Paperclip,
  Smile,
  X,
  File as FileIcon,
  Image as ImageIcon,
  Trash2,
  FolderKanban,
  Plus,
  Star,
} from 'lucide-react';
import { format } from 'date-fns';
import EmojiPicker from 'emoji-picker-react';
import { API_BASE_URL, getFullUrl, getUserName, getUserInitials, cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useChatHistory } from '@/hooks/useChatHistory';

interface ChatViewProps {
  selectedUser: any;
  onBack?: () => void;
  currentUserData?: any;
  isQuickChat?: boolean;
  onOpenFullChat?: () => void;
}

const ChatView = ({ selectedUser, onBack, currentUserData, isQuickChat, onOpenFullChat }: ChatViewProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentUser = auth.currentUser;

  const chatId =
    currentUser && selectedUser ? [currentUser.uid, selectedUser.uid].sort().join('_') : null;

  const { data: messages = [] } = useChatHistory(chatId);

  const [newMessage, setNewMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    if (messages.length > 0 && currentUser) {
      const unseenIds = messages
        .filter((m) => m.receiverId === currentUser.uid && !m.seen)
        .map((m) => m.id);

      if (unseenIds.length > 0) {

        const senderIds = [
          ...new Set(messages.filter((m) => unseenIds.includes(m.id)).map((m) => m.senderId)),
        ];
        senderIds.forEach((sid) => {
          const idsForSender = messages
            .filter((m) => unseenIds.includes(m.id) && m.senderId === sid)
            .map((m) => m.id);
          markSeen(idsForSender, sid);
        });
      }
    }
  }, [messages.length, currentUser]);

  const prevMessagesLengthRef = useRef(messages.length);
  const isNearBottomRef = useRef(true);

  useEffect(() => {
    const isNewMessage = messages.length > prevMessagesLengthRef.current;

    const lastMessage = messages[messages.length - 1];
    const isMyMessage = lastMessage?.senderId === currentUser?.uid;

    if (isNewMessage) {
      if (isMyMessage || isNearBottomRef.current) {
        if (containerRef.current) {
          containerRef.current.scrollTo({
            top: containerRef.current.scrollHeight,
            behavior: 'smooth',
          });
        }
      }
    }

    prevMessagesLengthRef.current = messages.length;
  }, [messages, currentUser]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;

    const isNear = scrollHeight - scrollTop - clientHeight < 100;
    isNearBottomRef.current = isNear;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleEmojiClick = (emojiObject: any) => {
    setNewMessage((prev) => prev + emojiObject.emoji);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !file) || !currentUser || isUploading) {
      return;
    }

    setIsUploading(true);
    let fileUrl = null;
    let messageType = 'text';
    let originalName = null;
    let fileSize = null;

    if (file) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch(`${API_BASE_URL}/api/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const data = await response.json();
        fileUrl = data.fileUrl;
        originalName = data.originalname;
        fileSize = data.size;

        if (file.type.startsWith('image/')) {
          messageType = 'image';
        } else {
          messageType = 'file';
        }
      } catch (error) {
        console.error('Upload error', error);
        setIsUploading(false);
        return;
      }
    }

    const chatId = [currentUser.uid, selectedUser.uid].sort().join('_');

    socketSendMessage({
      chatId,
      text: newMessage,
      receiverId: selectedUser.uid,
      senderName: currentUser.displayName || 'Unknown User',
      senderPhotoURL: currentUser.photoURL || undefined,
      type: messageType,
      fileUrl: fileUrl || undefined,
      fileName: originalName || undefined,
      fileSize: fileSize ? parseInt(String(fileSize), 10) : undefined,
    });

    setNewMessage('');
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setIsUploading(false);
  };

  const handleClearChat = async () => {
    if (!currentUser || !selectedUser) {
      return;
    }

    if (confirm('Are you sure you want to clear this chat history? This cannot be undone.')) {
      try {
        const chatId = [currentUser.uid, selectedUser.uid].sort().join('_');
        socketClearChat(chatId, selectedUser.uid);
        toast({ title: 'Success', description: 'Chat history cleared.' });
      } catch (error) {
        console.error('Error clearing chat:', error);
        alert('Failed to clear chat');
      }
    }
  };

  const [isCloseFriend, setIsCloseFriend] = useState(false);

  useEffect(() => {
    if (currentUserData && currentUserData.closeFriends && selectedUser) {
      setIsCloseFriend(currentUserData.closeFriends.includes(selectedUser.uid));
    }
  }, [currentUserData, selectedUser]);

  const handleToggleCloseFriend = async () => {
    try {
      const token = await currentUser?.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/users/close-friends/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ friendId: selectedUser.uid }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsCloseFriend(data.isCloseFriend);
        toast({ title: 'Success', description: data.message });
      } else {
        throw new Error('Failed to update close friend status');
      }
    } catch (error) {
      console.error('Error toggling close friend:', error);
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    }
  };

  return (
    <div className={cn("flex flex-col h-full relative", isQuickChat ? "bg-transparent" : "bg-background/50 backdrop-blur-xl")}>
      {}
      {!isQuickChat && (
        <div className="flex items-center gap-3 p-4 border-b border-border/10 bg-transparent z-10">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="mr-2">
              ← Back
            </Button>
          )}
          <Dialog>
            <DialogTrigger asChild>
              <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                <div className="relative">
                  <Avatar>
                    <AvatarImage
                      src={getFullUrl(selectedUser.photoURL)}
                      referrerPolicy="no-referrer"
                    />
                    <AvatarFallback>{getUserInitials(selectedUser)}</AvatarFallback>
                  </Avatar>
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${
                      selectedUser.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  />
                </div>
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    {getUserName(selectedUser)}
                    {isCloseFriend && (
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-500" strokeWidth={0} />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {selectedUser.status}
                  </div>
                </div>
              </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>User Profile</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center justify-center p-6 space-y-4">
                <Avatar className="w-32 h-32 ring-4 ring-background shadow-elevation4">
                  <AvatarImage src={getFullUrl(selectedUser.photoURL)} />
                  <AvatarFallback className="text-4xl">
                    {getUserInitials(selectedUser)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <h2 className="text-2xl font-bold">{getUserName(selectedUser)}</h2>
                  <p className="text-muted-foreground">{selectedUser.email}</p>
                </div>
                <Button
                  onClick={handleToggleCloseFriend}
                  variant={isCloseFriend ? 'secondary' : 'default'}
                  className="gap-2 w-full max-w-xs"
                >
                  <Star className={`w-4 h-4 ${isCloseFriend ? 'fill-current' : ''}`} />
                  {isCloseFriend ? 'Remove from Close Friends' : 'Add to Close Friends'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <div className="ml-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClearChat}
              className="text-muted-foreground hover:text-destructive"
              title="Clear Chat"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {}
      <div
        className="flex-1 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-secondary"
        onScroll={handleScroll}
        ref={containerRef}
      >
        <div className="space-y-4 pb-4">
          {isQuickChat && (
            <div className="flex flex-col items-center pt-6 pb-2 px-4 space-y-4 border-b border-white/[0.04] mb-4">
              <div className="relative">
                <Avatar className="w-20 h-20 border border-white/[0.06] shadow-md">
                  <AvatarImage
                    src={getFullUrl(selectedUser.photoURL)}
                    referrerPolicy="no-referrer"
                  />
                  <AvatarFallback className="text-2xl">{getUserInitials(selectedUser)}</AvatarFallback>
                </Avatar>
                <span className={`absolute bottom-0 right-1 w-3.5 h-3.5 rounded-full border-2 border-[#121212] ${
                  selectedUser.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                }`} />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground leading-tight">{getUserName(selectedUser)}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  @{selectedUser.username || selectedUser.displayName?.toLowerCase().replace(/\s+/g, '') || 'username'}
                </p>
              </div>
              <p className="text-xs text-muted-foreground/80 text-center max-w-[240px] leading-relaxed">
                {selectedUser.bio || 'Visual Design, Product Design, Research. Typography & colors lover.'}
              </p>
              <div className="flex items-center gap-1.5 justify-center">
                {(selectedUser.tags || ['UX/UI designer', 'Dribbbler']).map((tag: string) => (
                  <span key={tag} className="text-[10px] font-medium px-3 py-1 rounded-full border border-white/[0.06] text-muted-foreground/90 bg-white/[0.02]">
                    {tag}
                  </span>
                ))}
              </div>
              
              <div className="w-full flex items-center justify-center pt-3 relative">
                <div className="absolute inset-x-0 h-px bg-white/[0.06] top-1/2 -translate-y-1/2" />
                <button
                  onClick={() => {
                    if (onOpenFullChat) onOpenFullChat();
                  }}
                  className="relative z-10 px-4 py-1 text-[11px] font-medium text-muted-foreground bg-[#121212] border border-white/[0.06] rounded-full hover:text-foreground hover:bg-[#181818] transition-all"
                >
                  Open Full Chat
                </button>
              </div>
            </div>
          )}

          {messages.map((msg) => {
            const isMe = msg.senderId === currentUser?.uid;
            const isImage = msg.type === 'image';
            const isFile = msg.type === 'file';
            const isProjectInvite = msg.type === 'project-invite';

            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                    isMe
                      ? 'bg-foreground text-background'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  {isProjectInvite && (
                    <div
                      className={`mb-2 p-3 rounded-2xl border flex flex-col gap-2 ${isMe ? 'bg-background/10 border-background/20 backdrop-blur-md' : 'bg-card/50 backdrop-blur-md border-border/10'}`}
                    >
                      <div className="flex items-center gap-2">
                        <FolderKanban className="w-5 h-5 opacity-70" />
                        <div>
                          <p className="text-sm font-semibold">
                            {msg.projectName || 'Project Invite'}
                          </p>
                          <p className="text-[10px] opacity-70">Collaborate on this project</p>
                        </div>
                      </div>
                      {!isMe && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full h-8 gap-2 text-xs"
                          onClick={async () => {
                            try {
                              const token = await auth.currentUser?.getIdToken();
                              const res = await fetch(
                                `${API_BASE_URL}/api/projects/${msg.projectId}/team`,
                                {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                  },
                                  body: JSON.stringify({ userId: currentUser?.uid }),
                                }
                              );
                              if (res.ok) {
                                queryClient.invalidateQueries({ queryKey: ['projects'] });
                                toast({
                                  title: 'Joined Project',
                                  description: `You have been added to ${msg.projectName}`,
                                });
                              } else {
                                toast({
                                  title: 'Error',
                                  description: 'Failed to join project',
                                  variant: 'destructive',
                                });
                              }
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                        >
                          <Plus className="w-3 h-3" /> Add to Workspace
                        </Button>
                      )}
                    </div>
                  )}

                  {isImage && (
                    <div className="mb-2 rounded-lg overflow-hidden max-w-sm">
                      <img
                        src={getFullUrl(msg.fileUrl)}
                        alt="Attached image"
                        className="w-full h-auto object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {isFile && (
                    <div className="mb-2">
                      <a
                        href={getFullUrl(msg.fileUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-2 p-2 rounded-md ${
                          isMe
                            ? 'bg-background/10 hover:bg-background/20'
                            : 'bg-background/50 hover:bg-background/80'
                        } transition-colors`}
                      >
                        <FileIcon className="w-4 h-4" />
                        <span className="text-sm underline break-all">
                          {msg.fileName || 'Download File'}
                        </span>
                      </a>
                    </div>
                  )}

                  {msg.text && (
                    <p className="text-sm break-words whitespace-pre-wrap">{msg.text}</p>
                  )}

                  <div
                    className={`text-[10px] mt-1 flex items-center gap-1 ${
                      isMe ? 'text-background/70' : 'text-muted-foreground'
                    }`}
                  >
                    {msg.createdAt ? format(new Date(msg.createdAt), 'hh:mm a') : 'Sending...'}
                    {isMe && (
                      <span>
                        {msg.seen ? (
                          <div className="flex items-center gap-1" title="Seen">
                            <CheckCheck className="w-3 h-3 text-blue-300" />
                          </div>
                        ) : msg.delivered ? (
                          <div className="flex items-center gap-1" title="Delivered">
                            <CheckCheck className="w-3 h-3" />
                          </div>
                        ) : (
                          <div className="flex items-center gap-1" title="Sent">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {}
      <div className="p-4 border-t border-border/10 bg-transparent">
        {}
        {file && (
          <div className="mb-2 p-2 bg-secondary/30 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              {file.type.startsWith('image/') ? (
                <ImageIcon className="w-4 h-4 text-purple-500" />
              ) : (
                <FileIcon className="w-4 h-4 text-blue-500" />
              )}
              <span className="text-sm truncate max-w-[200px]">{file.name}</span>
              <span className="text-xs text-muted-foreground">
                ({(file.size / 1024).toFixed(1)} KB)
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                setFile(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="mb-0.5"
            title="Attach file"
          >
            <Paperclip className="w-4 h-4 text-muted-foreground" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mb-0.5"
                title="Add emoji"
              >
                <Smile className="w-4 h-4 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0 border-none" align="start">
              <EmojiPicker onEmojiClick={handleEmojiClick} />
            </PopoverContent>
          </Popover>

          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
            disabled={isUploading}
          />
          <Button type="submit" size="icon" disabled={(!newMessage.trim() && !file) || isUploading}>
            <Send className={`w-4 h-4 ${isUploading ? 'opacity-50' : ''}`} />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatView;
