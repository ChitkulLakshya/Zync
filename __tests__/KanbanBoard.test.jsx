/**
 * @jest-environment jsdom
 */
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, onClick, ...props }) => <div onClick={onClick} {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }) => <span className={className}>{children}</span>,
}));

jest.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, className }) => <div className={className}>{children}</div>,
  AvatarImage: () => null,
  AvatarFallback: ({ children, className }) => <span className={className}>{children}</span>,
}));

jest.mock('@/components/workspace/TaskDetailDialog', () => {
  return function MockDialog({ open, onOpenChange }) {
    return open ? <div data-testid="task-detail-dialog" onClick={() => onOpenChange(false)} /> : null;
  };
});

jest.mock('date-fns', () => ({
  format: jest.fn(() => '1 Jan 2026'),
  formatDistanceToNow: jest.fn(() => '2 days ago'),
  isToday: jest.fn(() => false),
  isYesterday: jest.fn(() => false),
}));

const { render, screen, fireEvent } = require('@testing-library/react');
const React = require('react');
const KanbanBoard = require('@/components/workspace/KanbanBoard').default;

const makeTask = (overrides = {}) => ({
  _id: 'task-' + Math.random().toString(36).slice(2, 8),
  id: 'task-' + Math.random().toString(36).slice(2, 8),
  title: 'Test Task',
  status: 'Ready',
  assignedTo: 'user-1',
  assignedToName: 'User One',
  ...overrides,
});

const makeStep = (tasks = []) => ({
  _id: 'step-1',
  id: 'step-1',
  title: 'Backlog',
  tasks,
});

const defaultProps = (overrides = {}) => ({
  steps: [],
  onUpdateTask: jest.fn(),
  users: [{ uid: 'user-1', displayName: 'User One', email: 'u@t.com' }],
  isOwner: true,
  currentUser: { uid: 'user-1' },
  ...overrides,
});

// F1: renders 5 columns
test('F1: renders all 5 Kanban columns', () => {
  render(<KanbanBoard {...defaultProps()} />);
  expect(screen.getByText('Ready')).toBeTruthy();
  expect(screen.getByText('Active')).toBeTruthy();
  expect(screen.getByText('In Progress')).toBeTruthy();
  expect(screen.getByText('Done')).toBeTruthy();
  expect(screen.getByText('PR Raised')).toBeTruthy();
});

// F2: maps Pending → Ready (legacy fallback)
test('F2: maps Pending status to Ready column', () => {
  const task = makeTask({ status: 'Pending' });
  const step = makeStep([task]);
  render(<KanbanBoard {...defaultProps({ steps: [step] })} />);
  const readyColumn = screen.getByText('Ready').closest('div.flex.flex-col');
  expect(readyColumn.textContent).toContain('Test Task');
});

// F3: maps Completed → Done
test('F3: maps Completed status to Done column', () => {
  const task = makeTask({ status: 'Completed', title: 'Completed Task' });
  const step = makeStep([task]);
  render(<KanbanBoard {...defaultProps({ steps: [step] })} />);
  const doneColumn = screen.getByText('Done').closest('div.flex.flex-col');
  expect(doneColumn.textContent).toContain('Completed Task');
});

// F4: clicking Ready task as assignee calls onUpdateTask with Active
test('F4: clicking Ready task as assignee auto-updates to Active', () => {
  const task = makeTask({ status: 'Ready', _id: 't1', id: 't1' });
  const step = makeStep([task]);
  const onUpdateTask = jest.fn();
  render(<KanbanBoard {...defaultProps({ steps: [step], onUpdateTask })} />);
  fireEvent.click(screen.getByText('Test Task'));
  expect(onUpdateTask).toHaveBeenCalledWith('step-1', 't1', { status: 'Active' });
});

// F5: clicking Ready task as non-assignee does NOT call onUpdateTask
test('F5: clicking Ready task as non-assignee does not auto-update', () => {
  const task = makeTask({ status: 'Ready', _id: 't2', id: 't2', assignedTo: 'other-user' });
  const step = makeStep([task]);
  const onUpdateTask = jest.fn();
  render(<KanbanBoard {...defaultProps({ steps: [step], onUpdateTask, currentUser: { uid: 'user-1' } })} />);
  fireEvent.click(screen.getByText('Test Task'));
  expect(onUpdateTask).not.toHaveBeenCalled();
});

// F6: clicking non-Ready task does NOT call onUpdateTask
test('F6: clicking In Progress task does not auto-update', () => {
  const task = makeTask({ status: 'In Progress', _id: 't3', id: 't3' });
  const step = makeStep([task]);
  const onUpdateTask = jest.fn();
  render(<KanbanBoard {...defaultProps({ steps: [step], onUpdateTask })} />);
  fireEvent.click(screen.getByText('Test Task'));
  expect(onUpdateTask).not.toHaveBeenCalled();
});

// F7: column count badges reflect task counts
test('F7: column badges show correct task counts', () => {
  const tasks = [
    makeTask({ status: 'Ready', title: 'R1', _id: 'r1', id: 'r1' }),
    makeTask({ status: 'Done', title: 'D1', _id: 'd1', id: 'd1' }),
    makeTask({ status: 'Done', title: 'D2', _id: 'd2', id: 'd2' }),
  ];
  const step = makeStep(tasks);
  render(<KanbanBoard {...defaultProps({ steps: [step] })} />);
  const badges = screen.getAllByText(/^[0-9]+$/);
  const counts = badges.map(b => parseInt(b.textContent, 10));
  expect(counts).toContain(1); // Ready: 1
  expect(counts).toContain(2); // Done: 2
});
