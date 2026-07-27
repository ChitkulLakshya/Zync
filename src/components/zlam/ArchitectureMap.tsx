import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
} from '@xyflow/react';
import ELK from 'elkjs/lib/elk.bundled.js';
import '@xyflow/react/dist/style.css';
import { mockArchitectureData } from './mockArchitectureData';
import LiquidGlassNode from './LiquidGlassNode';
import type { ArchitectureNode, ArchitectureEdge, ArchitectureDiagram } from './mockArchitectureData';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/lib/utils';

const STORAGE_KEY = 'zync-zlam-diagram';

const getStorageKey = (projectId?: string) => {
  if (!projectId) return STORAGE_KEY;
  return `${STORAGE_KEY}-${projectId}`;
};

const nodeTypes = {
  liquidGlass: LiquidGlassNode,
};

const elk = new ELK();

const nodePaletteItems = [
  { type: 'service', label: 'Service', icon: '🛠️', color: '#10b981' },
  { type: 'database', label: 'Database', icon: '🗄️', color: '#3b82f6' },
  { type: 'frontend', label: 'Frontend', icon: '🌐', color: '#8b5cf6' },
  { type: 'external', label: 'External', icon: '☁️', color: '#6b7280' },
];

const splitTechStack = (raw: string): string[] => {
  if (!raw) return [];
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];
    if (char === '(') depth++;
    if (char === ')') depth--;
    if (char === ',' && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
};

const normalizeTechValue = (raw: string): string | null => {
  const text = String(raw)
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-zA-Z0-9+.# -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text || text.length < 2) return null;
  if (/^(and|or|the|for|with|without|using|via|including|excluding|likely|potentially|complementing)$/i.test(text)) return null;
  return text;
};

const convertBackendArchitectureToDiagram = (arch: any, projectName: string): ArchitectureDiagram => {
  if (!arch || typeof arch !== 'object') {
    return {
      name: `${projectName} Architecture`,
      description: 'Generated architecture diagram',
      nodes: [],
      edges: [],
    };
  }

  const nodes: ArchitectureNode[] = [];
  const edges: ArchitectureEdge[] = [];
  let idCounter = 0;

  const addNode = (label: string, type: ArchitectureNode['type'], sublabel?: string, status: ArchitectureNode['status'] = 'healthy', techStack?: string) => {
    const id = `node-${idCounter++}`;
    nodes.push({ id, type, label, sublabel, status, techStack });
    return id;
  };

  const highLevel = (arch.highLevel || '').toString();

  const frontendId = addNode('Frontend', 'frontend', arch.frontend?.structure || 'Client application', 'healthy', Array.isArray(arch.integrations) ? arch.integrations.map((i: string) => normalizeTechValue(i)).filter(Boolean).join(', ') : undefined);
  const backendId = addNode('Backend', 'service', arch.backend?.structure || 'API server', 'healthy', Array.isArray(arch.backend?.services) ? arch.backend.services.map((s: string) => normalizeTechValue(s)).filter(Boolean).join(', ') : (Array.isArray(arch.integrations) ? arch.integrations.map((i: string) => normalizeTechValue(i)).filter(Boolean).join(', ') : undefined));
  const databaseId = addNode('Database', 'database', arch.database?.design || 'Primary datastore', 'healthy', Array.isArray(arch.database?.collections) ? arch.database.collections.map((c: string) => normalizeTechValue(c)).filter(Boolean).join(', ') : undefined);

  edges.push(
    { id: `e-${idCounter++}`, source: frontendId, target: backendId, label: 'API calls', animated: true },
    { id: `e-${idCounter++}`, source: backendId, target: databaseId, label: 'Data access', animated: false }
  );

  if (Array.isArray(arch.integrations)) {
    arch.integrations.forEach((integration: string) => {
      const raw = String(integration).trim();
      const name = normalizeTechValue(raw);
      if (!name) {return;}
      const externalId = addNode(name, 'external', 'Integration', 'healthy', name);
      edges.push({ id: `e-${idCounter++}`, source: backendId, target: externalId, label: 'Integration', animated: false });
    });
  }

  if (Array.isArray(arch.backend?.services)) {
    arch.backend.services.forEach((service: string) => {
      const raw = String(service).trim();
      const name = normalizeTechValue(raw);
      if (!name || name.toLowerCase() === (arch.backend?.structure || '').toLowerCase()) {return;}
      const serviceId = addNode(name, 'service', 'Backend service', 'healthy', name);
      edges.push({ id: `e-${idCounter++}`, source: backendId, target: serviceId, label: 'Internal', animated: false });
    });
  }

  if (Array.isArray(arch.database?.collections)) {
    arch.database.collections.forEach((collection: string) => {
      const raw = String(collection).trim();
      const name = normalizeTechValue(raw);
      if (!name) {return;}
      const collectionId = addNode(name, 'database', 'Collection / table', 'healthy', name);
      edges.push({ id: `e-${idCounter++}`, source: databaseId, target: collectionId, label: 'Stores', animated: false });
    });
  }

  return {
    name: `${projectName} Architecture`,
    description: highLevel || 'Generated architecture diagram',
    nodes,
    edges,
  };
};

