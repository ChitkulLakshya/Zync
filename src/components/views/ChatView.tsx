import { useState, useEffect, useRef } from "react";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  updateDoc, 
  doc,
  getDocs
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Send, 
  Check, 
  CheckCheck, 
  Paperclip, 
  Smile, 
  X, 
  File as FileIcon, 
  Image as ImageIcon 
} from "lucide-react";
import { format } from "date-fns";
import EmojiPicker from 'emoji-picker-react';
import { API_BASE_URL } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ChatViewProps {
  selectedUser: any;
  onBack?: () => void;
}

const ChatView = ({ selectedUser, onBack }: ChatViewProps) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser || !selectedUser) return;

    // Refactored to use a single top-level collection with chatId field
    // This requires a composite index on 'chatId' and 'timestamp'
    const chatId = [currentUser.uid, selectedUser.uid].sort().join("_");
    const messagesRef = collection(db, "messages");
    const q = query(messagesRef, where("chatId", "==", chatId), orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
      
      // Mark unseen messages as seen
      msgs.forEach(async (msg: any) => {
        if (msg.receiverId === currentUser.uid && !msg.seen) {
          const msgRef = doc(db, "messages", msg.id);
          await updateDoc(msgRef, {
            seen: true,
            seenAt: serverTimestamp()
          });
        }
      });
    });

    return () => unsubscribe();
  }, [currentUser, selectedUser]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, file]);

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
    if ((!newMessage.trim() && !file) || !currentUser || isUploading) return;

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
          body: formData
        });

        if (!response.ok) {
           throw new Error('Upload failed');
        }

        const data = await response.json();
        fileUrl = data.fileUrl; // Relative path
        originalName = data.originalname;
        fileSize = data.size;
        
        if (file.type.startsWith('image/')) {
          messageType = 'image';
        } else {
          messageType = 'file';
        }
      } catch (error) {
        console.error("Upload error", error);
        setIsUploading(false);
        return; 
      }
    }

    const chatId = [currentUser.uid, selectedUser.uid].sort().join("_");
    const messagesRef = collection(db, "messages");

    await addDoc(messagesRef, {
      chatId,
      text: newMessage,
      senderId: currentUser.uid,
      receiverId: selectedUser.uid,
      timestamp: serverTimestamp(),
      seen: false,
      seenAt: null,
      delivered: false,
      deliveredAt: null,
      type: messageType,
      fileUrl: fileUrl, 
      fileName: originalName,
      fileSize: fileSize
    });

    setNewMessage("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsUploading(false);
  };

  // Helper to get full URL
  const getFullUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${API_BASE_URL}${path}`;
  };

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Chat Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/50 bg-background/95 backdrop-blur z-10">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack} className="mr-2">
            ← Back
          </Button>
        )}
        <div className="relative">
          <Avatar>
            <AvatarImage src={selectedUser.photoURL} />
            <AvatarFallback>{selectedUser.displayName?.substring(0, 2).toUpperCase() || "U"}</AvatarFallback>
          </Avatar>
          <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${
            selectedUser.status === "online" ? "bg-green-500" : "bg-gray-400"
          }`} />
        </div>
        <div>
          <div className="font-semibold">{selectedUser.displayName || selectedUser.name}</div>
          <div className="text-xs text-muted-foreground capitalize">{selectedUser.status}</div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 pb-4">
          {messages.map((msg) => {
            const isMe = msg.senderId === currentUser?.uid;
            const isImage = msg.type === 'image';
            const isFile = msg.type === 'file';
            
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                  isMe ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                }`}>
                  
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
                          isMe ? "bg-primary-foreground/10 hover:bg-primary-foreground/20" : "bg-background/50 hover:bg-background/80"
                        } transition-colors`}
                      >
                         <FileIcon className="w-4 h-4" />
                         <span className="text-sm underline break-all">{msg.fileName || 'Download File'}</span>
                      </a>
                    </div>
                  )}

                  {msg.text && <p className="text-sm break-words whitespace-pre-wrap">{msg.text}</p>}
                  
                  <div className={`text-[10px] mt-1 flex items-center gap-1 ${
                    isMe ? "text-primary-foreground/70" : "text-muted-foreground"
                  }`}>
                    {msg.timestamp?.seconds ? format(new Date(msg.timestamp.seconds * 1000), "hh:mm a") : "Sending..."}
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
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t border-border/50 bg-background">
        
        {/* File Preview */}
        {file && (
          <div className="mb-2 p-2 bg-secondary/30 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
               {file.type.startsWith('image/') ? (
                 <ImageIcon className="w-4 h-4 text-purple-500" />
               ) : (
                 <FileIcon className="w-4 h-4 text-blue-500" />
               )}
               <span className="text-sm truncate max-w-[200px]">{file.name}</span>
               <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6" 
              onClick={() => {
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            onChange={handleFileSelect}
            // accept="image/*,.pdf,.doc,.docx,.txt" // backend validates too
          />
          
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
              <Button type="button" variant="ghost" size="icon" className="mb-0.5" title="Add emoji">
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
            {isUploading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatView;
