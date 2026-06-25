import { API_BASE_URL } from '../lib/utils';
import { getAuthHeaders } from '../lib/auth-headers';
const API_URL = `${API_BASE_URL}/api/projects`;

export interface Project {
    _id: string;
    name: string;
    description: string;
    ownerId: string;
    owner?: {
        uid: string;
        displayName: string;
        photoURL?: string | null;
    } | null;
    steps: any[];
    createdAt: string;
    githubRepoName?: string;
    githubRepoOwner?: string;
}

export interface TaskSearchResult {
    id: string;
    title: string;
    projectId: string;
    projectName: string;
    status: string;
    stepName: string;
}

export const fetchProjects = async (): Promise<Project[]> => {
    const headers = await getAuthHeaders();
    const response = await fetch(API_URL, { headers });
    if (!response.ok) {return [];}
    return response.json();
};

export const searchTasks = async (query: string, userId: string): Promise<TaskSearchResult[]> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/tasks/search?query=${encodeURIComponent(query)}&userId=${userId}`, { headers });
    if (!response.ok) {return [];}
    return response.json();
};

export const createQuickTask = async (projectId: string, title: string, description?: string) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/${projectId}/quick-task`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ title, description })
    });
    if (!response.ok) {throw new Error('Failed to create task');}
    return response.json();
};
