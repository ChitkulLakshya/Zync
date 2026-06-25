import { io, Socket } from 'socket.io-client';
import { SOCKET_BASE_URL } from '@/lib/utils';

export interface TaskEvent {
  projectId: string;
  stepId?: string;
  taskId?: string;
  task?: any;
  tasks?: any[];
  changes?: any;
  actor?: string;
  projectName?: string;
}

type TaskEventCallback = (data: TaskEvent) => void;

let socket: Socket | null = null;
const createdListeners = new Set<TaskEventCallback>();
const updatedListeners = new Set<TaskEventCallback>();
const deletedListeners = new Set<TaskEventCallback>();
const assignedListeners = new Set<TaskEventCallback>();

const joinedProjects = new Set<string>();

/**
 * Connect to the /tasks namespace. Safe to call multiple times.
 */
export function connectTaskSocket(userId: string): Socket {
  if (socket?.connected) {return socket;}

  const socketUrl = SOCKET_BASE_URL;

  socket = io(`${socketUrl}/tasks`, {
    query: { userId },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('task-created', (data: TaskEvent) => {
    createdListeners.forEach(cb => cb(data));
  });

  socket.on('task-updated', (data: TaskEvent) => {
    updatedListeners.forEach(cb => cb(data));
  });

  socket.on('task-deleted', (data: TaskEvent) => {
    deletedListeners.forEach(cb => cb(data));
  });

  socket.on('task-assigned', (data: TaskEvent) => {
    assignedListeners.forEach(cb => cb(data));
  });


  socket.on('connect', () => {
    joinedProjects.forEach(projectId => {
      socket?.emit('join-project', projectId);
    });
  });

  return socket;
}

export function disconnectTaskSocket() {
  socket?.disconnect();
  socket = null;
  joinedProjects.clear();
}

export function getTaskSocket(): Socket | null {
  return socket;
}

/** Join a project room to receive its task events */
export function joinProject(projectId: string) {
  joinedProjects.add(projectId);
  socket?.emit('join-project', projectId);
}

/** Leave a project room */
export function leaveProject(projectId: string) {
  joinedProjects.delete(projectId);
  socket?.emit('leave-project', projectId);
}



export function onTaskCreated(cb: TaskEventCallback) {
  createdListeners.add(cb);
  return () => { createdListeners.delete(cb); };
}

export function onTaskUpdated(cb: TaskEventCallback) {
  updatedListeners.add(cb);
  return () => { updatedListeners.delete(cb); };
}

export function onTaskDeleted(cb: TaskEventCallback) {
  deletedListeners.add(cb);
  return () => { deletedListeners.delete(cb); };
}

export function onTaskAssigned(cb: TaskEventCallback) {
  assignedListeners.add(cb);
  return () => { assignedListeners.delete(cb); };
}
