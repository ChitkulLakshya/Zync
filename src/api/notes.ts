// src/api/notes.ts
import { API_BASE_URL } from '../lib/utils';
const API_URL = `${API_BASE_URL}/api/notes`;

export interface Folder {
  _id: string;
  name: string;
  ownerId: string;
  parentId: string | null;
  type: 'personal' | 'team' | 'project';
  color: string;
  collaborators?: string[];
}

export interface Note {
  _id: string;
  title: string;
  content: any;
  ownerId: string;
  folderId: string | null;
  updatedAt: string;
  isPinned?: boolean;
}

export const fetchFolders = async (userId: string): Promise<Folder[]> => {
  const response = await fetch(`${API_URL}/folders?userId=${userId}`);
  if (!response.ok) throw new Error('Failed to fetch folders');
  return response.json();
};

export const createFolder = async (data: { name: string; ownerId: string; parentId?: string; type?: string }) => {
  const response = await fetch(`${API_URL}/folders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create folder');
  return response.json();
};

export const shareFolder = async (folderId: string, collaboratorIds: string[]) => {
  const response = await fetch(`${API_URL}/folders/${folderId}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ collaboratorIds }),
  });
  if (!response.ok) throw new Error('Failed to share folder');
  return response.json();
};

export const fetchNotes = async (userId: string, folderId?: string): Promise<Note[]> => {
  const url = folderId 
    ? `${API_URL}?userId=${userId}&folderId=${folderId}` 
    : `${API_URL}?userId=${userId}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch notes');
  return response.json();
};

export const createNote = async (data: { title: string; ownerId: string; folderId?: string; content?: any }) => {
  const response = await fetch(`${API_URL}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create note');
  return response.json();
};

export const updateNote = async (id: string, data: any) => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update note');
  return response.json();
};

export const deleteNote = async (id: string) => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete note');
  return response.json();
};
