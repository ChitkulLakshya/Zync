import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { API_BASE_URL } from '@/lib/utils';
import { auth } from '@/lib/firebase';

export interface GitHubStats {
  login: string;
  name: string;
  avatar_url: string;
  bio: string;
  public_repos: number;
  followers: number;
  following: number;
  html_url: string;
  created_at: string;
  connected?: boolean;
}

export interface GitHubEvent {
  id: string;
  type: string;
  repo: string;
  created_at: string;
  actor?: {
    login?: string;
    avatar_url?: string;
    html_url?: string;
  } | null;
  payload: {
    action?: string;
    ref?: string;
    commits?: { sha: string; message: string }[];
  };
}

export interface Contribution {
  date: string;
  count: number;
}

const fetchWithAuth = async (url: string) => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  const token = await user.getIdToken();
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.statusText}`);
  }

  return res.json();
};

export const useGitHubStats = (enabled: boolean) => {
  return useQuery<GitHubStats>({
    queryKey: ['github', 'stats'],
    queryFn: () => fetchWithAuth(`${API_BASE_URL}/api/github/stats`),
    enabled,
  });
};

export const useGitHubEvents = (enabled: boolean) => {
  return useQuery<GitHubEvent[]>({
    queryKey: ['github', 'events'],
    queryFn: () => fetchWithAuth(`${API_BASE_URL}/api/github/events`),
    enabled,
  });
};

export const useGitHubContributions = (year: number, enabled: boolean) => {
  return useQuery<Contribution[]>({
    queryKey: ['github', 'contributions', year],
    queryFn: () => fetchWithAuth(`${API_BASE_URL}/api/github/contributions?year=${year}`),
    enabled,
    placeholderData: keepPreviousData,
  });
};

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string;
  stargazers_count: number;
  forks_count: number;
  language: string;
  visibility: string;
  updated_at: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

export interface GitHubReposResponse {
  repos: Repository[];
  hasNextPage: boolean;
  page: number;
}

export const useGitHubRepos = (enabled: boolean, page: number = 1) => {
  return useQuery<GitHubReposResponse>({
    queryKey: ['github', 'repos', page],
    queryFn: async () => {
      const data = await fetchWithAuth(`${API_BASE_URL}/api/github/repos?page=${page}`);
      return {
        repos: data.repos || (Array.isArray(data) ? data : []),
        hasNextPage: data.hasNextPage || false,
        page: data.page || page,
      };
    },
    enabled,
  });
};
