import { useEffect, useRef } from 'react'; // Imports the useEffect and useRef hooks from the 'react' library, which are used for handling side effects and storing references to values, respectively.
import { onMessage, ChatMessage } from '@/services/chatSocketService'; // Imports the onMessage function and ChatMessage type from the chatSocketService module, which are used for receiving and handling chat messages.
import { auth } from '@/lib/firebase'; // Imports the auth object from the firebase library, which is used for handling user authentication.
import { toast } from 'sonner'; // Imports the toast function from the sonner library, which is used for displaying toast notifications.
import { useNavigate } from 'react-router-dom'; // Imports the useNavigate hook from the react-router-dom library, which is used for navigating between routes.

export const useChatNotifications = () => { // Defines a custom hook called useChatNotifications, which is used for handling chat notifications.
  const navigate = useNavigate(); // Initializes the navigate function using the useNavigate hook, which is used for navigating between routes.

  const startTimeRef = useRef(Date.now()); // Initializes a reference to the current time using the useRef hook, which is used for storing the time when the component mounts.
  const notifiedIds = useRef(new Set<string>()); // Initializes a reference to a set of notified message IDs using the useRef hook, which is used for keeping track of messages that have already been notified.

  useEffect(() => { // Uses the useEffect hook to handle side effects, such as setting up event listeners and unsubscribing from them when the component unmounts.
    const unsubscribeAuth = auth.onAuthStateChanged((user) => { // Sets up an event listener for the onAuthStateChanged event, which is triggered when the user's authentication state changes.
      if (!user) { // Checks if the user is not authenticated, in which case the function returns without doing anything.
        return; // Returns from the function if the user is not authenticated.
      }

      const unsubscribeMessage = onMessage((msg: ChatMessage) => { // Sets up an event listener for the onMessage event, which is triggered when a new chat message is received.

        if (msg.receiverId !== user.uid) { // Checks if the message is not intended for the current user, in which case the function returns without doing anything.
          return; // Returns from the function if the message is not intended for the current user.
        }

        const messageTime = new Date(msg.createdAt).getTime(); // Converts the message's creation time to a timestamp.
        if (messageTime <= startTimeRef.current) { // Checks if the message was sent before the component mounted, in which case the function returns without doing anything.
          return; // Returns from the function if the message was sent before the component mounted.
        }

        if (notifiedIds.current.has(msg.id)) { // Checks if the message has already been notified, in which case the function returns without doing anything.
          return; // Returns from the function if the message has already been notified.
        }
        notifiedIds.current.add(msg.id); // Adds the message ID to the set of notified message IDs.

        const activeSection = localStorage.getItem('ZYNC-active-section'); // Retrieves the currently active section from local storage.

        if (activeSection !== 'Chat') { // Checks if the chat section is not currently active, in which case a toast notification is displayed.
          toast(msg.senderName || 'New Message', { // Displays a toast notification with the sender's name and the message text.
            description: msg.text // Sets the description of the toast notification to the message text.
              ? msg.text.length > 50 // Checks if the message text is longer than 50 characters.
                ? msg.text.substring(0, 50) + '...' // If the message text is longer than 50 characters, truncates it to 50 characters and appends an ellipsis.
                : msg.text // If the message text is not longer than 50 characters, uses the full text.
              : 'Sent a file/image', // If the message does not contain text, sets the description to 'Sent a file/image'.
            duration: 3000, // Sets the duration of the toast notification to 3000 milliseconds.
            action: { // Sets the action of the toast notification.
              label: 'Open Chat', // Sets the label of the action to 'Open Chat'.
              onClick: () => { // Defines the onClick handler for the action.
                localStorage.setItem('ZYNC-active-section', 'Chat'); // Sets the currently active section to 'Chat' in local storage.

                const event = new CustomEvent('ZYNC-open-chat', { // Creates a new custom event called 'ZYNC-open-chat'.
                  detail: { // Sets the detail of the event.
                    uid: msg.senderId, // Sets the uid property of the detail to the sender's ID.
                    displayName: msg.senderName, // Sets the displayName property of the detail to the sender's name.
                    photoURL: msg.senderPhotoURL, // Sets the photoURL property of the detail to the sender's photo URL.
                  },
                });
                window.dispatchEvent(event); // Dispatches the custom event.

                navigate('/dashboard'); // Navigates to the '/dashboard' route.
              },
            },
          });
        }
      });

      return () => { // Returns a function that is called when the component unmounts.
        unsubscribeMessage(); // Unsubscribes from the onMessage event listener.
      };
    });

    return () => unsubscribeAuth(); // Returns a function that is called when the component unmounts, which unsubscribes from the onAuthStateChanged event listener.
  }, [navigate]); // Specifies that the navigate function is a dependency of the useEffect hook, which means the effect will be re-run if the navigate function changes.