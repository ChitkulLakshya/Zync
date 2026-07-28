import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ArrowLeft, MessageSquare, Loader2 } from 'lucide-react';
import ChatView from '@/components/views/ChatView';
import { getFullUrl, getUserInitials, API_BASE_URL } from '@/lib/utils';

interface MobileMessagesProps {
  users: any[];
  currentUser: any;
  currentUserData?: any;
  userStatuses?: Record<string, any>;
  initialSelectedUser?: any;
}

const MobileMessages = ({
  users: teamUsers,
  currentUser,
  currentUserData,
  userStatuses = {},
  initialSelectedUser,
}: MobileMessagesProps) => {
  const [selectedUser, setSelectedUser] = useState<any>(initialSelectedUser || null);
  const [searchTerm, setSearchTerm] = useState('');
  const [allContacts, setAllContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (initialSelectedUser) {setSelectedUser(initialSelectedUser);}
  }, [initialSelectedUser]);

  useEffect(() => {
    const fetchContacts = async () => {
      if (!currentUser) {return;}
      try {
        const token = await currentUser.getIdToken();
        const res = await fetch(`${API_BASE_URL}/api/chat/contacts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setAllContacts(Array.isArray(data) ? data : []);
        } else {
          setAllContacts(teamUsers.filter(u => u.uid !== currentUser.uid));
        }
      } catch {
        setAllContacts(teamUsers.filter(u => u.uid !== currentUser.uid));
      } finally {
        setLoading(false);
      }
    };
    fetchContacts();
  }, [currentUser, teamUsers]);

  const filteredContacts = allContacts.filter(c =>
    (c.displayName || c.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Chat view
  if (selectedUser) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-2 py-2 shrink-0 border-b border-border/10">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedUser(null)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Avatar className="h-8 w-8">
            <AvatarImage src={getFullUrl(selectedUser.photoURL) || undefined} />
            <AvatarFallback className="text-xs">{getUserInitials(selectedUser)}</AvatarFallback>
          </Avatar>
          <span className="font-medium text-sm truncate flex-1">{selectedUser.displayName || selectedUser.email}</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <ChatView
            selectedUser={selectedUser}
            currentUserData={currentUserData}
            isQuickChat={false}
          />
        </div>
      </div>
    );
  }

  // Contact list
  return (
    <div className="flex flex-col h-full">
      <div className="pl-4 pr-14 py-3 shrink-0 border-b border-border/10 space-y-3">
        <h2 className="text-lg font-semibold">Messages</h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 bg-secondary/50 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">No contacts</h3>
            <p className="text-sm text-muted-foreground">Search for users to start chatting.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/5">
            {filteredContacts.map(contact => {
              const status = userStatuses[contact.uid];
              const isOnline = status?.isOnline || status?.state === 'online';
              return (
                <button
                  key={contact.uid}
                  onClick={() => setSelectedUser(contact)}
                  className="flex items-center gap-3 w-full px-4 py-3 active:bg-secondary/30 text-left"
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={getFullUrl(contact.photoURL) || undefined} />
                      <AvatarFallback className="text-xs">{getUserInitials(contact)}</AvatarFallback>
                    </Avatar>
                    {isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{contact.displayName || contact.email}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {isOnline ? 'Online' : (contact.bio || 'Tap to chat')}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileMessages;
