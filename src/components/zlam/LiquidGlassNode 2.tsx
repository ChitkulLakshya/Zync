import React, { useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Clock, AlertTriangle, CheckCircle, Database, Server, Globe, Box, ChevronDown, ChevronUp } from 'lucide-react';
import TechIcon from './TechIcon';

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
  const [isExpanded, setIsExpanded] = useState(false);
  const StatusIcon = nodeData.status ? statusIcon[nodeData.status] : undefined;
  const TypeIcon = typeIcon[nodeData.type] || Server;

  const techStackArray = nodeData.techStack 
    ? nodeData.techStack.split(',').map(t => t.trim()).filter(Boolean)
    : [];
  
  const displayTechStack = isExpanded ? techStackArray : techStackArray.slice(0, 3);
  const hasMoreTech = techStackArray.length > 3;

  return (
    <div
      className={`
        bg-surface-glass-regular backdrop-blur-regular rounded-2xl border border-border/20 p-3 min-w-[160px] max-w-[240px]
        transition-all duration-200 hover:shadow-lg hover:border-border/40
        ${selected ? 'ring-2 ring-primary shadow-lg' : ''}
      `}
      style={{ boxShadow: 'var(--shadow-md), var(--glass-bevel)' }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <TypeIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <span className="font-semibold text-xs truncate flex-1">{nodeData.label}</span>
        {StatusIcon && (
          <StatusIcon className={`w-3 h-3 flex-shrink-0 ${nodeData.status === 'healthy' ? 'text-green-500' : nodeData.status === 'degraded' ? 'text-yellow-500' : 'text-red-500'}`} />
        )}
      </div>
      
      {nodeData.sublabel && (
        <p className="text-[10px] text-muted-foreground truncate mb-1.5" title={nodeData.sublabel}>
          {nodeData.sublabel}
        </p>
      )}
      
      {displayTechStack.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {displayTechStack.map((tech) => (
            <TechIcon key={tech} tech={tech} className="w-5 h-5 !p-0.5" />
          ))}
          {hasMoreTech && !isExpanded && (
            <span className="text-[9px] text-muted-foreground self-center">+{techStackArray.length - 3}</span>
          )}
        </div>
      )}
      
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/10">
        <div className="flex items-center gap-1.5">
          {nodeData.tasks !== null && nodeData.tasks !== undefined && (
            <span className="text-[9px] bg-secondary/50 px-1.5 py-0.5 rounded-full text-muted-foreground">
              {nodeData.tasks} tasks
            </span>
          )}
          {nodeData.teamMembers && nodeData.teamMembers.length > 0 && (
            <div className="flex -space-x-1">
              {nodeData.teamMembers.slice(0, 2).map((member: string) => (
                <div
                  key={member}
                  className="w-3 h-3 rounded-full bg-primary/20 border border-background text-[6px] flex items-center justify-center font-bold"
                  title={member}
                >
                  {member[0].toUpperCase()}
                </div>
              ))}
              {nodeData.teamMembers.length > 2 && (
                <div className="w-3 h-3 rounded-full bg-secondary/50 border border-background text-[6px] flex items-center justify-center">
                  +{nodeData.teamMembers.length - 2}
                </div>
              )}
            </div>
          )}
        </div>
        
        {(hasMoreTech || (nodeData.sublabel && nodeData.sublabel.length > 50)) && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>
      
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-muted-foreground !border-border" />
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-muted-foreground !border-border" />
    </div>
  );
};

export default LiquidGlassNode;