import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Clock, AlertTriangle, CheckCircle, Database, Server, Globe, Box } from 'lucide-react';

interface LiquidGlassNodeData {
  label: string;
  sublabel?: string;
  status?: 'healthy' | 'degraded' | 'down';
  techStack?: string;
  icon?: string;
  tasks?: number;
  teamMembers?: string[];
  type: 'service' | 'database' | 'frontend' | 'external';
}

const statusIcon = {
  healthy: CheckCircle,
  degraded: AlertTriangle,
  down: Clock,
};

const typeIcon = {
  service: Server,
  database: Database,
  frontend: Globe,
  external: Box,
};

const LiquidGlassNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as unknown as LiquidGlassNodeData;
  const StatusIcon = nodeData.status ? statusIcon[nodeData.status] : undefined;
  const TypeIcon = typeIcon[nodeData.type] || Server;

  return (
    <div
      className={`
        bg-surface-glass-regular backdrop-blur-regular rounded-3xl border-0 p-4 min-w-[200px]
        transition-all duration-200 hover:shadow-lg
        ${selected ? 'ring-2 ring-primary shadow-lg' : ''}
      `}
      style={{ boxShadow: 'var(--shadow-md), var(--glass-bevel)' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{nodeData.icon || ''}</span>
        <TypeIcon className="w-4 h-4 text-muted-foreground" />
        <span className="font-semibold text-sm truncate">{nodeData.label}</span>
        {StatusIcon && (
          <StatusIcon className={`w-3 h-3 ml-auto ${nodeData.status === 'healthy' ? 'text-green-500' : nodeData.status === 'degraded' ? 'text-yellow-500' : 'text-red-500'}`} />
        )}
      </div>
      {nodeData.sublabel && (
        <p className="text-xs text-muted-foreground truncate">{nodeData.sublabel}</p>
      )}
      {nodeData.techStack && (
        <p className="text-[10px] text-muted-foreground/70 mt-1 truncate">{nodeData.techStack}</p>
      )}
      <div className="flex items-center gap-2 mt-2">
        {nodeData.tasks != null && (
          <span className="text-[10px] bg-secondary/50 px-1.5 py-0.5 rounded-full text-muted-foreground">
            {nodeData.tasks} tasks
          </span>
        )}
        {nodeData.teamMembers && nodeData.teamMembers.length > 0 && (
          <div className="flex -space-x-1">
            {nodeData.teamMembers.slice(0, 3).map((member: string) => (
              <div
                key={member}
                className="w-4 h-4 rounded-full bg-primary/20 border border-background text-[6px] flex items-center justify-center font-bold"
              >
                {member[0].toUpperCase()}
              </div>
            ))}
            {nodeData.teamMembers.length > 3 && (
              <div className="w-4 h-4 rounded-full bg-secondary/50 border border-background text-[6px] flex items-center justify-center">
                +{nodeData.teamMembers.length - 3}
              </div>
            )}
          </div>
        )}
      </div>
      <Handle type="target" position={Position.Top} className="!w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2" />
    </div>
  );
};

export default LiquidGlassNode;