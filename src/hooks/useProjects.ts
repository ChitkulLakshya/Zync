import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "@/lib/utils";
import { auth } from "@/lib/firebase";
import { fetchProjects, type Project } from "@/api/projects";

export const useProjects = () => {
    const user = auth.currentUser;
    return useQuery<Project[]>({
        queryKey: ['projects', user?.uid],
        queryFn: fetchProjects,
        enabled: !!user,
        refetchOnMount: 'always',
    });
};

export const useProjectMutations = () => {
    const queryClient = useQueryClient();

    const createProjectMutation = useMutation({
        mutationFn: async (data: any) => {
            const user = auth.currentUser;
            const token = await user?.getIdToken();
            const response = await fetch(`${API_BASE_URL}/api/projects`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errBody = await response.json().catch(() => ({}));
                throw new Error(errBody?.message || 'Failed to create project');
            }

            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
        },
    });

    const linkGitHubMutation = useMutation({
        mutationFn: async ({ projectId, repoData }: { projectId: string; repoData: any }) => {
            const user = auth.currentUser;
            const token = await user?.getIdToken();
            const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/link-github`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(repoData),
            });

            if (!response.ok) {
                const errBody = await response.json().catch(() => ({}));
                throw new Error(errBody?.message || 'Failed to link GitHub repository');
            }

            return response.json();
        },
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['projects'] });
        }
    });

    const deleteProjectMutation = useMutation({
        mutationFn: async (projectId: string) => {
            const user = auth.currentUser;
            const token = await user?.getIdToken();
            const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errBody = await response.json().catch(() => ({}));
                throw new Error(errBody?.message || 'Failed to delete project');
            }

            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
        },
    });

    return {
        createProject: createProjectMutation.mutateAsync,
        linkGitHub: linkGitHubMutation.mutateAsync,
        deleteProject: deleteProjectMutation.mutateAsync,
        isCreating: createProjectMutation.isPending,
        isLinking: linkGitHubMutation.isPending,
        isDeleting: deleteProjectMutation.isPending,
    };
};
