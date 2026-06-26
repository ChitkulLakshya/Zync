const logger = console; // WHAT: Assign console to logger. WHY: To provide basic logging for task socket events.

/**
 * Task Socket Handler — real-time task & activity updates.
 *
 * Protocol:
 *   Client connects to  io.of('/tasks')  with query  { userId }
 *   Events IN  → join-project, leave-project
 *   Events OUT → task-created, task-updated, task-deleted, activity-update
 */
module.exports = (io) => { // WHAT: Export the socket handler initialization function. WHY: Called by main server to setup task real-time features.
  const taskNamespace = io.of('/tasks'); // WHAT: Create /tasks namespace. WHY: Isolates task-related events from chat or presence.


  const userSockets = new Map(); // WHAT: Map user IDs to their socket connections. WHY: Enables sending events to specific users regardless of project.


  const projectUsers = new Map(); // WHAT: Map project IDs to a Set of user IDs. WHY: Enables broadcasting to everyone currently viewing a project.


  const addSocket = (userId, socketId) => { // WHAT: Helper to register a new connection. WHY: Tracks active devices for a user.
    if (!userSockets.has(userId)) userSockets.set(userId, new Set()); // WHAT: Initialize set if empty. WHY: Prevents undefined errors.
    userSockets.get(userId).add(socketId); // WHAT: Add socket to user's set. WHY: Stores the specific connection ID.
  };

  const removeSocket = (userId, socketId) => { // WHAT: Helper to unregister a connection. WHY: Cleans up memory when a tab is closed.
    const sockets = userSockets.get(userId); // WHAT: Get user's sockets. WHY: To find the one to remove.
    if (!sockets) return; // WHAT: Safety check. WHY: Prevents crash if user isn't tracked.
    sockets.delete(socketId); // WHAT: Remove the socket. WHY: It's no longer valid.
    if (sockets.size === 0) userSockets.delete(userId); // WHAT: Delete user entry if no sockets left. WHY: Free memory.
  };

  const addProjectUser = (projectId, userId) => { // WHAT: Helper to track a user in a project. WHY: For project-wide broadcasts.
    if (!projectUsers.has(projectId)) projectUsers.set(projectId, new Set()); // WHAT: Init set. WHY: Safety.
    projectUsers.get(projectId).add(userId); // WHAT: Add user to project. WHY: Marks them as active in this context.
  };

  const removeProjectUser = (projectId, userId) => { // WHAT: Helper to remove user from project. WHY: When they leave the project page.
    const users = projectUsers.get(projectId); // WHAT: Get project users. WHY: To mutate the list.
    if (!users) return; // WHAT: Safety check. WHY: Avoid crash.
    users.delete(userId); // WHAT: Remove user. WHY: Update state.
    if (users.size === 0) projectUsers.delete(projectId); // WHAT: Delete project entry if empty. WHY: Memory cleanup.
  };

  /** Emit to every socket that belongs to `userId` */
  const emitToUser = (userId, event, data) => { // WHAT: Helper to send an event to a specific user. WHY: Abstracts the loop over multiple devices.
    const sockets = userSockets.get(userId); // WHAT: Get user's sockets. WHY: Need IDs to emit to.
    if (!sockets) return; // WHAT: Check if online. WHY: Silently drop if offline.
    for (const sid of sockets) { // WHAT: Loop sockets. WHY: Send to web, mobile, etc. simultaneously.
      taskNamespace.to(sid).emit(event, data); // WHAT: Emit the event. WHY: Delivers the payload to the client.
    }
  };



  /**
   * Emit a task event to all connected members of a project.
   * Usage: req.app.get('taskIO').emitToProject(projectId, event, data)
   */
  taskNamespace.emitToProject = (projectId, event, data) => { // WHAT: Attach custom method to namespace. WHY: Allows HTTP routes to trigger socket broadcasts.
    const userIds = projectUsers.get(String(projectId)); // WHAT: Get users in project. WHY: Need to know who to send to.
    if (!userIds) return; // WHAT: Return if none. WHY: Saves CPU.
    for (const uid of userIds) { // WHAT: Loop over user IDs. WHY: Delegate to emitToUser for actual sending.
      emitToUser(uid, event, data); // WHAT: Send to each user. WHY: Reuses the multi-device logic.
    }
  };

  /**
   * Emit a task event to a specific user across all projects they belong to.
   * Useful when a user is assigned a task in a project they haven't joined yet.
   */
  taskNamespace.emitToUser = (userId, event, data) => { // WHAT: Attach method for direct user emission. WHY: Allows routes to notify a specific person.
    emitToUser(userId, event, data); // WHAT: Call helper. WHY: Wrapper for external use.
  };


  taskNamespace.on('connection', (socket) => { // WHAT: Listen for connections. WHY: Main entry point for clients.
    const userId = socket.handshake.query.userId; // WHAT: Get userId from handshake. WHY: Authentication/identification.
    if (!userId) { socket.disconnect(); return; } // WHAT: Disconnect invalid users. WHY: Security.

    addSocket(userId, socket.id); // WHAT: Track new connection. WHY: Updates server state.
    logger.log(`[TaskSocket] ✅ ${userId} connected (${socket.id})`); // WHAT: Log it. WHY: Debugging.


    socket.on('join-project', (projectId) => { // WHAT: Listen for project joins. WHY: User navigated to a project dashboard.
      if (!projectId) return; // WHAT: Validate. WHY: Prevent errors.
      addProjectUser(String(projectId), userId); // WHAT: Update map state. WHY: So they receive project broadcasts.
      socket.join(`project:${projectId}`); // WHAT: Join Socket.IO room. WHY: Native way to group sockets, though we also use custom maps.
      logger.log(`[TaskSocket] ${userId} joined project ${projectId}`); // WHAT: Log it. WHY: Tracking.
    });


    socket.on('leave-project', (projectId) => { // WHAT: Listen for project leaves. WHY: User left dashboard.
      if (!projectId) return; // WHAT: Validate. WHY: Safety.
      removeProjectUser(String(projectId), userId); // WHAT: Update map. WHY: Stop receiving broadcasts.
      socket.leave(`project:${projectId}`); // WHAT: Leave Socket.IO room. WHY: Cleanup.
      logger.log(`[TaskSocket] ${userId} left project ${projectId}`); // WHAT: Log it. WHY: Tracking.
    });


    socket.on('disconnect', () => { // WHAT: Listen for disconnects. WHY: Tab closed or network lost.
      removeSocket(userId, socket.id); // WHAT: Remove from main map. WHY: Cleanup.


      const rooms = [...socket.rooms]; // WHAT: Copy current rooms. WHY: Need to iterate safely.
      for (const room of rooms) { // WHAT: Loop through rooms. WHY: Find project rooms to clean up `projectUsers` map.
        if (room.startsWith('project:')) { // WHAT: Check prefix. WHY: Identify project rooms.
          const projectId = room.replace('project:', ''); // WHAT: Extract ID. WHY: Needed for map key.
          removeProjectUser(projectId, userId); // WHAT: Remove from map. WHY: Cleanup state.
        }
      }

      logger.log(`[TaskSocket] ❌ ${userId} disconnected (${socket.id})`); // WHAT: Log disconnect. WHY: Tracking.
    });
  });

  return taskNamespace; // WHAT: Return the namespace. WHY: So it can be attached to the Express app.
};