type FlowPositionFn = (clientPos: { x: number; y: number }) => { x: number; y: number };

const getLayoutedElements = async (
  nodes: Node[],
  edges: Edge[],
  direction = 'DOWN'
): Promise<{ nodes: Node[]; edges: Edge[] }> => {
  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.layered.spacing.nodeNodeBetweenLayers': '80',
      'elk.spacing.nodeNode': '60',
      'elk.direction': direction,
    },
    children: nodes.map((node) => ({
      id: node.id,
      width: node.width ?? 200,
      height: node.height ?? 80,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  try {
    const layoutedGraph = await elk.layout(graph);
    const layoutedChildren = layoutedGraph.children ?? [];
    const layoutedNodes = nodes.map((node) => {
      const layoutedChild = layoutedChildren.find((c: any) => c.id === node.id);
      if (layoutedChild) {
        return {
          ...node,
          position: { x: layoutedChild.x ?? 0, y: layoutedChild.y ?? 0 },
        };
      }
      return node;
    });

    return { nodes: layoutedNodes, edges };
  } catch (error) {
    console.error('ELK layout failed, using default positions:', error);
    return { nodes, edges };
  }
};

const saveToStorage = (nodes: Node[], edges: Edge[], projectId?: string) => {
  try {
    const safeNodes = (nodes || []).filter((node) => node && node.id);
    const data: ArchitectureDiagram = {
      name: 'Zync Platform Architecture',
      description: 'User-edited architecture diagram',
      nodes: safeNodes.map((node) => {
        const data = (node.data || {}) as any;
        return {
          id: node.id,
          type: data?.type || 'service',
          label: data?.label || node.id,
          sublabel: data?.sublabel,
          status: data?.status,
          techStack: data?.techStack,
          icon: data?.icon,
          tasks: data?.tasks,
          teamMembers: data?.teamMembers,
        };
      }),
      edges: (edges || []).map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: typeof edge.label === 'string' ? edge.label : undefined,
        animated: edge.animated,
      })),
    };
    localStorage.setItem(getStorageKey(projectId), JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save diagram:', e);
  }
};

const loadFromStorage = (projectId?: string): ArchitectureDiagram | null => {
  try {
    const raw = localStorage.getItem(getStorageKey(projectId));
    if (!raw) {return null;}
    return JSON.parse(raw) as ArchitectureDiagram;
  } catch (e) {
    console.error('Failed to load diagram:', e);
    return null;
  }
};

const normalizeFlowNodes = (nodes: any[]): Node[] => {
  return (nodes || [])
    .filter((node) => node && node.id)
    .map((node, index) => ({
      id: node.id,
      type: 'liquidGlass',
      position: { x: (index % 4) * 280, y: Math.floor(index / 4) * 220 },
      data: {
        label: node.label || node.id,
        sublabel: node.sublabel,
        status: node.status || 'healthy',
        techStack: node.techStack ? splitTechStack(node.techStack).map((t: string) => normalizeTechValue(t)).filter(Boolean).join(', ') : undefined,
        icon: node.icon,
        tasks: node.tasks,
        teamMembers: node.teamMembers,
        type: node.type || 'service',
      },
    }));
};

const normalizeFlowEdges = (edges: any[]): Edge[] => {
  return (edges || [])
    .filter((edge) => edge && edge.id && edge.source && edge.target)
    .map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: typeof edge.label === 'string' ? edge.label : undefined,
      animated: edge.animated,
      type: 'smoothstep',
    }));
};

