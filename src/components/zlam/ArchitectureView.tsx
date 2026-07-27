import React from 'react';
import ArchitectureMap from './ArchitectureMap';

const ArchitectureView: React.FC<{ project?: any }> = ({ project }) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Architecture Map</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {project?.githubRepoOwner && project?.githubRepoName
              ? `Interactive living architecture diagram — ${project.githubRepoOwner}/${project.githubRepoName}`
              : 'Interactive living architecture diagram — Zync Platform'}
          </p>
        </div>
      </div>
      <div className="flex-1 relative">
        <ArchitectureMap project={project} />
      </div>
    </div>
  );
};

export default ArchitectureView;
