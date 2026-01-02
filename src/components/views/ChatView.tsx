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
import { Send, Check, CheckCheck } from "lucide-react";
import { format } from "date-fns";

interface ChatViewProps {
  selectedUser: any;
  onBack?: () => void;
}

const ChatView = ({ selectedUser, onBack }: ChatViewProps) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser || !selectedUser) return;

    // Create a composite ID for the chat to simplify querying if we were using a subcollection,
    // but for now we'll query the top-level 'messages' collection with compound queries.
    // Note: This might require a composite index in Firestore. 
    // To avoid index creation during development, we can do client-side filtering or 
    // use a chat room ID approach. Let's use a chat room ID approach for simplicity and scalability.
    
    const chatId = [currentUser.uid, selectedUser.uid].sort().join("_");
    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
      
      // Mark unseen messages as seen
      msgs.forEach(async (msg: any) => {
        if (msg.receiverId === currentUser.uid && !msg.seen) {
          const msgRef = doc(db, "chats", chatId, "messages", msg.id);
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
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    const chatId = [currentUser.uid, selectedUser.uid].sort().join("_");
    const messagesRef = collection(db, "chats", chatId, "messages");

    await addDoc(messagesRef, {
      text: newMessage,
      senderId: currentUser.uid,
      receiverId: selectedUser.uid,
      timestamp: serverTimestamp(),
      seen: false,
      seenAt: null,
      delivered: false,
      deliveredAt: null
    });

    setNewMessage("");
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Chat Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/50">
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
        <div className="space-y-4">
          {messages.map((msg, index) => {
            const isMe = msg.senderId === currentUser?.uid;
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                  isMe ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                }`}>
                  <p className="text-sm">{msg.text}</p>
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
      <div className="p-4 border-t border-border/50">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatView;