const NodePalette: React.FC<{ onAddNode: (type: string) => void }> = ({ onAddNode }) => {
  const [dragType, setDragType] = useState<string | null>(null);

  return (
    <div className="w-44 p-3 bg-surface-glass-regular backdrop-blur-regular rounded-xl border border-border/50 shadow-md flex flex-col gap-1 shrink-0 overflow-y-auto">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Components</h3>
      {nodePaletteItems.map((item) => (
        <div
          key={item.type}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('application/reactflow', item.type);
            e.dataTransfer.effectAllowed = 'move';
            setDragType(item.type);
          }}
          onDragEnd={() => setDragType(null)}
          className={`flex items-center gap-2 p-2 rounded-lg cursor-grab border border-border/30 transition-colors text-xs ${
            dragType === item.type ? 'bg-primary/10 border-primary/50' : 'bg-background/50 hover:bg-secondary/50'
          }`}
        >
          <span className="text-sm">{item.icon}</span>
          <span className="font-medium">{item.label}</span>
        </div>
      ))}
      <div className="mt-2 pt-2 border-t border-border/30">
        <p className="text-[10px] text-muted-foreground">Drag components onto the canvas to add them.</p>
      </div>
    </div>
  );
};

const SelectedNodePanel: React.FC<{
  node: Node | null;
  onClose: () => void;
  onUpdate: (nodeId: string, data: Partial<Node['data']>) => void;
  onDelete: (nodeId: string) => void;
}> = ({ node, onClose, onUpdate, onDelete }) => {
  if (!node) {return null;}

  const data = node.data as any;

  return (
    <div className="w-72 p-4 bg-surface-glass-regular backdrop-blur-regular rounded-xl border border-border/50 shadow-md flex flex-col gap-3 shrink-0 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Properties</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-[10px] text-muted-foreground">Label</label>
        <input
          className="text-xs bg-background/50 border border-border/50 rounded-lg px-2 py-1.5 text-foreground"
          value={data.label || ''}
          onChange={(e) => onUpdate(node.id, { label: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-[10px] text-muted-foreground">Sublabel</label>
        <input
          className="text-xs bg-background/50 border border-border/50 rounded-lg px-2 py-1.5 text-foreground"
          value={data.sublabel || ''}
          onChange={(e) => onUpdate(node.id, { sublabel: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-[10px] text-muted-foreground">Tech Stack</label>
        <input
          className="text-xs bg-background/50 border border-border/50 rounded-lg px-2 py-1.5 text-foreground"
          value={data.techStack || ''}
          onChange={(e) => onUpdate(node.id, { techStack: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-[10px] text-muted-foreground">Status</label>
        <select
          className="text-xs bg-background/50 border border-border/50 rounded-lg px-2 py-1.5 text-foreground"
          value={data.status || 'healthy'}
          onChange={(e) => onUpdate(node.id, { status: e.target.value })}
        >
          <option value="healthy">Healthy</option>
          <option value="degraded">Degraded</option>
          <option value="down">Down</option>
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-[10px] text-muted-foreground">Tasks</label>
        <input
          type="number"
          min="0"
          className="text-xs bg-background/50 border border-border/50 rounded-lg px-2 py-1.5 text-foreground"
          value={data.tasks ?? 0}
          onChange={(e) => onUpdate(node.id, { tasks: parseInt(e.target.value || '0', 10) })}
        />
      </div>
      <div className="pt-2 border-t border-border/30">
        <button
          onClick={() => onDelete(node.id)}
          className="w-full text-xs text-destructive hover:bg-destructive/10 rounded-lg px-2 py-1.5 transition-colors"
        >
          Delete node
        </button>
      </div>
    </div>
  );
};

const EdgePanel: React.FC<{
  edge: Edge | null;
  onClose: () => void;
  onUpdate: (edgeId: string, data: Partial<Edge['data']>) => void;
  onDelete: (edgeId: string) => void;
}> = ({ edge, onClose, onUpdate, onDelete }) => {
  if (!edge) {return null;}

  const data = edge.data as any;

  return (
    <div className="w-64 p-4 bg-surface-glass-regular backdrop-blur-regular rounded-xl border border-border/50 shadow-md flex flex-col gap-3 shrink-0 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Edge</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-[10px] text-muted-foreground">Label</label>
        <input
          className="text-xs bg-background/50 border border-border/50 rounded-lg px-2 py-1.5 text-foreground"
          value={typeof data?.label === 'string' ? data.label : ''}
          onChange={(e) => onUpdate(edge.id, { label: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-muted-foreground">Source</span>
        <span className="text-xs text-foreground truncate">{edge.source}</span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-muted-foreground">Target</span>
        <span className="text-xs text-foreground truncate">{edge.target}</span>
      </div>
      <div className="pt-2 border-t border-border/30">
        <button
          onClick={() => onDelete(edge.id)}
          className="w-full text-xs text-destructive hover:bg-destructive/10 rounded-lg px-2 py-1.5 transition-colors"
        >
          Delete edge
        </button>
      </div>
    </div>
  );
};

const SearchPanel: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  return (
    <div className="p-2 bg-surface-glass-regular backdrop-blur-regular rounded-lg border border-border/50 shadow-md">
      <input
        type="text"
        placeholder="Search nodes..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-xs bg-background/50 border border-border/50 rounded-md px-2 py-1.5 text-foreground w-40 placeholder:text-muted-foreground"
      />
    </div>
  );
};

const ArchitectureMap: React.FC<{ project?: any }> = ({ project }) => {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const { toast } = useToast();

  const projectId = project?._id || project?.id;

  const initialData = useMemo(() => {
    const saved = loadFromStorage(projectId);
    if (saved && saved.nodes && saved.nodes.length > 0) {
      return saved;
    }
    if (project?.architecture && project.architecture.highLevel) {
      return convertBackendArchitectureToDiagram(project.architecture, project.name || 'Project');
    }
    return mockArchitectureData;
  }, [project]);

  useEffect(() => {
    if (!projectId) {return;}

    let cancelled = false;
    const fetchProjectArchitecture = async () => {
      setLoading(true);
      try {
        const token = await (await import('@/lib/firebase')).auth.currentUser?.getIdToken?.();
        if (!token) {throw new Error('No auth token');}

        const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {throw new Error(`Failed to fetch project: ${res.status}`);}

        const projectData = await res.json();
        if (cancelled) {return;}

        const architecture = projectData?.architecture;
        if (architecture && architecture.highLevel) {
          const converted = convertBackendArchitectureToDiagram(architecture, projectData?.name || 'Project');
          setNodesTyped(normalizeFlowNodes(converted.nodes));
          setEdgesTyped(normalizeFlowEdges(converted.edges));
          localStorage.setItem(getStorageKey(projectId), JSON.stringify(converted));
          toast({ title: 'Architecture loaded', description: 'Project-specific architecture loaded successfully' });
        } else if (projectData?.githubRepoName && projectData?.githubRepoOwner) {
          setAnalyzing(true);
          try {
            const token = await (await import('@/lib/firebase')).auth.currentUser?.getIdToken?.();
            if (!token) throw new Error('No auth token');
            const provider = 'kilo';
            const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/analyze-architecture?provider=${provider}&forceRefresh=true`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });
            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              throw new Error(err?.error || err?.message || `Analysis failed with status ${res.status}`);
            }
            const analyzedProject = await res.json();
            const analyzedArch = analyzedProject?.architecture;
            if (analyzedArch && analyzedArch.highLevel) {
              const converted = convertBackendArchitectureToDiagram(analyzedArch, analyzedProject?.name || 'Project');
              setNodesTyped(normalizeFlowNodes(converted.nodes));
              setEdgesTyped(normalizeFlowEdges(converted.edges));
              localStorage.setItem(getStorageKey(projectId), JSON.stringify(converted));
              toast({ title: 'Analysis complete', description: 'Architecture diagram generated from repo analysis.' });
            } else {
              toast({ title: 'No architecture found', description: 'Analysis did not return architecture data.', variant: 'destructive' });
            }
          } catch (error: any) {
            console.error('Auto architecture analysis failed:', error);
            toast({ title: 'Analysis failed', description: error?.message || 'Could not analyze architecture.', variant: 'destructive' });
          } finally {
            if (!cancelled) setAnalyzing(false);
          }
        }
      } catch (error: any) {
        if (!cancelled) {
          console.error('Failed to load project architecture:', error);
          toast({
            title: 'Load failed',
            description: 'Could not load architecture for this project.',
            variant: 'destructive',
          });
        }
      } finally {
        if (!cancelled) {setLoading(false);}
      }
    };

    fetchProjectArchitecture();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const handleAnalyzeArchitecture = useCallback(async () => {
    if (!projectId) {return;}
    setAnalyzing(true);
    try {
      const token = await (await import('@/lib/firebase')).auth.currentUser?.getIdToken?.();
      if (!token) {throw new Error('No auth token');}

      const provider = 'kilo';
      const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/analyze-architecture?provider=${provider}&forceRefresh=true`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const message = err?.error || err?.message || `Analysis failed with status ${res.status}`;
        throw new Error(message);
      }

      const projectData = await res.json();
      const architecture = projectData?.architecture;
      if (architecture && architecture.highLevel) {
        const converted = convertBackendArchitectureToDiagram(architecture, projectData?.name || 'Project');
        setNodesTyped(normalizeFlowNodes(converted.nodes));
        setEdgesTyped(normalizeFlowEdges(converted.edges));
        localStorage.setItem(getStorageKey(projectId), JSON.stringify(converted));
        toast({ title: 'Analysis complete', description: 'Architecture diagram updated from repo analysis.' });
      } else {
        toast({
          title: 'No architecture found',
          description: 'Analysis did not return architecture data.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Architecture analysis failed:', error);
      toast({
        title: 'Analysis failed',
        description: error?.message || 'Could not analyze architecture.',
        variant: 'destructive',
      });
    } finally {
      setAnalyzing(false);
    }
  }, [projectId]);

  const initialNodes = useMemo(
    () => normalizeFlowNodes(initialData.nodes),
    [initialData]
  );

  const initialEdges = useMemo(
    () => normalizeFlowEdges(initialData.edges),
    [initialData]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const setNodesTyped = useCallback((updater: any) => {
    setNodes(updater);
  }, [setNodes]);

  const setEdgesTyped = useCallback((updater: any) => {
    setEdges(updater);
  }, [setEdges]);

  useEffect(() => {
    saveToStorage(nodes, edges, projectId);
  }, [nodes, edges]);

  useEffect(() => {
    const techs = nodes
      .map((n) => (n.data as any)?.techStack)
      .filter(Boolean)
      .reduce<string[]>((acc, tech) => {
        const parts = String(tech).split(',').map((p) => p.trim()).filter(Boolean);
        parts.forEach((part) => { if (!acc.includes(part)) acc.push(part); });
        return acc;
      }, []);
    console.log('[ArchitectureMap] Loaded tech values:', techs);
  }, [nodes]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setNodesTyped((nds: Node[]) => nds.map((n) => ({ ...n, style: undefined })));
      return;
    }
    const term = searchTerm.toLowerCase();
    setNodesTyped((nds: Node[]) =>
      nds.map((n) => {
        const data = n.data as any;
        const matches =
          (data?.label?.toLowerCase().includes(term)) ||
          (data?.sublabel?.toLowerCase().includes(term)) ||
          (data?.techStack?.toLowerCase().includes(term)) ||
          (n.id?.toLowerCase().includes(term));
        return { ...n, style: { opacity: matches ? 1 : 0.2, transition: 'opacity 0.2s' } };
      })
    );
  }, [searchTerm, setNodesTyped]);

  const historyRef = useRef<{
    undoStack: { nodes: Node[]; edges: Edge[] }[];
    redoStack: { nodes: Node[]; edges: Edge[] }[];
  }>({ undoStack: [], redoStack: [] });

  const snapshot = useCallback(() => {
    historyRef.current.undoStack.push({ nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) });
    if (historyRef.current.undoStack.length > 50) {
      historyRef.current.undoStack.shift();
    }
    historyRef.current.redoStack = [];
  }, [nodes, edges]);

  const isValidConnection = useCallback(
    (connection: any) => {
      const source = connection?.source;
      const target = connection?.target;
      if (!source || !target) {return false;}
      if (source === target) {return false;}
      return !edges.some((e) => e.source === source && e.target === target);
    },
    [edges]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      snapshot();
      setEdgesTyped((eds: Edge[]) => addEdge(params, eds));
    },
    [setEdgesTyped, snapshot, isValidConnection]
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) {return;}

      const converter = flowInstanceRef.current?.screenToFlowPosition;
      if (typeof converter !== 'function') {return;}

      let position: { x: number; y: number } | undefined;
      try {
        position = converter({ x: event.clientX, y: event.clientY });
      } catch {
        position = undefined;
      }
      if (!position) {return;}

      const paletteItem = nodePaletteItems.find((item) => item.type === type);
      snapshot();
      const newNode: Node = {
        id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: 'liquidGlass',
        position,
        data: {
          label: `${paletteItem?.label || type} Node`,
          sublabel: '',
          status: 'healthy',
          techStack: '',
          icon: paletteItem?.icon || '📦',
          tasks: 0,
          teamMembers: [],
          type: type,
        },
      };

      setNodesTyped((nds: Node[]) => [...nds, newNode as Node]);
    },
    [setNodesTyped, snapshot]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      snapshot();
      const deletedIds = new Set(deleted.map((n) => n.id));
      setEdgesTyped((eds: Edge[]) => eds.filter((e: Edge) => !deletedIds.has(e.source) && !deletedIds.has(e.target)));
      setSelectedNode((prev) => (prev && deletedIds.has(prev.id) ? null : prev));
      setSelectedEdge((prev) => (prev && (deletedIds.has(prev.source) || deletedIds.has(prev.target)) ? null : prev));
    },
    [setEdgesTyped, snapshot]
  );

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      snapshot();
      setEdgesTyped((eds: Edge[]) => eds.filter((e: Edge) => !deleted.some((d: Edge) => d.id === e.id)));
      setSelectedEdge((prev) => (prev && deleted.some((d: Edge) => d.id === prev.id) ? null : prev));
    },
    [setEdgesTyped, snapshot]
  );

  const onLayout = useCallback(
    async (direction: string) => {
      snapshot();
      const layouted = await getLayoutedElements(nodes, edges, direction);
      setNodesTyped(layouted.nodes as Node[]);
      setEdgesTyped(layouted.edges as Edge[]);
    },
    [nodes, edges, setNodesTyped, setEdgesTyped]
  );

  const handleReset = useCallback(() => {
    snapshot();
    localStorage.removeItem(getStorageKey(projectId));
    setNodesTyped(normalizeFlowNodes(mockArchitectureData.nodes));
    setEdgesTyped(normalizeFlowEdges(mockArchitectureData.edges));
    setSelectedNode(null);
    setSelectedEdge(null);
    toast({ title: 'Reset', description: 'Diagram reset to default layout.' });
  }, [setNodesTyped, setEdgesTyped, toast]);

  const handleAddNode = useCallback(
    (type: string) => {
      snapshot();
      const paletteItem = nodePaletteItems.find((item) => item.type === type);
      const newNode: Node = {
        id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: 'liquidGlass',
        position: { x: 200 + Math.random() * 400, y: 200 + Math.random() * 300 },
        data: {
          label: `${paletteItem?.label || type} Node`,
          sublabel: '',
          status: 'healthy',
          techStack: '',
          icon: paletteItem?.icon || '📦',
          tasks: 0,
          teamMembers: [],
          type: type,
        },
      };
      setNodesTyped((nds: Node[]) => [...nds, newNode as Node]);
    },
    [setNodesTyped]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge);
  }, []);

  const updateNodeData = useCallback(
    (nodeId: string, data: Partial<Node['data']>) => {
      snapshot();
      setNodesTyped((nds: Node[]) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n))
      );
      setSelectedNode((prev) => (prev && prev.id === nodeId ? { ...prev, data: { ...prev.data, ...data } } : prev));
    },
    [setNodesTyped]
  );

  const deleteSelectedNode = useCallback(
    (nodeId: string) => {
      snapshot();
      setNodesTyped((nds: Node[]) => nds.filter((n) => n.id !== nodeId));
      setEdgesTyped((eds: Edge[]) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setSelectedNode(null);
      toast({ title: 'Deleted', description: 'Node removed from diagram.' });
    },
    [setNodesTyped, setEdgesTyped, toast]
  );

  const deleteSelectedEdge = useCallback(
    (edgeId: string) => {
      snapshot();
      setEdgesTyped((eds: Edge[]) => eds.filter((e) => e.id !== edgeId));
      setSelectedEdge(null);
      toast({ title: 'Deleted', description: 'Edge removed from diagram.' });
    },
    [setEdgesTyped, toast]
  );

  const handleExport = useCallback(() => {
    const data: ArchitectureDiagram = {
      name: 'Zync Platform Architecture',
      description: 'Exported architecture diagram',
      nodes: nodes.map((node) => ({
        id: node.id,
        type: (node.data as any).type || 'service',
        label: (node.data as any).label || node.id,
        sublabel: (node.data as any).sublabel,
        status: (node.data as any).status,
        techStack: (node.data as any).techStack,
        icon: (node.data as any).icon,
        tasks: (node.data as any).tasks,
        teamMembers: (node.data as any).teamMembers,
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: typeof edge.label === 'string' ? edge.label : undefined,
        animated: edge.animated,
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'architecture-diagram.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: 'Architecture diagram exported successfully.' });
  }, [nodes, edges, toast]);

  const handleImport = useCallback(() => {
    snapshot();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) {return;}
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const raw = JSON.parse(ev.target?.result as string) as ArchitectureDiagram;
          if (!raw.nodes || !Array.isArray(raw.nodes)) {
            alert('Invalid architecture file');
            return;
          }
          setNodesTyped(normalizeFlowNodes(raw.nodes));
          setEdgesTyped(normalizeFlowEdges(raw.edges || []));
          localStorage.setItem(getStorageKey(projectId), JSON.stringify(raw));
          setSelectedNode(null);
          setSelectedEdge(null);
          toast({ title: 'Imported', description: 'Architecture diagram imported successfully.' });
        } catch {
          toast({ title: 'Import Failed', description: 'Failed to parse architecture file.', variant: 'destructive' });
        }
      };
      reader.readAsText(file);
    };
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  }, [setNodesTyped, setEdgesTyped]);

  const handleUndo = useCallback(() => {
    const { undoStack, redoStack } = historyRef.current;
    if (undoStack.length === 0) {return;}
    const previous = undoStack.pop()!;
    redoStack.push({ nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) });
    setNodesTyped(previous.nodes);
    setEdgesTyped(previous.edges);
    setSelectedNode(null);
  }, [nodes, edges, setNodesTyped, setEdgesTyped]);

  const handleRedo = useCallback(() => {
    const { undoStack, redoStack } = historyRef.current;
    if (redoStack.length === 0) {return;}
    const next = redoStack.pop()!;
    undoStack.push({ nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) });
    setNodesTyped(next.nodes);
    setEdgesTyped(next.edges);
    setSelectedNode(null);
  }, [nodes, edges, setNodesTyped, setEdgesTyped]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.ctrlKey || e.metaKey;
      if (isMeta && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (isMeta && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (isMeta && e.key === 'e') {
        e.preventDefault();
        handleExport();
      } else if (isMeta && e.key === 'i') {
        e.preventDefault();
        handleImport();
      } else if (isMeta && e.key === 'f') {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo, handleExport, handleImport]);

  const flowInstanceRef = useRef<any>(null);

  const onInit = useCallback((instance: any) => {
    flowInstanceRef.current = instance;
    if (instance && instance.fitView) {
      instance.fitView({ padding: 0.2 });
    }
  }, []);

  const handleFitView = useCallback(() => {
    if (flowInstanceRef.current && flowInstanceRef.current.fitView) {
      flowInstanceRef.current.fitView({ padding: 0.2 });
    }
  }, []);

  const nodeCount = nodes.length;
  const edgeCount = edges.length;

  return (
    <div className="w-full h-full min-h-[600px] rounded-3xl border border-border/50 bg-transparent overflow-hidden flex relative">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Loading architecture...</span>
          </div>
        </div>
      )}
      {analyzing && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Analyzing repository...</span>
            <span className="text-xs">This may take a minute.</span>
          </div>
        </div>
      )}
      <NodePalette onAddNode={handleAddNode} />
      {selectedNode && (
        <SelectedNodePanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onUpdate={updateNodeData}
          onDelete={deleteSelectedNode}
        />
      )}
      {selectedEdge && !selectedNode && (
        <EdgePanel
          edge={selectedEdge}
          onClose={() => setSelectedEdge(null)}
          onUpdate={(edgeId, data) => {
            setEdgesTyped((eds: Edge[]) => eds.map((e) => e.id === edgeId ? { ...e, data: { ...e.data, ...data } } : e));
            setSelectedEdge((prev) => (prev && prev.id === edgeId ? { ...prev, data: { ...prev.data, ...data } } : prev));
          }}
          onDelete={deleteSelectedEdge}
        />
      )}
      <div className="flex-1 relative min-h-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodesDelete={onNodesDelete}
          onEdgesDelete={onEdgesDelete}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={onNodeDoubleClick}
          onEdgeClick={onEdgeClick}
          onNodeDragStop={() => snapshot()}
          isValidConnection={isValidConnection}
          onInit={onInit}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={2}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          deleteKeyCode={['Delete', 'Backspace']}
          className="h-full cursor-grab"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} className="opacity-30" />
          <Controls className="!bg-surface-glass-regular !backdrop-blur-regular !rounded-xl !border !border-border/50 !shadow-md" />
          <MiniMap
            className="!bg-surface-glass-regular !backdrop-blur-regular !rounded-xl !border !border-border/50 !shadow-md"
            nodeColor={(node) => {
              const data = node.data as any;
              if (data.type === 'database') {return '#3b82f6';}
              if (data.type === 'frontend') {return '#8b5cf6';}
              if (data.type === 'external') {return '#6b7280';}
              return '#10b981';
            }}
            maskColor="rgba(0, 0, 0, 0.5)"
          />
          <Panel position="top-right">
            <div className="flex gap-1">
              <button
                onClick={() => onLayout('DOWN')}
                className="px-2 py-1 text-xs bg-surface-glass-regular backdrop-blur-regular rounded-lg border border-border/50 hover:bg-surface-glass-thick transition-colors"
              >
                ↓ Layout
              </button>
              <button
                onClick={() => onLayout('RIGHT')}
                className="px-2 py-1 text-xs bg-surface-glass-regular backdrop-blur-regular rounded-lg border border-border/50 hover:bg-surface-glass-thick transition-colors"
              >
                → Layout
              </button>
              <button
                onClick={handleExport}
                className="px-2 py-1 text-xs bg-surface-glass-regular backdrop-blur-regular rounded-lg border border-border/50 hover:bg-surface-glass-thick transition-colors"
              >
                Export
              </button>
              <button
                onClick={handleImport}
                className="px-2 py-1 text-xs bg-surface-glass-regular backdrop-blur-regular rounded-lg border border-border/50 hover:bg-surface-glass-thick transition-colors"
              >
                Import
              </button>
              <button
                onClick={handleFitView}
                className="px-2 py-1 text-xs bg-surface-glass-regular backdrop-blur-regular rounded-lg border border-border/50 hover:bg-surface-glass-thick transition-colors"
              >
                ⊞ Fit
              </button>
              {projectId && (
                <button
                  onClick={handleAnalyzeArchitecture}
                  disabled={analyzing}
                  className="px-2 py-1 text-xs bg-surface-glass-regular backdrop-blur-regular rounded-lg border border-border/50 hover:bg-surface-glass-thick transition-colors disabled:opacity-60"
                >
                  {analyzing ? 'Analyzing...' : '⚡ Analyze'}
                </button>
              )}
            </div>
          </Panel>
          <Panel position="top-left" style={{ pointerEvents: 'auto', marginTop: '40px' }}>
            <SearchPanel value={searchTerm} onChange={setSearchTerm} />
          </Panel>
        </ReactFlow>
      </div>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-surface-glass-regular backdrop-blur-regular rounded-xl border border-border/50 px-4 py-1.5 shadow-md">
        <span className="text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground">{nodeCount}</span> nodes · <span className="font-semibold text-foreground">{edgeCount}</span> edges
        </span>
        <span className="text-[11px] text-muted-foreground opacity-60">|</span>
        <button
          onClick={handleUndo}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors px-1"
          title="Undo (Ctrl+Z)"
        >
          Undo
        </button>
        <button
          onClick={handleRedo}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors px-1"
          title="Redo (Ctrl+Y)"
        >
          Redo
        </button>
        <span className="text-[11px] text-muted-foreground opacity-60">|</span>
        <button
          onClick={handleReset}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors px-1"
          title="Reset to default"
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default ArchitectureMap;
