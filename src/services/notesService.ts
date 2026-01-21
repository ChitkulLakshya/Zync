
import { db } from '../lib/firebase';
import {
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    orderBy,
    or
} from 'firebase/firestore';

export interface Folder {
    id: string;
    _id?: string; // For backward compatibility
    name: string;
    ownerId: string;
    parentId: string | null;
    type: 'personal' | 'team' | 'project';
    color: string;
    collaborators?: string[];
}

export interface Note {
    id: string;
    _id?: string; // For backward compatibility
    title: string;
    content: any;
    ownerId: string;
    folderId: string | null;
    createdAt?: any;
    updatedAt: any;
    isPinned?: boolean;
}

// Collections
const FOLDERS_COLLECTION = 'folders';
const NOTES_COLLECTION = 'notes';

// Real-time Subscriptions

export const subscribeToFolders = (userId: string, callback: (folders: Folder[]) => void) => {
    const q = query(
        collection(db, FOLDERS_COLLECTION),
        or(
            where('ownerId', '==', userId),
            where('collaborators', 'array-contains', userId)
        )
    );

    return onSnapshot(q, (snapshot) => {
        const folders = snapshot.docs.map(doc => ({
            id: doc.id,
            _id: doc.id,
            ...doc.data()
        })) as Folder[];
        callback(folders);
    });
};

export const subscribeToNotes = (userId: string, sharedFolderIds: string[], callback: (notes: Note[]) => void) => {
    const constraints: any[] = [
        where('ownerId', '==', userId)
    ];

    if (sharedFolderIds.length > 0) {
        // Firestore OR queries for "owned by me" OR "in shared folders"
        // Note: This requires an index, and "in" supports max 10/30 items.
        // For simplicity/robustness, we might need two listeners if the complexity is high,
        // but 'or' query with 'in' should work for small numbers.
        // Let's rely on multiple where-clauses combined with 'or'.
        // Actually, we can just do: OR(owner == me, folderId IN sharedFolderIds)

        // However, 'in' limited to 10. If lots of shared folders, this breaks.
        // SAFE APPROACH: Just query "owner == me" (existing) AND "folderId in sharedFolderIds" (new Listener? or OR?)

        // Let's try the OR query.
        const q = query(
            collection(db, NOTES_COLLECTION),
            or(
                where('ownerId', '==', userId),
                where('folderId', 'in', sharedFolderIds)
            ),
            orderBy('updatedAt', 'desc')
        );

        return onSnapshot(q, (snapshot) => {
            const notes = snapshot.docs.map(doc => ({
                id: doc.id,
                _id: doc.id,
                ...doc.data()
            })) as Note[];
            callback(notes);
        });

    } else {
        const q = query(
            collection(db, NOTES_COLLECTION),
            where('ownerId', '==', userId),
            orderBy('updatedAt', 'desc')
        );

        return onSnapshot(q, (snapshot) => {
            const notes = snapshot.docs.map(doc => ({
                id: doc.id,
                _id: doc.id,
                ...doc.data()
            })) as Note[];
            callback(notes);
        });
    }
};

// CRUD Operations

export const createFolder = async (data: Partial<Omit<Folder, 'id' | '_id'>>) => {
    return await addDoc(collection(db, FOLDERS_COLLECTION), {
        parentId: null,
        type: 'personal',
        color: '#3b82f6',
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
};

export const createNote = async (data: Partial<Omit<Note, 'id' | '_id' | 'createdAt' | 'updatedAt'>>) => {
    const safeData = {
        folderId: null,
        content: [],
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };
    // Firestore doesn't accept undefined
    if (safeData.folderId === undefined) safeData.folderId = null;

    return await addDoc(collection(db, NOTES_COLLECTION), safeData);
};

export const updateNote = async (id: string, data: Partial<Note>) => {
    const noteRef = doc(db, NOTES_COLLECTION, id);
    return await updateDoc(noteRef, {
        ...data,
        updatedAt: serverTimestamp()
    });
};

export const deleteNote = async (id: string) => {
    const noteRef = doc(db, NOTES_COLLECTION, id);
    return await deleteDoc(noteRef);
};

export const updateFolder = async (id: string, data: Partial<Folder>) => {
    const folderRef = doc(db, FOLDERS_COLLECTION, id);
    return await updateDoc(folderRef, data);
};

export const deleteFolder = async (id: string) => {
    const folderRef = doc(db, FOLDERS_COLLECTION, id);
    return await deleteDoc(folderRef);
};

export const shareFolder = async (folderId: string, collaboratorIds: string[]) => {
    const { arrayUnion } = await import('firebase/firestore');
    const folderRef = doc(db, FOLDERS_COLLECTION, folderId);
    return await updateDoc(folderRef, {
        collaborators: arrayUnion(...collaboratorIds)
    });
};

export const unshareFolder = async (folderId: string, userId: string) => {
    const { arrayRemove } = await import('firebase/firestore');
    const folderRef = doc(db, FOLDERS_COLLECTION, folderId);
    return await updateDoc(folderRef, {
        collaborators: arrayRemove(userId)
    });
};

export const getNote = async (id: string): Promise<Note | null> => {
    const { getDoc } = await import('firebase/firestore');
    const noteRef = doc(db, NOTES_COLLECTION, id);
    const snap = await getDoc(noteRef);
    if (snap.exists()) {
        return { id: snap.id, _id: snap.id, ...snap.data() } as Note;
    }
    return null;
};

export const duplicateNote = async (originalNoteId: string, targetFolderId: string | null, userId: string) => {
    const originalNote = await getNote(originalNoteId);
    if (!originalNote) throw new Error("Note not found");

    return await createNote({
        title: `${originalNote.title} (Copy)`,
        content: originalNote.content,
        ownerId: userId,
        folderId: targetFolderId,
        isPinned: false
    });
};
