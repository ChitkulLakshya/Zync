import { useEffect, useRef } from "react";
import { collection, query, where, onSnapshot, Timestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export const useChatNotifications = () => {
    const navigate = useNavigate();
    // Use a ref to track the initial load time to avoid notifying for old messages
    const startTimeRef = useRef(Timestamp.now());
    const notifiedIds = useRef(new Set());

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged((user) => {
            if (!user) return;

            // Query messages where receiver is current user
            // We remove orderBy("createdAt") because:
            // 1. The field is actually called 'timestamp'
            // 2. Sorting by timestamp would require a composite index with receiverId
            // 3. Since we primarily just need to know about *new* messages arriving,
            //    we can listen to the stream and check the timestamp in memory.
            //    This downloads all messages for the user initially, but for a smaller app
            //    this ensures reliability without index setup errors.
            const q = query(
                collection(db, "messages"),
                where("receiverId", "==", user.uid)
            );

            const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === "added") {
                        const message = change.doc.data();

                        // Filter logic:
                        // 1. Must be a new message (created after hook mounted)
                        // 2. Sender must not be current user (redundant if receiverId check works, but safe)
                        // 3. User must NOT be on the Chat view

                        // Check if message is newer than start time
                        // Note: Database field is 'timestamp' (serverTimestamp), not 'createdAt'
                        const messageTime = message.timestamp instanceof Timestamp ? message.timestamp : null;

                        if (messageTime && messageTime.toMillis() > startTimeRef.current.toMillis()) {

                            // Prevent Duplicate Notifications for the same message ID
                            const msgId = change.doc.id;
                            if (notifiedIds.current.has(msgId)) return;
                            notifiedIds.current.add(msgId);

                            // Check if user is already on Chat view
                            const activeSection = localStorage.getItem("ZYNC-active-section");

                            if (activeSection !== "Chat") {
                                toast(message.senderName || "New Message", {
                                    description: message.text ? (message.text.length > 50 ? message.text.substring(0, 50) + "..." : message.text) : "Sent a file/image",
                                    duration: 3000, // Duration: 3 seconds
                                    action: {
                                        label: "Open Chat",
                                        onClick: () => {
                                            localStorage.setItem("ZYNC-active-section", "Chat");

                                            // Dispatch custom event with sender details
                                            const event = new CustomEvent("ZYNC-open-chat", {
                                                detail: {
                                                    uid: message.senderId,
                                                    displayName: message.senderName,
                                                    photoURL: message.senderPhotoURL // Assuming we might add this later or it exists
                                                }
                                            });
                                            window.dispatchEvent(event);

                                            navigate("/dashboard");
                                        },
                                    },
                                });
                            }
                        }
                    }
                });
            }, (error) => {
                console.error("Notification Error:", error);
            });

            return () => {
                unsubscribeSnapshot();
            };
        });

        return () => unsubscribeAuth();
    }, [navigate]);
};
