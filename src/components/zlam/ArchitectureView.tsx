import React, { useEffect, useState } from 'react';
import ArchitectureMap from './ArchitectureMap';
import { useParams } from 'react-router-dom';
import { API_BASE_URL } from '@/lib/utils';

const ArchitectureView: React.FC<{ project?: any }> = ({ project }) => {
  const { id } = useParams<{ id: string }>();
  const [projectData, setProjectData] = useState<any>(project || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (project || !id) {return;}
    setLoading(true);
    const fetchProject = async () => {
      try {
        const { auth } = await import('@/lib/firebase');
        const token = await auth.currentUser?.getIdToken?.();
        if (!token) throw new Error('No auth token');
        const res = await fetch(`${API_BASE_URL}/api/projects/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Failed to fetch project: ${res.status}`);
        const data = await res.json();
        setProjectData(data);
      } catch (e) {
        console.error('Failed to load project for architecture:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [project, id]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Architecture Map</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading
              ? 'Loading project...'
              : projectData?.githubRepoOwner && projectData?.githubRepoName
                ? `Interactive living architecture diagram — ${projectData.githubRepoOwner}/${projectData.githubRepoName}`
                : 'Interactive living architecture diagram — Project'}
          </p>
        </div>
      </div>
      <div className="flex-1 relative">
        <ArchitectureMap project={projectData} />
      </div>
    </div>
  );
};

export default ArchitectureView;
