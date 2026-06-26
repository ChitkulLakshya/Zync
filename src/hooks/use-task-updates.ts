import { useEffect, useCallback, useRef } from 'react'; // Imports the useEffect, useCallback, and useRef hooks from the 'react' library, which are used for handling side effects, memoizing functions, and creating references to DOM nodes or values, respectively.
import {
  connectTaskSocket, // Imports the connectTaskSocket function, which establishes a connection to the task socket, allowing the application to receive task updates.
  disconnectTaskSocket, // Imports the disconnectTaskSocket function, which severs the connection to the task socket, stopping the flow of task updates.
  joinProject, // Imports the joinProject function, which adds the user to a specific project room, enabling them to receive task updates for that project.
  leaveProject, // Imports the leaveProject function, which removes the user from a specific project room, preventing them from receiving task updates for that project.
  onTaskCreated, // Imports the onTaskCreated function, which sets up a listener for when a new task is created, triggering a callback with the task data.
  onTaskUpdated, // Imports the onTaskUpdated function, which sets up a listener for when a task is updated, triggering a callback with the updated task data.
  onTaskDeleted, // Imports the onTaskDeleted function, which sets up a listener for when a task is deleted, triggering a callback with the deleted task data.
  onTaskAssigned, // Imports the onTaskAssigned function, which sets up a listener for when a task is assigned, triggering a callback with the assigned task data.
  TaskEvent, // Imports the TaskEvent type, which represents the data associated with a task event, such as creation, update, deletion, or assignment.
} from '@/services/taskSocketService'; // Imports these functions and types from the taskSocketService module, which handles the underlying task socket connection and event listeners.

interface UseTaskUpdatesOptions { // Defines the UseTaskUpdatesOptions interface, which specifies the shape of the options object passed to the useTaskUpdates hook.
  userId: string | undefined; // The userId property, which is either a string representing the user's ID or undefined if no user is logged in.
  projectIds?: string[]; // The projectIds property, which is an optional array of strings representing the IDs of the projects to join.
  onTaskChange?: (event: 'created' | 'updated' | 'deleted' | 'assigned', data: TaskEvent) => void; // The onTaskChange property, which is an optional callback function that will be triggered when a task event occurs, receiving the event type and task data as arguments.
}

/**
 * Hook that connects to the task socket and triggers a callback
 * whenever task data changes. Optionally joins specific project rooms.
 */
export function useTaskUpdates({ userId, projectIds, onTaskChange }: UseTaskUpdatesOptions) { // Defines the useTaskUpdates hook, which takes an options object with userId, projectIds, and onTaskChange properties.
  const onTaskChangeRef = useRef(onTaskChange); // Creates a reference to the onTaskChange callback function using the useRef hook, allowing it to be updated and accessed across re-renders.
  onTaskChangeRef.current = onTaskChange; // Updates the current value of the onTaskChangeRef to the latest onTaskChange callback function, ensuring that the correct callback is used when handling task events.

  useEffect(() => { // Uses the useEffect hook to handle the side effect of connecting to the task socket when the component mounts or the userId changes.
    if (!userId) { return; } // If the userId is falsy, returns immediately, as there is no user to connect to the task socket.

    connectTaskSocket(userId); // Connects to the task socket using the provided userId, enabling the application to receive task updates.

    return () => { // Returns a cleanup function that will be executed when the component unmounts or the userId changes.
      disconnectTaskSocket(); // Disconnects from the task socket, stopping the flow of task updates.
    };
  }, [userId]); // Specifies that the effect should re-run when the userId changes, ensuring that the task socket connection is updated accordingly.

  const prevProjectIdsRef = useRef<Set<string>>(new Set()); // Creates a reference to a set of previous project IDs using the useRef hook, allowing it to be updated and accessed across re-renders.

  useEffect(() => { // Uses the useEffect hook to handle the side effect of joining or leaving project rooms when the projectIds change.
    if (!userId || !projectIds) { return; } // If the userId or projectIds are falsy, returns immediately, as there is no user or projects to join.

    const currentIds = new Set(projectIds); // Creates a set of the current project IDs from the projectIds array.
    const prevIds = prevProjectIdsRef.current; // Retrieves the previous set of project IDs from the prevProjectIdsRef.

    for (const id of currentIds) { // Iterates over the current project IDs.
      if (!prevIds.has(id)) { // If the previous set of project IDs does not include the current ID, joins the project room.
        joinProject(id); // Joins the project room with the specified ID, enabling the application to receive task updates for that project.
      }
    }

    for (const id of prevIds) { // Iterates over the previous set of project IDs.
      if (!currentIds.has(id)) { // If the current set of project IDs does not include the previous ID, leaves the project room.
        leaveProject(id); // Leaves the project room with the specified ID, preventing the application from receiving task updates for that project.
      }
    }

    prevProjectIdsRef.current = currentIds; // Updates the previous set of project IDs to the current set.

    return () => { // Returns a cleanup function that will be executed when the component unmounts or the projectIds change.
      for (const id of currentIds) { // Iterates over the current project IDs.
        leaveProject(id); // Leaves the project room with the specified ID, preventing the application from receiving task updates for that project.
      }
    };
  }, [userId, projectIds]); // Specifies that the effect should re-run when the userId or projectIds change, ensuring that the project room membership is updated accordingly.

  useEffect(() => { // Uses the useEffect hook to handle the side effect of setting up task event listeners when the component mounts or the userId changes.
    if (!userId) { return; } // If the userId is falsy, returns immediately, as there is no user to set up task event listeners for.

    const unsubCreated = onTaskCreated((data) => { // Sets up a listener for when a new task is created, triggering a callback with the task data.
      onTaskChangeRef.current?.('created', data); // Calls the onTaskChange callback function with the 'created' event type and task data, if it exists.
    });

    const unsubUpdated = onTaskUpdated((data) => { // Sets up a listener for when a task is updated, triggering a callback with the updated task data.
      onTaskChangeRef.current?.('updated', data); // Calls the onTaskChange callback function with the 'updated' event type and task data, if it exists.
    });

    const unsubDeleted = onTaskDeleted((data) => { // Sets up a listener for when a task is deleted, triggering a callback with the deleted task data.
      onTaskChangeRef.current?.('deleted', data); // Calls the onTaskChange callback function with the 'deleted' event type and task data, if it exists.
    });

    const unsubAssigned = onTaskAssigned((data) => { // Sets up a listener for when a task is assigned, triggering a callback with the assigned task data.
      onTaskChangeRef.current?.('assigned', data); // Calls the onTaskChange callback function with the 'assigned' event type and task data, if it exists.
    });

    return () => { // Returns a cleanup function that will be executed when the component unmounts or the userId changes.
      unsubCreated(); // Unsubscribes from the task created event listener.
      unsubUpdated(); // Unsubscribes from the task updated event listener.
      unsubDeleted(); // Unsubscribes from the task deleted event listener.
      unsubAssigned(); // Unsubscribes from the task assigned event listener.
    };
  }, [userId]); // Specifies that the effect should re-run when the userId changes, ensuring that the task event listeners are updated accordingly.
}