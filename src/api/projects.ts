import { API_BASE_URL } from '../lib/utils';
const API_URL = `${API_BASE_URL}/api/projects`;

export interface Project {
  _id: string;
  name: string;
  description: string;
  ownerId: string;
  steps: any[];
}

export interface TaskSearchResult {
    id: string;
    title: string;
    projectId: string;
    projectName: string;
    status: string;
    stepName: string;
}

export const fetchProjects = async (userId: string): Promise<Project[]> => {
    const response = await fetch(`${API_URL}?ownerId=${userId}`);
    if (!response.ok) return [];
    return response.json();
};

export const searchTasks = async (query: string, userId: string): Promise<TaskSearchResult[]> => {
    const response = await fetch(`${API_URL}/tasks/search?query=${encodeURIComponent(query)}&userId=${userId}`);
    if (!response.ok) return [];
    return response.json();
};

export const createQuickTask = async (projectId: string, title: string, description?: string) => {
    const response = await fetch(`${API_URL}/${projectId}/quick-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description })
    });
    if (!response.ok) throw new Error('Failed to create task');
    return response.json();
};
