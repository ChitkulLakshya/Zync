import { useEffect, useRef } from 'react'; // Imports the 'useEffect' and 'useRef' hooks from the 'react' library, which are used for handling side effects and creating references to values, respectively.
import { API_BASE_URL } from '@/lib/utils'; // Imports the 'API_BASE_URL' constant from the '@/lib/utils' module, which is used as the base URL for API requests.
import { auth } from '@/lib/firebase'; // Imports the 'auth' object from the '@/lib/firebase' module, which is used for authentication.

const IDLE_TIMEOUT = 5 * 60 * 1000; // Defines the 'IDLE_TIMEOUT' constant, which represents the time in milliseconds after which a user is considered idle, and is used to determine the active increment.
const HEARTBEAT_INTERVAL = 60 * 1000; // Defines the 'HEARTBEAT_INTERVAL' constant, which represents the time in milliseconds between each heartbeat, and is used to schedule the heartbeat interval.

export const useActivityTracker = () => { // Defines the 'useActivityTracker' hook, which is used to track user activity.
  const lastActionRef = useRef<number>(Date.now()); // Creates a reference to the last action timestamp, initialized with the current timestamp, so that it can be accessed and updated across renders.
  const activeIncrementRef = useRef<number>(0); // Creates a reference to the active increment, initialized to 0, so that it can be accessed and updated across renders.
  const sessionIdRef = useRef<string | null>(null); // Creates a reference to the session ID, initialized to null, so that it can be accessed and updated across renders.

  useEffect(() => { // Uses the 'useEffect' hook to handle the authentication state change side effect, which is only run once when the component mounts.
    const unsubscribe = auth.onAuthStateChanged(async (user) => { // Sets up an authentication state change listener, which is called when the user's authentication state changes.
      if (user && !sessionIdRef.current) { // Checks if the user is authenticated and the session ID is not set.
        try { // Attempts to parse the current session from local storage.
          const raw = localStorage.getItem('currentSession'); // Retrieves the current session from local storage.
          if (raw) { // Checks if the current session is not null.
            const parsed = JSON.parse(raw); // Parses the current session from JSON.
            sessionIdRef.current = parsed?.id || null; // Sets the session ID to the parsed ID or null if it's not present.
          }
        } catch { // Catches any errors that occur during parsing.
          sessionIdRef.current = null; // Sets the session ID to null if an error occurs.
        }
      } else if (!user) { // Checks if the user is not authenticated.
        sessionIdRef.current = null; // Sets the session ID to null if the user is not authenticated.
      }
    }); // Returns the unsubscribe function to clean up the listener when the component unmounts.
    return () => unsubscribe(); // Calls the unsubscribe function to clean up the listener when the component unmounts.
  }, []); // Specifies an empty dependency array, which means the effect is only run once when the component mounts.

  useEffect(() => { // Uses the 'useEffect' hook to handle the user activity tracking side effect, which is only run once when the component mounts.
    const handleUserActivity = () => { // Defines a function to handle user activity, which updates the last action timestamp.
      const now = Date.now(); // Gets the current timestamp.
      lastActionRef.current = now; // Updates the last action timestamp.
    }; // Defines the events to listen for, which include mouse down, mouse move, key down, scroll, and touch start.

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart']; // Adds event listeners for each event to the window, which calls the handleUserActivity function when an event occurs.
    events.forEach(event => window.addEventListener(event, handleUserActivity)); // Sets up an interval to send heartbeats at the specified interval.

    const interval = setInterval(() => { // Checks if the session ID is set before sending a heartbeat.
      if (!sessionIdRef.current) {return;} // Gets the current timestamp.
      const now = Date.now(); // Calculates the time since the last action.
      const timeSinceLastAction = now - lastActionRef.current; // Initializes the active increment to 0.

      let increment = 0; // Checks if the time since the last action is less than the idle timeout, and if so, sets the active increment to the heartbeat interval in seconds.
      if (timeSinceLastAction < IDLE_TIMEOUT) { // Calculates the active increment in seconds.
        increment = HEARTBEAT_INTERVAL / 1000; // Checks if the user is authenticated before sending a heartbeat.
      }

      if (auth.currentUser) { // Gets the user's ID token, which is used to authenticate the request.
        auth.currentUser.getIdToken().then(token => { // Sends a PUT request to the sessions API to update the session with the last action timestamp and active increment.
          fetch(`${API_BASE_URL}/api/sessions/${sessionIdRef.current}`, { // Specifies the request method as PUT.
            method: 'PUT', // Specifies the content type as JSON.
            headers: { // Specifies the authorization header with the user's ID token.
              'Content-Type': 'application/json', // Specifies the authorization header with the user's ID token.
              'Authorization': `Bearer ${token}` // Stringifies the request body as JSON.
            }, // Stringifies the request body as JSON.
            body: JSON.stringify({ // Specifies the last action timestamp in the request body.
              lastAction: new Date(lastActionRef.current), // Specifies the active increment in the request body.
              activeIncrement: increment // Catches any errors that occur during the request.
            }) // Catches any errors that occur during the request.
          }).catch(err => console.error("Heartbeat failed", err)); // Catches any errors that occur during the request.
        }); // Returns a function to clean up the event listeners and interval when the component unmounts.
      }

    }, HEARTBEAT_INTERVAL); // Removes the event listeners for each event from the window when the component unmounts.
    return () => { // Removes the event listeners for each event from the window when the component unmounts.
      events.forEach(event => window.removeEventListener(event, handleUserActivity)); // Clears the interval when the component unmounts.
      clearInterval(interval); // Specifies an empty dependency array, which means the effect is only run once when the component mounts.
    }; // Specifies an empty dependency array, which means the effect is only run once when the component mounts.
  }, []); // Specifies an empty dependency array, which means the effect is only run once when the component mounts.
};