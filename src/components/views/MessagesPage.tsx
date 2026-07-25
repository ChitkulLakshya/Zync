/**
 * @fileoverview MessagesPage.tsx
 * @module MessagesPage
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
import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Search,
  Phone,
  Video,
  MoreVertical,
  FileText,
  Link as LinkIcon,
  Image as ImageIcon,
  ChevronLeft,
  Send,
  UserPlus,
  Lock,
  Star,
} from 'lucide-react';
import ChatView from './ChatView';
import { getFullUrl, getUserName, getUserInitials, API_BASE_URL } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { sendMessage as socketSendMessage } from '@/services/chatSocketService';

interface MessagesPageProps {
  users: any[];
  currentUser: any;
  currentUserData?: any;
  userStatuses: Record<string, any>;
  onNavigateBack: () => void;
  initialSelectedUser?: any;
}

const MessagesPage = ({
  users: teamUsers,
  currentUser,
  currentUserData: propUserData,
  userStatuses,
  onNavigateBack,
  initialSelectedUser,
}: MessagesPageProps) => {
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const { toast } = useToast();

  const [allContacts, setAllContacts] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  const [userData, setUserData] = useState<any>(propUserData || null);
  const [localCloseFriendsIds, setLocalCloseFriendsIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchMe = async () => {
      if (propUserData) {
        setUserData(propUserData);
        setLocalCloseFriendsIds(propUserData.closeFriends || []);
      } else if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          const res = await fetch(`${API_BASE_URL}/api/users/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setUserData(data);
            setLocalCloseFriendsIds(data.closeFriends || []);
          }
        } catch (e) {
          console.error('Error fetching user data', e);
        }
      }
    };
    fetchMe();
  }, [currentUser, propUserData]);

  useEffect(() => {
    if (initialSelectedUser) {
      setSelectedUser(initialSelectedUser);
    }
  }, [initialSelectedUser]);

  const toggleCloseFriend = async () => {
    if (!selectedUser || !currentUser) {
      return;
    }
    const friendId = selectedUser.uid;
    const isClose = localCloseFriendsIds.includes(friendId);

    if (isClose) {
      setLocalCloseFriendsIds((prev) => prev.filter((id) => id !== friendId));
    } else {
      setLocalCloseFriendsIds((prev) => [...prev, friendId]);
    }

    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/users/close-friends/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ friendId }),
      });

      if (res.ok) {
        const data = await res.json();
        toast({ description: data.message });
      } else {
        setLocalCloseFriendsIds((prev) =>
          isClose ? [...prev, friendId] : prev.filter((id) => id !== friendId)
        );
        toast({ description: 'Failed to update close friend status', variant: 'destructive' });
      }
    } catch (error) {
      console.error(error);
      setLocalCloseFriendsIds((prev) =>
        isClose ? [...prev, friendId] : prev.filter((id) => id !== friendId)
      );
      toast({ description: 'Error updating close friend status', variant: 'destructive' });
    }
  };

  const isCloseFriend = (uid: string) => localCloseFriendsIds.includes(uid);

  useEffect(() => {
    const fetchContacts = async () => {
      if (!currentUser) {
        return;
      }
      try {
        const token = await currentUser.getIdToken();
        const res = await fetch(`${API_BASE_URL}/api/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setAllContacts(data);
        }
      } catch (error) {
        console.error('Error fetching contacts:', error);
      } finally {
        setLoadingContacts(false);
      }
    };
    fetchContacts();
  }, [currentUser]);

  const fetchRequests = async () => {
    if (!currentUser) {
      return;
    }
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();

        const requests = (data.chatRequests || []).filter((r: any) => r.status === 'pending');
        setPendingRequests(requests);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [currentUser]);

  const handleRespond = async (senderId: string, status: 'accepted' | 'rejected') => {
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/users/chat-request/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ senderId, status }),
      });

      if (res.ok) {
        toast({ title: `Request ${status}` });
        fetchRequests();

        if (status === 'accepted') {
          const token = await currentUser.getIdToken();
          const contactsRes = await fetch(`${API_BASE_URL}/api/users`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (contactsRes.ok) {
            setAllContacts(await contactsRes.json());
          }
          setSelectedUser(null);
        } else {
          setSelectedUser(null);
        }
      } else {
        toast({ title: 'Error', description: 'Failed to respond', variant: 'destructive' });
      }
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to respond', variant: 'destructive' });
    }
  };

  const filteredContacts = allContacts.filter(
    (user) =>
      user.uid !== currentUser?.uid &&
      (getUserName(user).toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const showSearchResults = searchTerm.trim().length > 1;

  const isSameTeam = (user: any) => {
    if (!user || !currentUser) {
      return false;
    }

    return teamUsers.some((u) => u.uid === user.uid);
  };

  const isKnownContact = (user: any) => {
    return allContacts.some((c) => c.uid === user.uid);
  };

  const handleSendRequest = async () => {
    if (!selectedUser || !requestMessage.trim()) {
      return;
    }
    setIsSendingRequest(true);
    try {
      const token = await currentUser.getIdToken();

      const response = await fetch(`${API_BASE_URL}/api/users/chat-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipientId: selectedUser.uid,
          message: requestMessage,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send request');
      }

      const chatId = [currentUser.uid, selectedUser.uid].sort().join('_');
      socketSendMessage({
        chatId,
        text: requestMessage,
        receiverId: selectedUser.uid,
        senderName: currentUser.displayName || 'Unknown',
        senderPhotoURL: currentUser.photoURL || undefined,
        type: 'request',
      });

      toast({ title: 'Request Sent', description: 'User has been notified via email.' });
      setRequestMessage('');
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to send request.', variant: 'destructive' });
    } finally {
      setIsSendingRequest(false);
    }
  };

  const isRequestUser = (user: any) => {
    return pendingRequests.some((r) => r.senderId === user.uid || r.senderId === user._id);
  };

  return (
    <div className="flex h-full w-full bg-background/50 backdrop-blur-xl overflow-hidden relative">
      {}
      <div className="w-80 shrink-0 border-r border-border/10 flex flex-col bg-transparent">
        {}
        <div className="p-4 border-b border-border/10 space-y-4 flex-none">
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={onNavigateBack}
              className="gap-2 pl-0 hover:bg-transparent hover:text-foreground -ml-2"
              title="Back to Team"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="font-semibold text-lg">Back</span>
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground opacity-50" />
            <Input
              placeholder="Search people..."
              className="pl-9 pr-10 bg-card/50 backdrop-blur-md border border-border/10 focus-visible:ring-1 focus-visible:ring-primary/20 rounded-xl h-10 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div
              className={`absolute right-3 top-2.5 transition-opacity duration-200 ${isSearching ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            >
              <div className="h-4 w-4 rounded-full bg-primary/30 animate-pulse"></div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-4 [&::-webkit-scrollbar]:hidden">
          {/* REQUESTS SECTION */}
          {pendingRequests.length > 0 && !searchTerm && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2 flex items-center justify-between">
                Requests{' '}
                <span className="text-[10px] bg-foreground text-background px-1.5 rounded-full">
                  {pendingRequests.length}
                </span>
              </h3>
              {pendingRequests.map((req) => (
                <div
                  key={req.senderId}
                  onClick={() =>
                    setSelectedUser({
                      uid: req.senderId,
                      displayName: req.senderName,
                      email: req.senderEmail,
                      photoURL: req.senderPhoto,
                      isRequest: true,
                      requestMessage: req.message,
                    })
                  }
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 group ${selectedUser?.uid === req.senderId ? 'bg-foreground/10' : 'hover:bg-foreground/5'}`}
                >
                  <Avatar className="w-10 h-10 border border-border/10">
                    <AvatarImage src={getFullUrl(req.senderPhoto)} referrerPolicy="no-referrer" />
                    <AvatarFallback className="text-xs">
                      {req.senderName?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold truncate text-foreground">
                        {req.senderName}
                      </span>
                      <span className="text-[10px] text-blue-500 font-medium">New</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate opacity-80">
                      wants to connect
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Global Search Results */}
          {showSearchResults && (
            <div>
              <div className="flex items-center justify-between px-3 mb-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Global Search
                </h3>
              </div>

              {searchResults.length > 0
                ? searchResults.map((user) => (
                    <div
                      key={user.uid}
                      onClick={() => setSelectedUser(user)}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 group ${selectedUser?.uid === user.uid ? 'bg-foreground/10' : 'hover:bg-foreground/5'}`}
                    >
                      <Avatar className="w-10 h-10 border border-border/10">
                        <AvatarImage src={getFullUrl(user.photoURL)} referrerPolicy="no-referrer" />
                        <AvatarFallback className="text-xs">{getUserInitials(user)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold truncate text-foreground">
                            {getUserName(user)}
                          </span>
                          {/* Badge for Non-Team */}
                          {!teamUsers.find((u) => u.uid === user.uid) && (
                            <span className="text-[10px] bg-card/50 backdrop-blur-md border border-border/10 px-1.5 py-0.5 rounded text-muted-foreground">
                              External
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate opacity-80">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  ))
                : !isSearching && (
                    <p className="text-xs text-center text-muted-foreground p-2">No users found.</p>
                  )}
            </div>
          )}

          {/* Team Members / All Contacts */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
              Contacts
            </h3>
            {filteredContacts.length > 0 ? (
              filteredContacts.map((user) => {
                const status = userStatuses[user.uid]?.status || user.status || 'offline';
                const isSelected = selectedUser?.uid === user.uid;

                return (
                  <div
                    key={user.uid}
                    onClick={() => setSelectedUser(user)}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 group ${
                      isSelected ? 'bg-foreground/10' : 'hover:bg-foreground/5'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="w-10 h-10 border border-border/10">
                        <AvatarImage src={getFullUrl(user.photoURL)} referrerPolicy="no-referrer" />
                        <AvatarFallback className="text-xs bg-muted">
                          {getUserInitials(user)}
                        </AvatarFallback>
                      </Avatar>
                      {status === 'online' && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-background rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <span
                          className={`text-sm font-semibold truncate ${isSelected ? 'text-foreground' : 'text-foreground'}`}
                        >
                          {getUserName(user)}
                        </span>
                        <span className="text-[10px] text-muted-foreground opacity-70">
                          {status === 'online' ? 'Now' : ''}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-muted-foreground truncate opacity-80">
                          {status}
                        </p>
                        {!isSameTeam(user) && (
                          <span className="text-[9px] bg-card/50 backdrop-blur-sm border border-border/10 px-1 py-0.5 rounded text-muted-foreground">
                            Ext
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground px-3">No contacts found.</p>
            )}
          </div>
        </div>
      </div>

      {/* MIDDLE - Chat Area or Request UI */}
      <div className="flex-1 flex flex-col min-w-0 bg-transparent relative z-0">
        {selectedUser ? (
          isSameTeam(selectedUser) || isKnownContact(selectedUser) ? (
            <div className="flex-1 flex flex-col h-full">
              <ChatView
                selectedUser={{
                  ...selectedUser,
                  status: userStatuses[selectedUser.uid]?.status || selectedUser.status,
                }}
              />
            </div>
          ) : selectedUser.isRequest ? (

            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <Avatar className="w-24 h-24 mb-4 ring-4 ring-border/10">
                <AvatarImage
                  src={getFullUrl(selectedUser.photoURL)}
                  referrerPolicy="no-referrer"
                  className="object-cover"
                />
                <AvatarFallback className="text-2xl bg-muted">
                  {getUserInitials(selectedUser)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">{selectedUser.displayName}</h2>
                <p className="text-muted-foreground">{selectedUser.email}</p>
              </div>

              <div className="bg-card/50 backdrop-blur-md p-4 rounded-2xl max-w-md w-full border border-border/10 relative">
                <span className="absolute -top-2.5 left-4 bg-card border border-border/10 rounded-md px-2 text-xs text-muted-foreground font-medium">
                  Message
                </span>
                <p className="text-sm italic text-foreground/80">"{selectedUser.requestMessage}"</p>
              </div>

              <div className="flex gap-4 w-full max-w-xs">
                <Button
                  className="flex-1 bg-foreground hover:bg-foreground/90 text-background rounded-xl"
                  onClick={() => handleRespond(selectedUser.uid, 'accepted')}
                >
                  Accept
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 text-foreground hover:bg-foreground/5 border-border/10 rounded-xl"
                  onClick={() => handleRespond(selectedUser.uid, 'rejected')}
                >
                  Decline
                </Button>
              </div>
            </div>
          ) : (

            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-24 h-24 rounded-full bg-card/50 flex items-center justify-center mb-2 ring-1 ring-border/10">
                <UserPlus className="w-10 h-10 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  Connect with {getUserName(selectedUser)}
                </h2>
                <p className="text-muted-foreground max-w-md mt-2">
                  This user is not in your team. Send a message request to start a conversation.
                </p>
              </div>

              <div className="w-full max-w-md space-y-4 bg-card/50 backdrop-blur-xl p-6 rounded-2xl border border-border/10 shadow-sm">
                <Input
                  placeholder="Hi! I'd like to discuss..."
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  disabled={isSendingRequest}
                />
                <Button
                  className="w-full gap-2"
                  onClick={handleSendRequest}
                  disabled={isSendingRequest || !requestMessage.trim()}
                >
                  <Send className={`w-4 h-4 ${isSendingRequest ? 'opacity-50' : ''}`} />
                  {isSendingRequest ? 'Sending...' : 'Send Request'}
                </Button>
                <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3" />
                  Your email address will be shared with the recipient.
                </p>
              </div>
            </div>
          )
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a conversation
          </div>
        )}
      </div>

      {/* RIGHT SIDEBAR - User Details */}
      {selectedUser && (
        <div className="w-72 shrink-0 border-l border-border/10 bg-transparent hidden xl:flex flex-col">
          <div className="p-6 flex flex-col items-center border-b border-border/10">
            <Avatar className="w-24 h-24 mb-4 ring-4 ring-border/10">
              <AvatarImage
                src={getFullUrl(selectedUser.photoURL)}
                className="object-cover"
                referrerPolicy="no-referrer"
              />
              <AvatarFallback className="text-2xl bg-muted">
                {getUserInitials(selectedUser)}
              </AvatarFallback>
            </Avatar>
            <h3 className="text-lg font-bold">{getUserName(selectedUser)}</h3>
            <span className="text-sm text-muted-foreground capitalize mb-1">
              {userStatuses[selectedUser.uid]?.status || selectedUser.status || 'offline'}
            </span>
            <p className="text-xs text-muted-foreground text-center line-clamp-2 px-4 mb-4">
              {selectedUser.email}
            </p>

            <div className="flex items-center gap-4">
              {(isSameTeam(selectedUser) || isKnownContact(selectedUser)) && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full w-10 h-10"
                    onClick={() => toast({ description: 'Call feature coming soon' })}
                  >
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full w-10 h-10"
                    onClick={() => toast({ description: 'Video call feature coming soon' })}
                  >
                    <Video className="w-4 h-4" />
                  </Button>
                </>
              )}
              <Button
                variant={isCloseFriend(selectedUser.uid) ? 'default' : 'outline'}
                size="icon"
                className={`rounded-full w-10 h-10 transition-colors ${isCloseFriend(selectedUser.uid) ? 'bg-foreground hover:bg-foreground/90 text-background border-border/10' : ''}`}
                onClick={toggleCloseFriend}
                title={
                  isCloseFriend(selectedUser.uid)
                    ? 'Remove from Close Friends'
                    : 'Add to Close Friends'
                }
              >
                <Star
                  className={`w-4 h-4 ${isCloseFriend(selectedUser.uid) ? 'fill-current' : ''}`}
                />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {!isSameTeam(selectedUser) && !isKnownContact(selectedUser) && (
              <div className="p-3 rounded-lg bg-card/50 backdrop-blur-md text-muted-foreground text-sm border border-border/10">
                <p className="font-semibold mb-1">External User</p>
                <p className="text-xs opacity-90">
                  This user is outside your team. Be careful with what you share.
                </p>
              </div>
            )}

            <div>
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                Shared Photos
              </h4>
              <div className="flex flex-col items-center justify-center py-6 text-center bg-card/50 backdrop-blur-md rounded-xl border border-border/10 border-dashed">
                <ImageIcon className="w-8 h-8 opacity-20 mb-2" />
                <span className="text-xs text-muted-foreground/50 font-medium">Empty</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                Shared Files
              </h4>
              <div className="flex flex-col items-center justify-center py-6 text-center bg-card/50 backdrop-blur-md rounded-xl border border-border/10 border-dashed">
                <FileText className="w-8 h-8 opacity-20 mb-2" />
                <span className="text-xs text-muted-foreground/50 font-medium">Empty</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesPage;
