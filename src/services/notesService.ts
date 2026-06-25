import { getAuthHeaders } from '@/lib/auth-headers';
import { API_BASE_URL } from '@/lib/utils';

export interface Folder {
  id: string;
  _id?: string;
  name: string;
  ownerId: string;
  parentId: string | null;
  type: 'personal' | 'team' | 'project';
  color: string;
  collaborators?: string[];
}

export interface Note {
  id: string;
  _id?: string;
  title: string;
  content: any;
  ownerId: string;
  folderId: string | null;
  createdAt?: any;
  updatedAt: any;
  isPinned?: boolean;
  permissions?: Record<string, 'viewer' | 'editor' | 'owner'>;
}



/**
 * Replaces Firestore onSnapshot subscription with a one-shot fetch + polling.
 * Returns an unsubscribe function to cancel the interval.
 */
export const subscribeToFolders = (userId: string, callback: (folders: Folder[]) => void) => {
  let cancelled = false;

  const fetchFolders = async () => {
    try {
      const h = await getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/api/notes/folders`, { headers: h });
      if (res.ok && !cancelled) {
        const data = await res.json();
        const mapped = data.map((f: any) => ({ ...f, id: f.id || f._id, _id: f.id || f._id }));
        callback(mapped);
      }
    } catch (err) {
      console.error('[notesService] fetchFolders error:', err);
    }
  };

  fetchFolders();
  const interval = setInterval(fetchFolders, 10000);

  return () => {
    cancelled = true;
    clearInterval(interval);
  };
};

export const subscribeToNotes = (
  userId: string,
  sharedFolderIds: string[],
  callback: (notes: Note[]) => void
) => {
  let cancelled = false;

  const fetchNotes = async () => {
    try {
      const h = await getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/api/notes`, { headers: h });
      if (res.ok && !cancelled) {
        const data = await res.json();
        const mapped = data.map((n: any) => ({ ...n, id: n.id || n._id, _id: n.id || n._id }));
        callback(mapped);
      }
    } catch (err) {
      console.error('[notesService] fetchNotes error:', err);
    }
  };

  fetchNotes();
  const interval = setInterval(fetchNotes, 10000);

  return () => {
    cancelled = true;
    clearInterval(interval);
  };
};

export const createFolder = async (data: Partial<Omit<Folder, 'id' | '_id'>>) => {
  const h = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/notes/folders`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({
      parentId: null,
      type: 'personal',
      color: '#3b82f6',
      ...data,
    }),
  });
  if (!res.ok) {
    throw new Error('Failed to create folder');
  }
  return res.json();
};

export const createNote = async (
  data: Partial<Omit<Note, 'id' | '_id' | 'createdAt' | 'updatedAt'>>
) => {
  const h = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/notes`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({
      folderId: null,
      content: [],
      ...data,
    }),
  });
  if (!res.ok) {
    throw new Error('Failed to create note');
  }
  return res.json();
};

export const updateNote = async (id: string, data: Partial<Note>) => {
  const h = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/notes/${id}`, {
    method: 'PUT',
    headers: h,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error('Failed to update note');
  }
  return res.json();
};

export const deleteNote = async (id: string) => {
  const h = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/notes/${id}`, {
    method: 'DELETE',
    headers: h,
  });
  if (!res.ok) {
    throw new Error('Failed to delete note');
  }
  return res.json();
};

export const updateFolder = async (id: string, data: Partial<Folder>) => {
  const h = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/notes/folders/${id}`, {
    method: 'PUT',
    headers: h,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error('Failed to update folder');
  }
  return res.json();
};

export const deleteFolder = async (id: string) => {
  const h = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/notes/folders/${id}`, {
    method: 'DELETE',
    headers: h,
  });
  if (!res.ok) {
    throw new Error('Failed to delete folder');
  }
  return res.json();
};

export const shareFolder = async (folderId: string, collaboratorIds: string[]) => {
  const h = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/notes/folders/${folderId}/share`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({ collaboratorIds }),
  });
  if (!res.ok) {
    throw new Error('Failed to share folder');
  }
  return res.json();
};

export const unshareFolder = async (folderId: string, userId: string) => {
  const h = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/notes/folders/${folderId}/unshare`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) {
    throw new Error('Failed to unshare folder');
  }
  return res.json();
};

export const getNote = async (id: string): Promise<Note | null> => {
  try {
    const h = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/notes/${id}`, { headers: h });
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    return { ...data, id: data.id || data._id, _id: data.id || data._id };
  } catch {
    return null;
  }
};

export const duplicateNote = async (
  originalNoteId: string,
  targetFolderId: string | null,
  userId: string
) => {
  const originalNote = await getNote(originalNoteId);
  if (!originalNote) {
    throw new Error('Note not found');
  }

  return await createNote({
    title: `${originalNote.title} (Copy)`,
    content: originalNote.content,
    ownerId: userId,
    folderId: targetFolderId,
    isPinned: false,
  });
};

export const updateNotePermissions = async (
  noteId: string,
  permissions: Record<string, string>
) => {
  const h = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
    method: 'PUT',
    headers: h,
    body: JSON.stringify({ permissions }),
  });
  if (!res.ok) {
    throw new Error('Failed to update permissions');
  }
  return res.json();
};
