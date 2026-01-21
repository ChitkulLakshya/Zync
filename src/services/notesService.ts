
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
    orderBy
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
        where('ownerId', '==', userId)
        // Add sorting if needed, e.g., orderBy('name')
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

export const subscribeToNotes = (userId: string, callback: (notes: Note[]) => void) => {
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
