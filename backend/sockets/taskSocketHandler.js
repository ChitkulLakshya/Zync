const logger = console;

/**
 * Task Socket Handler — real-time task & activity updates.
 *
 * Protocol:
 *   Client connects to  io.of('/tasks')  with query  { userId }
 *   Events IN  → join-project, leave-project
 *   Events OUT → task-created, task-updated, task-deleted, activity-update
 */
module.exports = (io) => {
  const taskNamespace = io.of('/tasks');


  const userSockets = new Map();


  const projectUsers = new Map();


  const addSocket = (userId, socketId) => {
    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId).add(socketId);
  };

  const removeSocket = (userId, socketId) => {
    const sockets = userSockets.get(userId);
    if (!sockets) return;
    sockets.delete(socketId);
    if (sockets.size === 0) userSockets.delete(userId);
  };

  const addProjectUser = (projectId, userId) => {
    if (!projectUsers.has(projectId)) projectUsers.set(projectId, new Set());
    projectUsers.get(projectId).add(userId);
  };

  const removeProjectUser = (projectId, userId) => {
    const users = projectUsers.get(projectId);
    if (!users) return;
    users.delete(userId);
    if (users.size === 0) projectUsers.delete(projectId);
  };

  /** Emit to every socket that belongs to `userId` */
  const emitToUser = (userId, event, data) => {
    const sockets = userSockets.get(userId);
    if (!sockets) return;
    for (const sid of sockets) {
      taskNamespace.to(sid).emit(event, data);
    }
  };



  /**
   * Emit a task event to all connected members of a project.
   * Usage: req.app.get('taskIO').emitToProject(projectId, event, data)
   */
  taskNamespace.emitToProject = (projectId, event, data) => {
    const userIds = projectUsers.get(String(projectId));
    if (!userIds) return;
    for (const uid of userIds) {
      emitToUser(uid, event, data);
    }
  };

  /**
   * Emit a task event to a specific user across all projects they belong to.
   * Useful when a user is assigned a task in a project they haven't joined yet.
   */
  taskNamespace.emitToUser = (userId, event, data) => {
    emitToUser(userId, event, data);
  };


  taskNamespace.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;
    if (!userId) { socket.disconnect(); return; }

    addSocket(userId, socket.id);
    logger.log(`[TaskSocket] ✅ ${userId} connected (${socket.id})`);


    socket.on('join-project', (projectId) => {
      if (!projectId) return;
      addProjectUser(String(projectId), userId);
      socket.join(`project:${projectId}`);
      logger.log(`[TaskSocket] ${userId} joined project ${projectId}`);
    });


    socket.on('leave-project', (projectId) => {
      if (!projectId) return;
      removeProjectUser(String(projectId), userId);
      socket.leave(`project:${projectId}`);
      logger.log(`[TaskSocket] ${userId} left project ${projectId}`);
    });


    socket.on('disconnect', () => {
      removeSocket(userId, socket.id);


      const rooms = [...socket.rooms];
      for (const room of rooms) {
        if (room.startsWith('project:')) {
          const projectId = room.replace('project:', '');
          removeProjectUser(projectId, userId);
        }
      }

      logger.log(`[TaskSocket] ❌ ${userId} disconnected (${socket.id})`);
    });
  });

  return taskNamespace;
};
