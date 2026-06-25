import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchNotes, createNote, updateNote, deleteNote, Note } from "@/api/notes";
import { auth } from "@/lib/firebase";

export const useNotes = (folderId?: string) => {
    const user = auth.currentUser;
    return useQuery<Note[]>({
        queryKey: folderId ? ['notes', folderId] : ['notes', 'all'],
        queryFn: () => fetchNotes(user?.uid || "", folderId),
        enabled: !!user,
        refetchOnMount: false,
    });
};

export const usePinnedNotes = () => {
    const user = auth.currentUser;
    return useQuery<Note[]>({
        queryKey: ['notes', 'pinned'],
        queryFn: async () => {
            const allNotes = await fetchNotes(user?.uid || "");
            return allNotes.filter(note => note.isPinned);
        },
        enabled: !!user,
        refetchOnMount: false,
    });
};

export const useNoteMutations = () => {
    const queryClient = useQueryClient();

    const createNoteMutation = useMutation({
        mutationFn: createNote,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notes'] });
        },
    });

    const updateNoteMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => updateNote(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notes'] });
        },
    });

    const deleteNoteMutation = useMutation({
        mutationFn: deleteNote,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notes'] });
        },
    });

    return {
        createNote: createNoteMutation.mutate,
        updateNote: updateNoteMutation.mutate,
        deleteNote: deleteNoteMutation.mutate,
        isPending: createNoteMutation.isPending || updateNoteMutation.isPending || deleteNoteMutation.isPending,
    };
};
