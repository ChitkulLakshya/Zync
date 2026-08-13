jest.mock('socket.io-client', () => {
  const handlers = {};
  const mockSocket = {
    connected: false,
    on: jest.fn((event, cb) => { handlers[event] = cb; }),
    emit: jest.fn(),
    disconnect: jest.fn(() => { mockSocket.connected = false; }),
    _fire: (event, data) => handlers[event]?.(data),
    _setConnected: (val) => { mockSocket.connected = val; },
  };
  return { io: jest.fn(() => mockSocket), __mockSocket: mockSocket };
});

jest.mock('@/lib/utils', () => ({ SOCKET_BASE_URL: 'http://localhost:3000' }));

const { io, __mockSocket } = require('socket.io-client');
const {
  connectTaskSocket,
  disconnectTaskSocket,
  getTaskSocket,
  joinProject,
  leaveProject,
  onTaskCreated,
  onTaskUpdated,
  onTaskDeleted,
  onTaskAssigned,
} = require('@/services/taskSocketService');

beforeEach(() => {
  jest.clearAllMocks();
  __mockSocket.connected = false;
  disconnectTaskSocket();
});

afterEach(() => {
  disconnectTaskSocket();
});

// F8: connectTaskSocket creates socket connection
test('F8: connectTaskSocket creates socket with /tasks namespace', () => {
  const sock = connectTaskSocket('user-1');
  expect(io).toHaveBeenCalledWith('http://localhost:3000/tasks', expect.objectContaining({
    query: { userId: 'user-1' },
    transports: ['websocket', 'polling'],
  }));
  expect(sock).toBe(__mockSocket);
});

// F9: connectTaskSocket is idempotent when already connected
test('F9: connectTaskSocket returns existing socket when already connected', () => {
  __mockSocket._setConnected(true);
  const sock1 = connectTaskSocket('user-1');
  const sock2 = connectTaskSocket('user-1');
  expect(io).toHaveBeenCalledTimes(1);
  expect(sock1).toBe(sock2);
});

// F10: onTaskCreated fires callback on task-created event
test('F10: onTaskCreated callback fires when task-created event received', () => {
  connectTaskSocket('user-1');
  const cb = jest.fn();
  onTaskCreated(cb);
  __mockSocket._fire('task-created', { projectId: 'p1', taskId: 't1' });
  expect(cb).toHaveBeenCalledWith({ projectId: 'p1', taskId: 't1' });
});

// F11: onTaskUpdated fires callback
test('F11: onTaskUpdated callback fires on task-updated event', () => {
  connectTaskSocket('user-1');
  const cb = jest.fn();
  onTaskUpdated(cb);
  __mockSocket._fire('task-updated', { projectId: 'p1', taskId: 't2', changes: { status: 'Done' } });
  expect(cb).toHaveBeenCalledWith({ projectId: 'p1', taskId: 't2', changes: { status: 'Done' } });
});

// F12: onTaskDeleted fires callback
test('F12: onTaskDeleted callback fires on task-deleted event', () => {
  connectTaskSocket('user-1');
  const cb = jest.fn();
  onTaskDeleted(cb);
  __mockSocket._fire('task-deleted', { projectId: 'p1', taskId: 't3' });
  expect(cb).toHaveBeenCalledWith({ projectId: 'p1', taskId: 't3' });
});

// F13: onTaskAssigned fires callback
test('F13: onTaskAssigned callback fires on task-assigned event', () => {
  connectTaskSocket('user-1');
  const cb = jest.fn();
  onTaskAssigned(cb);
  __mockSocket._fire('task-assigned', { projectId: 'p1', taskId: 't4' });
  expect(cb).toHaveBeenCalledWith({ projectId: 'p1', taskId: 't4' });
});

// F14: unsubscribe removes callback
test('F14: unsubscribe function removes callback from listeners', () => {
  connectTaskSocket('user-1');
  const cb = jest.fn();
  const unsub = onTaskCreated(cb);
  unsub();
  __mockSocket._fire('task-created', { projectId: 'p1' });
  expect(cb).not.toHaveBeenCalled();
});

// F15: joinProject emits join-project event
test('F15: joinProject emits join-project on socket', () => {
  connectTaskSocket('user-1');
  joinProject('proj-123');
  expect(__mockSocket.emit).toHaveBeenCalledWith('join-project', 'proj-123');
});

// F16: leaveProject emits leave-project event
test('F16: leaveProject emits leave-project on socket', () => {
  connectTaskSocket('user-1');
  joinProject('proj-123');
  leaveProject('proj-123');
  expect(__mockSocket.emit).toHaveBeenCalledWith('leave-project', 'proj-123');
});

// F17: disconnectTaskSocket clears socket and disconnects
test('F17: disconnectTaskSocket disconnects and clears state', () => {
  connectTaskSocket('user-1');
  joinProject('p1');
  disconnectTaskSocket();
  expect(__mockSocket.disconnect).toHaveBeenCalled();
  expect(getTaskSocket()).toBeNull();
});

// F18: reconnect re-joins previously joined projects
test('F18: on reconnect, previously joined projects are re-joined', () => {
  connectTaskSocket('user-1');
  joinProject('proj-a');
  joinProject('proj-b');
  __mockSocket.emit.mockClear();
  __mockSocket._fire('connect', {});
  expect(__mockSocket.emit).toHaveBeenCalledWith('join-project', 'proj-a');
  expect(__mockSocket.emit).toHaveBeenCalledWith('join-project', 'proj-b');
});
