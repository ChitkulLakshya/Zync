export interface ArchitectureNode {
  id: string;
  type: 'service' | 'database' | 'frontend' | 'external';
  label: string;
  sublabel?: string;
  status?: 'healthy' | 'degraded' | 'down';
  techStack?: string;
  icon?: string;
  tasks?: number;
  teamMembers?: string[];
  repoUrl?: string;
}

export interface ArchitectureEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
}

export interface ArchitectureDiagram {
  name: string;
  description: string;
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
}

export const mockArchitectureData: ArchitectureDiagram = {
  name: 'Zync Platform Architecture',
  description: 'Microservices architecture for the Zync collaboration platform',
  nodes: [
    {
      id: 'frontend',
      type: 'frontend',
      label: 'Next.js Frontend',
      sublabel: 'Vercel · SSR/SSG',
      status: 'healthy',
      techStack: 'React, TypeScript, Tailwind',
      icon: '🌐',
      tasks: 12,
      teamMembers: ['alice', 'bob'],
      repoUrl: 'https://github.com/zync-meet/Zync',
    },
    {
      id: 'api-gateway',
      type: 'service',
      label: 'API Gateway',
      sublabel: 'Express.js · Port 5000',
      status: 'healthy',
      techStack: 'Node.js, Express',
      icon: '🚪',
      tasks: 5,
      teamMembers: ['charlie'],
      repoUrl: 'https://github.com/zync-meet/Zync',
    },
    {
      id: 'auth-service',
      type: 'service',
      label: 'Auth Service',
      sublabel: 'Firebase Auth',
      status: 'healthy',
      techStack: 'Firebase Auth, JWT',
      icon: '🔐',
      tasks: 3,
      teamMembers: ['dave'],
      repoUrl: 'https://github.com/zync-meet/Zync',
    },
    {
      id: 'chat-service',
      type: 'service',
      label: 'Chat Service',
      sublabel: 'WebSocket · Real-time',
      status: 'healthy',
      techStack: 'Node.js, Socket.io',
      icon: '💬',
      tasks: 8,
      teamMembers: ['eve', 'frank'],
      repoUrl: 'https://github.com/zync-meet/Zync',
    },
    {
      id: 'task-service',
      type: 'service',
      label: 'Task Service',
      sublabel: 'REST API · CRUD',
      status: 'degraded',
      techStack: 'Node.js, Express',
      icon: '✅',
      tasks: 15,
      teamMembers: ['grace'],
      repoUrl: 'https://github.com/zync-meet/Zync',
    },
    {
      id: 'team-service',
      type: 'service',
      label: 'Team Service',
      sublabel: 'Team management & sync',
      status: 'healthy',
      techStack: 'Node.js, Firebase Firestore',
      icon: '👥',
      tasks: 6,
      teamMembers: ['heidi'],
      repoUrl: 'https://github.com/zync-meet/Zync',
    },
    {
      id: 'ai-service',
      type: 'service',
      label: 'AI Service',
      sublabel: 'Gemini · GROQ · LLM',
      status: 'healthy',
      techStack: 'Python, FastAPI',
      icon: '🤖',
      tasks: 4,
      teamMembers: ['ivan'],
      repoUrl: 'https://github.com/zync-meet/Zync',
    },
    {
      id: 'postgres',
      type: 'database',
      label: 'PostgreSQL',
      sublabel: 'Primary DB · ORDS',
      status: 'healthy',
      techStack: 'PostgreSQL, Prisma',
      icon: '🗄️',
      tasks: 2,
      teamMembers: ['judy'],
    },
    {
      id: 'redis',
      type: 'database',
      label: 'Redis',
      sublabel: 'Cache · Sessions',
      status: 'healthy',
      techStack: 'Redis, ioredis',
      icon: '⚡',
      tasks: 1,
      teamMembers: ['judy'],
    },
    {
      id: 'cloudinary',
      type: 'external',
      label: 'Cloudinary',
      sublabel: 'Media Storage · CDN',
      status: 'healthy',
      techStack: 'Cloudinary API',
      icon: '☁️',
    },
    {
      id: 'github',
      type: 'external',
      label: 'GitHub',
      sublabel: 'Repo · Webhooks · Actions',
      status: 'healthy',
      techStack: 'GitHub API, GraphQL',
      icon: '🐙',
    },
    {
      id: 'firebase',
      type: 'external',
      label: 'Firebase',
      sublabel: 'Auth · Firestore · FCM',
      status: 'healthy',
      techStack: 'Firebase SDK',
      icon: '🔥',
    },
  ],
  edges: [
    { id: 'e1', source: 'frontend', target: 'api-gateway', label: 'HTTP/REST', animated: true },
    { id: 'e2', source: 'frontend', target: 'chat-service', label: 'WebSocket', animated: true },
    { id: 'e3', source: 'api-gateway', target: 'auth-service', label: 'Verify Token', animated: false },
    { id: 'e4', source: 'api-gateway', target: 'task-service', label: 'REST', animated: false },
    { id: 'e5', source: 'api-gateway', target: 'team-service', label: 'REST', animated: false },
    { id: 'e6', source: 'api-gateway', target: 'ai-service', label: 'REST', animated: false },
    { id: 'e7', source: 'chat-service', target: 'redis', label: 'Pub/Sub', animated: true },
    { id: 'e8', source: 'task-service', target: 'postgres', label: 'Queries', animated: false },
    { id: 'e9', source: 'team-service', target: 'postgres', label: 'Queries', animated: false },
    { id: 'e10', source: 'team-service', target: 'firebase', label: 'Sync', animated: false },
    { id: 'e11', source: 'ai-service', target: 'postgres', label: 'Read/Write', animated: false },
    { id: 'e12', source: 'ai-service', target: 'github', label: 'Webhooks', animated: false },
    { id: 'e13', source: 'api-gateway', target: 'cloudinary', label: 'Upload', animated: false },
    { id: 'e14', source: 'auth-service', target: 'firebase', label: 'Auth', animated: false },
    { id: 'e15', source: 'chat-service', target: 'postgres', label: 'Persist', animated: false },
  ],
};